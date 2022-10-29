import path from "path";
import ts from "typescript";
import { getExtraFileTransformer } from "./transform";

export type ExtraFileTransformerContext = {
  filePath: string;
  current: boolean;
};
export type ExtraFileTransformer = (
  code: string,
  context: ExtraFileTransformerContext
) => string;

export type ProgramOptions = {
  project: string;
  filePath: string;
  extraFileExtensions: string[];
};

export class TSServiceManager {
  private readonly tsServices = new Map<string, TSService[]>();

  public getProgram(code: string, options: ProgramOptions): ts.Program {
    const tsconfigPath = options.project;
    const fileName = normalizeFileName(toAbsolutePath(options.filePath));
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

    return service.getProgram(code, fileName);
  }
}

export class TSService {
  private readonly watch: ts.WatchOfConfigFile<ts.BuilderProgram>;

  public readonly extraFileExtensions: string[];

  private currTarget = {
    code: "",
    filePath: "",
  };

  private readonly fileWatchCallbacks = new Map<string, () => void>();

  public constructor(tsconfigPath: string, extraFileExtensions: string[]) {
    this.watch = this.createWatch(tsconfigPath, extraFileExtensions);
    this.extraFileExtensions = extraFileExtensions;
  }

  public getProgram(code: string, filePath: string): ts.Program {
    const lastTargetFilePath = this.currTarget.filePath;
    this.currTarget = {
      code,
      filePath,
    };
    const refreshTargetPaths = [filePath, lastTargetFilePath].filter((s) => s);
    for (const targetPath of refreshTargetPaths) {
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
    };
    watchCompilerHost.readFile = (fileName, ...args) => {
      const realFileName = toRealFileName(fileName, extraFileExtensions);
      const normalized = normalizeFileName(realFileName);
      const ext = path.extname(normalized);
      const transformer =
        (extraFileExtensions.includes(ext) && getExtraFileTransformer(ext)) ||
        ((s: string) => s);
      if (this.currTarget.filePath === normalized) {
        // It is the file currently being parsed.
        return transformer(this.currTarget.code, {
          filePath: normalized,
          current: true,
        });
      }

      const code = original.readFile.call(this, realFileName, ...args);
      return (
        code &&
        transformer(code, {
          filePath: normalized,
          current: false,
        })
      );
    };
    // Modify it so that it can be determined that the virtual file actually exists.
    watchCompilerHost.fileExists = (fileName, ...args) =>
      original.fileExists.call(
        this,
        toRealFileName(fileName, extraFileExtensions),
        ...args
      );

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
    watchCompilerHost.watchDirectory = () => ({
      close() {
        // noop
      },
    });

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
    return normalized;
  }
  return normalized.toLowerCase();
}

function toAbsolutePath(filePath: string) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
}
