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

  private readonly tsconfigPath: string;

  public readonly extraFileExtensions: string[];

  private currTarget = {
    code: "",
    filePath: "",
    dirMap: new Map<string, { name: string; path: string }>(),
  };

  private readonly fileWatchCallbacks = new Map<string, () => void>();

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
        this.fileWatchCallbacks.get(normalizeFileName(this.tsconfigPath))?.();
      }
      getFileNamesIncludingVirtualTSX(
        targetPath,
        this.extraFileExtensions
      ).forEach((vFilePath) => {
        this.fileWatchCallbacks.get(vFilePath)?.();
      });
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
    const normalizedTsconfigPaths = new Set([normalizeFileName(tsconfigPath)]);
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
      ts.createAbstractBuilder,
      (diagnostic) => {
        throw new Error(formatDiagnostics([diagnostic]));
      },
      () => {
        // Not reported in reportWatchStatus.
      },
      undefined
      // extraFileExtensions.map((extension) => ({
      //   extension,
      //   isMixedContent: true,
      //   scriptKind: ts.ScriptKind.Deferred,
      // }))
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
      return distinctArray(
        ...original.getDirectories.call(watchCompilerHost, dirName, ...args),
        // Include the path to the target file if the target file does not actually exist.
        this.currTarget.dirMap.get(normalizeFileName(dirName))?.name
      );
    };
    watchCompilerHost.directoryExists = (dirName, ...args) => {
      return (
        original.directoryExists.call(watchCompilerHost, dirName, ...args) ||
        // Include the path to the target file if the target file does not actually exist.
        this.currTarget.dirMap.has(normalizeFileName(dirName))
      );
    };
    watchCompilerHost.readDirectory = (dirName, ...args) => {
      const results = original.readDirectory.call(
        watchCompilerHost,
        dirName,
        ...args
      );

      // Include the target file if the target file does not actually exist.
      const file = this.currTarget.dirMap.get(normalizeFileName(dirName));
      if (file && file.path === this.currTarget.filePath) {
        results.push(file.path);
      }

      return distinctArray(...results).map((result) =>
        toVirtualTSXFileName(result, extraFileExtensions)
      );
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

      const code = original.readFile.call(
        watchCompilerHost,
        realFileName,
        ...args
      );
      if (!code) {
        return code;
      }
      // If it's tsconfig, it will take care of rewriting the `include`.
      if (normalizedTsconfigPaths.has(normalized)) {
        const configJson = ts.parseConfigFileTextToJson(realFileName, code);
        if (!configJson.config) {
          return code;
        }
        if (configJson.config.extends) {
          // If it references another tsconfig, rewrite the `include` for that file as well.
          for (const extendConfigPath of [configJson.config.extends].flat()) {
            normalizedTsconfigPaths.add(
              normalizeFileName(
                toAbsolutePath(extendConfigPath, path.dirname(normalized))
              )
            );
          }
        }

        if (!configJson.config.include) {
          return code;
        }
        const include = [configJson.config.include]
          .flat()
          .map((s) => toVirtualTSXFileName(s, extraFileExtensions));

        return JSON.stringify({
          ...configJson.config,
          include,
        });
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
      return original.fileExists.call(
        watchCompilerHost,
        toRealFileName(fileName, extraFileExtensions),
        ...args
      );
    };

    // It keeps a callback to mark the parsed file as changed so that it can be reparsed.
    watchCompilerHost.watchFile = (fileName, callback) => {
      const normalized = normalizeFileName(fileName);
      this.fileWatchCallbacks.set(normalized, () =>
        callback(fileName, ts.FileWatcherEventKind.Changed)
      );

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

/** If the given filename is a `.vue` file, return a list of filenames containing virtual filename (.vue.tsx). */
function getFileNamesIncludingVirtualTSX(
  fileName: string,
  extraFileExtensions: string[]
) {
  for (const extraFileExtension of extraFileExtensions) {
    if (fileName.endsWith(extraFileExtension)) {
      return [`${fileName}.tsx`, fileName];
    }
  }
  return [fileName];
}

/** If the given filename has extra file extensions, returns the real virtual filename. */
function toVirtualTSXFileName(fileName: string, extraFileExtensions: string[]) {
  for (const extraFileExtension of extraFileExtensions) {
    if (fileName.endsWith(extraFileExtension)) {
      return `${fileName}.tsx`;
    }
  }
  return fileName;
}

/** If the given filename is a virtual filename (.vue.tsx), returns the real filename. */
function toRealFileName(fileName: string, extraFileExtensions: string[]) {
  for (const extraFileExtension of extraFileExtensions) {
    if (fileName.endsWith(`${extraFileExtension}.tsx`)) {
      return fileName.slice(0, -4);
    }
  }
  return fileName;
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
