import path from "path";
import ts from "typescript";
import { transformExtraFile } from "./transform";

export type ExtraFileTransformerContext = {
  filePath: string;
  current: boolean;
};

export type ProgramOptions = {
  project: string;
  filePath: string;
  extraFileExtensions: string[];
};

export class TSServiceManager {
  private readonly tsServices = new Map<string, TSService[]>();

  public getProgram(code: string, options: ProgramOptions): ts.Program {
    const tsconfigPath = options.project;
    const extraFileExtensions = [...new Set(options.extraFileExtensions)];

    let serviceList = this.tsServices.get(tsconfigPath);
    if (!serviceList) {
      serviceList = [];
      this.tsServices.set(tsconfigPath, serviceList);
    }

    let service = serviceList.find((service) =>
      extraFileExtensions.every((ext) =>
        service.extraFileExtensions.includes(ext)
      )
    );
    if (!service) {
      service = new TSService(tsconfigPath, extraFileExtensions);
      serviceList.unshift(service);
    }

    return service.getProgram(code, options.filePath);
  }
}

export class TSService {
  private readonly watch: ts.WatchOfConfigFile<ts.BuilderProgram>;

  private readonly patchedHostSet = new WeakSet<ts.CompilerHost>();

  private readonly tsconfigPath: string;

  public readonly extraFileExtensions: string[];

  private currTarget: {
    code: string;
    filePath: string;
    sourceFile?: ts.SourceFile;
    dirMap: Map<string, { name: string; path: string }>;
  } = {
    code: "",
    filePath: "",
    dirMap: new Map<string, { name: string; path: string }>(),
  };

  private readonly fileWatchCallbacks = new Map<
    string,
    {
      update: () => void;
    }
  >();

  public constructor(tsconfigPath: string, extraFileExtensions: string[]) {
    this.tsconfigPath = tsconfigPath;
    this.extraFileExtensions = extraFileExtensions;
    this.watch = this.createWatch(tsconfigPath, extraFileExtensions);
  }

  public getProgram(code: string, filePath: string): ts.Program {
    const normalized = normalizeFileName(filePath);
    const lastTarget = this.currTarget;

    const dirMap = new Map<string, { name: string; path: string }>();
    let childPath = normalized;
    for (const dirName of iterateDirs(normalized)) {
      dirMap.set(dirName, { path: childPath, name: path.basename(childPath) });
      childPath = dirName;
    }
    this.currTarget = {
      code,
      filePath: normalized,
      dirMap,
    };
    for (const { filePath: targetPath } of [this.currTarget, lastTarget]) {
      if (!targetPath) continue;
      if (!ts.sys.fileExists(targetPath)) {
        // Signal a directory change to request a re-scan of the directory
        // because it targets a file that does not actually exist.
        this.fileWatchCallbacks
          .get(normalizeFileName(this.tsconfigPath))
          ?.update();
      }
      this.fileWatchCallbacks.get(normalizeFileName(targetPath))?.update();
    }

    const program = this.watch.getProgram().getProgram();
    // sets parent pointers in source files
    program.getTypeChecker();

    return program;
  }

  private createWatch(
    tsconfigPath: string,
    extraFileExtensions: string[]
  ): ts.WatchOfConfigFile<ts.BuilderProgram> {
    type CreateProgram = ts.CreateProgram<ts.BuilderProgram>;

    const createAbstractBuilder = (
      ...args: Parameters<CreateProgram>
    ): ReturnType<CreateProgram> => {
      const [
        rootNames,
        options,
        argHost,
        oldProgram,
        configFileParsingDiagnostics,
        projectReferences,
      ] = args;

      const host: ts.CompilerHost = argHost!;
      if (!this.patchedHostSet.has(host)) {
        this.patchedHostSet.add(host);

        const getTargetSourceFile = (
          fileName: string,
          languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions
        ) => {
          if (
            this.currTarget.filePath === normalizeFileName(fileName) &&
            isExtra(fileName, extraFileExtensions)
          ) {
            // Parse the target file as TSX.
            return (this.currTarget.sourceFile ??= ts.createSourceFile(
              this.currTarget.filePath,
              this.currTarget.code,
              languageVersionOrOptions,
              true,
              ts.ScriptKind.TSX
            ));
          }
          return null;
        };

        /* eslint-disable @typescript-eslint/unbound-method -- ignore */
        const original = {
          getSourceFile: host.getSourceFile,
          getSourceFileByPath: host.getSourceFileByPath!,
        };
        /* eslint-enable @typescript-eslint/unbound-method -- ignore */
        host.getSourceFile = (fileName, languageVersionOrOptions, ...args) => {
          // Always call the original function, because it calls the file watcher.
          const originalSourceFile = original.getSourceFile.call(
            host,
            fileName,
            languageVersionOrOptions,
            ...args
          );
          return (
            getTargetSourceFile(fileName, languageVersionOrOptions) ??
            originalSourceFile
          );
        };
        host.getSourceFileByPath = (
          fileName,
          path,
          languageVersionOrOptions,
          ...args
        ) => {
          // Always call the original function, because it calls the file watcher.
          const originalSourceFile = original.getSourceFileByPath.call(
            host,
            fileName,
            path,
            languageVersionOrOptions,
            ...args
          );
          return (
            getTargetSourceFile(fileName, languageVersionOrOptions) ??
            originalSourceFile
          );
        };
      }
      return ts.createAbstractBuilder(
        rootNames,
        options,
        host,
        oldProgram,
        configFileParsingDiagnostics,
        projectReferences
      );
    };

    const watchCompilerHost = ts.createWatchCompilerHost(
      tsconfigPath,
      {
        noEmit: true,
        jsx: ts.JsxEmit.Preserve,

        // This option is required if `includes` only includes `*.vue` files.
        // However, the option is not in the documentation.
        // https://github.com/microsoft/TypeScript/issues/28447
        allowNonTsExtensions: true,
      },
      ts.sys,
      createAbstractBuilder,
      (diagnostic) => {
        throw new Error(formatDiagnostics([diagnostic]));
      },
      () => {
        // Not reported in reportWatchStatus.
      },
      undefined,
      extraFileExtensions.map((extension) => ({
        extension,
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      }))
    );
    const original = {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Store original
      readFile: watchCompilerHost.readFile,
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Store original
      fileExists: watchCompilerHost.fileExists,
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Store original
      readDirectory: watchCompilerHost.readDirectory,
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Store original
      directoryExists: watchCompilerHost.directoryExists!,
      // eslint-disable-next-line @typescript-eslint/unbound-method -- Store original
      getDirectories: watchCompilerHost.getDirectories!,
    };
    watchCompilerHost.getDirectories = (dirName, ...args) => {
      const result = distinctArray(
        ...original.getDirectories.call(watchCompilerHost, dirName, ...args),
        // Include the path to the target file if the target file does not actually exist.
        this.currTarget.dirMap.get(normalizeFileName(dirName))?.name
      );
      return result;
    };
    watchCompilerHost.directoryExists = (dirName, ...args) => {
      return (
        original.directoryExists.call(watchCompilerHost, dirName, ...args) ||
        // Include the path to the target file if the target file does not actually exist.
        this.currTarget.dirMap.has(normalizeFileName(dirName))
      );
    };
    watchCompilerHost.readDirectory = (dirName, ...args) => {
      let results = original.readDirectory.call(
        watchCompilerHost,
        dirName,
        ...args
      );

      // Include the target file if the target file does not actually exist.
      const file = this.currTarget.dirMap.get(normalizeFileName(dirName));
      if (file) {
        if (file.path === this.currTarget.filePath) {
          results.push(file.path);
        } else {
          results = results.filter((f) => file.path !== f && file.name !== f);
        }
      }

      return distinctArray(...results);
    };
    watchCompilerHost.readFile = (fileName, ...args) => {
      const realFileName = getRealFileNameIfExist(fileName);
      if (realFileName == null) {
        return undefined;
      }
      if (this.currTarget.filePath === realFileName) {
        // It is the file currently being parsed.
        return transformExtraFile(this.currTarget.code, {
          filePath: realFileName,
          current: true,
        });
      }

      const code = original.readFile.call(
        watchCompilerHost,
        realFileName,
        ...args
      );
      if (!code) {
        return code;
      }
      return transformExtraFile(code, {
        filePath: realFileName,
        current: false,
      });
    };
    // Modify it so that it can be determined that the virtual file actually exists.
    watchCompilerHost.fileExists = (fileName) => {
      return getRealFileNameIfExist(fileName) != null;
    };

    const getRealFileNameIfExist = (fileName: string): string | null => {
      const normalizedFileName = normalizeFileName(fileName);
      // Even if it is actually a file, if it is specified as a directory to the target file,
      // it is assumed that it does not exist as a file.
      if (this.currTarget.dirMap.has(normalizedFileName)) {
        return null;
      }
      if (this.currTarget.filePath === normalizedFileName) {
        // It is the file currently being parsed.
        return normalizedFileName;
      }
      const exists = original.fileExists.call(
        watchCompilerHost,
        normalizedFileName
      );
      if (exists) {
        return normalizedFileName;
      }
      if (isVirtualTSX(normalizedFileName, extraFileExtensions)) {
        const real = normalizedFileName.slice(0, -4);
        for (const dts of toExtraDtsFileNames(real, extraFileExtensions)) {
          if (original.fileExists.call(watchCompilerHost, dts)) {
            // If the d.ts file exists, respect it and consider the virtual file not to exist.
            return null;
          }
        }
        if (original.fileExists.call(watchCompilerHost, real)) {
          return real;
        }
      }
      return null;
    };

    // It keeps a callback to mark the parsed file as changed so that it can be re-parsed.
    watchCompilerHost.watchFile = (fileName, callback) => {
      const normalized = normalizeFileName(fileName);
      this.fileWatchCallbacks.set(normalized, {
        update: () => callback(fileName, ts.FileWatcherEventKind.Changed),
      });

      return {
        close: () => {
          this.fileWatchCallbacks.delete(normalized);
        },
      };
    };
    // Use watchCompilerHost but don't actually watch the files and directories.
    watchCompilerHost.watchDirectory = () => {
      return {
        close: () => {
          // noop
        },
      };
    };

    /**
     * It heavily references typescript-eslint.
     * @see https://github.com/typescript-eslint/typescript-eslint/blob/84e316be33dac5302bd0367c4d1960bef40c484d/packages/typescript-estree/src/create-program/createWatchProgram.ts#L297-L309
     */
    watchCompilerHost.afterProgramCreate = (program) => {
      const originalDiagnostics = program.getConfigFileParsingDiagnostics();
      const configFileDiagnostics = originalDiagnostics.filter(
        (diag) =>
          diag.category === ts.DiagnosticCategory.Error && diag.code !== 18003
      );
      if (configFileDiagnostics.length > 0) {
        throw new Error(formatDiagnostics(configFileDiagnostics));
      }
    };

    const watch = ts.createWatchProgram(watchCompilerHost);
    return watch;
  }
}

/** If the given filename has extra extensions, returns the d.ts filename. */
function toExtraDtsFileNames(fileName: string, extraFileExtensions: string[]) {
  const ext = getExtIfExtra(fileName, extraFileExtensions);
  if (ext != null) {
    return [`${fileName}.d.ts`, `${fileName.slice(0, -ext.length)}.d${ext}.ts`];
  }
  return [];
}

/** Checks the given filename has extra extension or not. */
function isExtra(fileName: string, extraFileExtensions: string[]): boolean {
  return getExtIfExtra(fileName, extraFileExtensions) != null;
}

/** Gets the file extension if the given file is an extra extension file. */
function getExtIfExtra(
  fileName: string,
  extraFileExtensions: string[]
): string | null {
  for (const extraFileExtension of extraFileExtensions) {
    if (fileName.endsWith(extraFileExtension)) {
      return extraFileExtension;
    }
  }
  return null;
}

/** Checks the given filename is virtual file tsx or not. */
function isVirtualTSX(
  fileName: string,
  extraFileExtensions: string[]
): boolean {
  for (const extraFileExtension of extraFileExtensions) {
    if (fileName.endsWith(`${extraFileExtension}.tsx`)) {
      return true;
    }
  }
  return false;
}

function formatDiagnostics(diagnostics: ts.Diagnostic[]) {
  return ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  });
}

function normalizeFileName(fileName: string) {
  let normalized = path.normalize(fileName);
  if (normalized.endsWith(path.sep)) {
    normalized = normalized.slice(0, -1);
  }
  if (ts.sys.useCaseSensitiveFileNames) {
    return toAbsolutePath(normalized, null);
  }
  return toAbsolutePath(normalized.toLowerCase(), null);
}

function toAbsolutePath(filePath: string, baseDir: string | null) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(baseDir || process.cwd(), filePath);
}

function* iterateDirs(filePath: string) {
  let target = filePath;
  let parent: string;
  while ((parent = path.dirname(target)) !== target) {
    yield parent;
    target = parent;
  }
}

function distinctArray(...list: (string | null | undefined)[]) {
  return [
    ...new Set(
      ts.sys.useCaseSensitiveFileNames
        ? list
        : list.map((s) => s?.toLowerCase())
    ),
  ].filter((s): s is string => s != null);
}
