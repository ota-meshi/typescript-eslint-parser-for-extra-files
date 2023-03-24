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
      setupTarget: () => void;
      resetTarget: () => void;
      update: () => void;
    }
  >();

  public constructor(tsconfigPath: string, extraFileExtensions: string[]) {
    this.tsconfigPath = tsconfigPath;
    this.extraFileExtensions = extraFileExtensions;
    this.watch = this.createWatch(tsconfigPath, extraFileExtensions);
  }

  public getProgram(code: string, filePath: string): ts.Program {
    const normalized = normalizeFileName(
      toRealFileName(filePath, this.extraFileExtensions)
    );
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
    }
    getRefreshTargetFileNames(
      lastTarget.filePath,
      this.extraFileExtensions
    ).forEach((vFilePath) => {
      this.fileWatchCallbacks.get(vFilePath)?.resetTarget();
    });
    getRefreshTargetFileNames(
      this.currTarget.filePath,
      this.extraFileExtensions
    ).forEach((vFilePath) => {
      this.fileWatchCallbacks.get(vFilePath)?.setupTarget();
    });

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
      const realFileName = toRealFileName(fileName, extraFileExtensions);
      const normalized = normalizeFileName(realFileName);
      if (this.currTarget.filePath === normalized) {
        // It is the file currently being parsed.
        return transformExtraFile(this.currTarget.code, {
          filePath: normalized,
          current: true,
        });
      }
      if (isExtraDts(fileName, extraFileExtensions)) {
        const real = normalizeFileName(
          extraDtsToExtra(fileName, extraFileExtensions)
        );
        if (this.currTarget.filePath === real) {
          // If try to read the .d.ts of the target file,
          // respect the target file and consider the .d.ts doesn't exist.
          return undefined;
        }
      }
      if (isVirtualTSX(fileName, extraFileExtensions)) {
        const dts = toExtraDtsFileName(normalized, extraFileExtensions);
        if (original.fileExists.call(watchCompilerHost, dts)) {
          // If the .d.ts file exists, respect it and consider the virtual file not to exist.
          return undefined;
        }
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
        filePath: normalized,
        current: false,
      });
    };
    // Modify it so that it can be determined that the virtual file actually exists.
    watchCompilerHost.fileExists = (fileName, ...args) => {
      const normalizedFileName = normalizeFileName(fileName);

      // Even if it is actually a file, if it is specified as a directory to the target file,
      // it is assumed that it does not exist as a file.
      if (this.currTarget.dirMap.has(normalizedFileName)) {
        return false;
      }
      const normalizedRealFileName = toRealFileName(
        normalizedFileName,
        extraFileExtensions
      );
      if (this.currTarget.filePath === normalizedRealFileName) {
        // It is the file currently being parsed.
        return true;
      }
      if (
        original.fileExists.call(
          watchCompilerHost,
          normalizedRealFileName,
          ...args
        )
      ) {
        if (isVirtualTSX(fileName, extraFileExtensions)) {
          if (
            original.fileExists.call(
              watchCompilerHost,
              toExtraDtsFileName(normalizedRealFileName, extraFileExtensions),
              ...args
            )
          ) {
            // If the d.ts file exists, respect it and consider the virtual file not to exist.
            return false;
          }
        }
        return true;
      }
      return false;
    };

    // It keeps a callback to mark the parsed file as changed so that it can be reparsed.
    watchCompilerHost.watchFile = (fileName, callback) => {
      const normalized = normalizeFileName(fileName);
      this.fileWatchCallbacks.set(normalized, {
        // The function is called when the file is targeted for parsing.
        setupTarget: () => {
          if (isExtraDts(fileName, extraFileExtensions)) {
            callback(fileName, ts.FileWatcherEventKind.Deleted);
          } else if (isVirtualTSX(fileName, extraFileExtensions)) {
            callback(fileName, ts.FileWatcherEventKind.Created);
          } else {
            callback(fileName, ts.FileWatcherEventKind.Changed);
          }
        },
        // The function is called when the file leaves the target of parsing.
        resetTarget: () => {
          if (isExtraDts(fileName, extraFileExtensions)) {
            // If the .d.ts file exists, it will take respect.
            callback(fileName, ts.FileWatcherEventKind.Created);
          } else if (isVirtualTSX(fileName, extraFileExtensions)) {
            callback(fileName, ts.FileWatcherEventKind.Deleted);
          } else {
            callback(fileName, ts.FileWatcherEventKind.Changed);
          }
        },
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

/**
 * If the given filename is a extra extension file (.vue),
 * return a list of filenames containing virtual filename (.vue.tsx) and type def filename (.vue.d.ts).
 */
function getRefreshTargetFileNames(
  fileName: string,
  extraFileExtensions: string[]
) {
  if (isExtra(fileName, extraFileExtensions)) {
    return [`${fileName}.tsx`, `${fileName}.d.ts`, fileName];
  }
  return [fileName];
}

/** If the given filename has extra extensions, returns the d.ts filename. */
function toExtraDtsFileName(fileName: string, extraFileExtensions: string[]) {
  if (isExtra(fileName, extraFileExtensions)) {
    return `${fileName}.d.ts`;
  }
  return fileName;
}

/** If the given filename is a virtual filename (.vue.tsx), returns the real filename. */
function toRealFileName(fileName: string, extraFileExtensions: string[]) {
  if (isVirtualTSX(fileName, extraFileExtensions)) {
    return fileName.slice(0, -4);
  }
  return fileName;
}

/** If the given filename is has extra extension with d.ts, returns the real filename. */
function extraDtsToExtra(
  fileName: string,
  extraFileExtensions: string[]
): string {
  if (isExtraDts(fileName, extraFileExtensions)) {
    return fileName.slice(0, -5);
  }
  return fileName;
}

/** Checks the given filename has extra extension or not. */
function isExtra(fileName: string, extraFileExtensions: string[]): boolean {
  for (const extraFileExtension of extraFileExtensions) {
    if (fileName.endsWith(extraFileExtension)) {
      return true;
    }
  }
  return false;
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

/** Checks the given filename has extra extension with d.ts or not. */
function isExtraDts(fileName: string, extraFileExtensions: string[]): boolean {
  for (const extraFileExtension of extraFileExtensions) {
    if (fileName.endsWith(`${extraFileExtension}.d.ts`)) {
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
