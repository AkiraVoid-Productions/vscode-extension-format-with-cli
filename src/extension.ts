import { execSync } from 'child_process';
import { rmSync, writeFileSync } from 'fs';
import path from 'path';
import * as vscode from 'vscode';

/** The output channel of Visual Studio Code. Program logs are logged here. */
const outputChannel = vscode.window.createOutputChannel('Format with CLI', {
  log: true,
});

/**
 * The main entry point of this extension.
 *
 * @param context The Visual Studio Code extension context.
 */
export function activate(context: vscode.ExtensionContext) {
  outputChannel.info('Activating Format with CLI...');
  vscode.languages.getLanguages().then(languages => {
    let disposable = vscode.languages.registerDocumentFormattingEditProvider(
      languages.map(language => ({ language })),
      {
        provideDocumentFormattingEdits(doc) {
          if (doc.uri.scheme !== 'file') {
            const error = new TypeError(
              'Format with CLI currently does not support formatting documents that are not local files.',
            );
            outputChannel.error(error);
            throw error;
          }

          if (!isDirectFormatEnabled(doc.languageId)) {
            outputChannel.info('Direct Format disabled.');
            return formatWithFormatter(doc);
          }

          outputChannel.info('Direct Format enabled.');
          return formatDirectly(doc);
        },
      },
    );

    context.subscriptions.push(disposable);
  });
  outputChannel.info('Format with CLI activated!');
}

/**
 * Get the main command for formatting document from settings.
 *
 * @param language The language ID of the document to format.
 * @returns The main command for formatting document.
 */
const getCommand = (language: string) =>
  vscode.workspace
    .getConfiguration(
      'AkiraVoid.formatWithCLI',
      language ? { languageId: language } : undefined,
    )
    .get<string>('command', 'npx prettier --ignore-unknown "{file}"');

/**
 * Get a value that indicates whether if the Direct Format is enabled for
 * specified language or by default.
 *
 * @param language The language that may have Direct Format enabled or not, or
 *   `undefined` for retrieving default setting.
 * @returns `true` if Direct Format is enabled for the language or by default,
 *   otherwise `false`.
 */
const isDirectFormatEnabled = (language?: string) =>
  vscode.workspace
    .getConfiguration(
      'AkiraVoid.formatWithCLI',
      language ? { languageId: language } : undefined,
    )
    .get<boolean>('directFormat', true);

/**
 * Format the document with CLI command.
 *
 * @param doc The document to be formatted.
 * @returns This method always returns `[]` to prevent Visual Studio Code from
 *   changing document content after it was formatted by CLI command.
 */
const formatWithFormatter = (doc: vscode.TextDocument) => {
  const terminal =
    vscode.window.terminals.find(t => t.name === 'Format with CLI') ??
    vscode.window.createTerminal('Format with CLI');
  terminal.hide();
  outputChannel.debug(
    `Format with CLI specified terminal created. Name: ${terminal.name}; Process ID: ${terminal.processId}; State: ${terminal.state}.`,
  );
  try {
    const command = getCommand(doc.languageId).replaceAll(
      '{file}',
      doc.fileName,
    );
    terminal.sendText(command);
    outputChannel.info(`Command ${command} executed.`);
    return [];
  } catch (error) {
    outputChannel.error(error as Error);
  }
};

/**
 * Format document with the current (unsaved) text directly.
 *
 * @param doc The document to be formatted.
 * @returns The edit information with formatted content for Visual Studio Code
 *   to edit the document.
 */
const formatDirectly = (doc: vscode.TextDocument) => {
  const content = doc.getText();
  const workspaceRoot = getWorkspaceRootOfDocument(doc);
  outputChannel.debug(`The cache root is "${workspaceRoot}".`);
  const cacheFile = path.join(
    workspaceRoot,
    `.~format-with-cli.cache${path.extname(doc.fileName)}`,
  );
  const command = getCommand(doc.languageId).replaceAll('{file}', cacheFile);
  outputChannel.info(
    `Will run the command "${command}" to format the document "${doc.fileName}".`,
  );
  try {
    writeFileSync(cacheFile, content, { encoding: 'utf-8', flag: 'w' });
    const output = execSync(command, {
      windowsHide: true,
      encoding: 'utf-8',
      cwd: workspaceRoot,
    });
    outputChannel.debug(`The result is:\r\n${output}`);
    rmSync(cacheFile);
    if (output === '') {
      /** Only edit document if there is output from formatter. */
      return [];
    }

    const range = new vscode.Range(
      doc.lineAt(0).range.start,
      doc.lineAt(doc.lineCount - 1).range.end,
    );
    const edit = vscode.TextEdit.replace(range, output);
    outputChannel.info('Document formatted.');
    return [edit];
  } catch (error) {
    rmSync(cacheFile);
    outputChannel.error(error as Error);
  }
};

/**
 * Get the path to the root of the workspace which contains the document to be
 * formatted.
 *
 * @param doc The document to be formatted.
 * @returns The path to the root of the workspace if there's a workspace,
 *   otherwise the path to the Visual Studio Code app root.
 */
const getWorkspaceRootOfDocument = (doc: vscode.TextDocument) => {
  let root = undefined;
  let searchingPath = path.dirname(doc.fileName);
  let isWindows = false;
  if (searchingPath.includes('\\')) {
    isWindows = true;

    /** For supporting `vscode.workspace.getWorkspaceFolder()`. */
    searchingPath = searchingPath.replaceAll('\\', '/');
  }

  while (root === undefined && searchingPath !== '.') {
    const searchingUri = vscode.Uri.from({
      scheme: 'file',
      path: searchingPath,
    });
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(searchingUri);
    if (workspaceFolder) {
      root = workspaceFolder.uri.fsPath;
      break;
    }

    const nextPath = path.dirname(searchingPath);
    if (searchingPath === nextPath) {
      /**
       * Need this validation since the `path.dirname()` may not return `.` on
       * Windows.
       */
      break;
    }

    searchingPath = nextPath;
  }

  if (root === undefined) {
    outputChannel.warn(
      'The formatter is not running in a workspace, some functions may be restricted.',
    );
    return vscode.env.appRoot;
  }

  return isWindows ? root.replaceAll('/', '\\') : root;
};
