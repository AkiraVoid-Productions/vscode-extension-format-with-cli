import { execSync } from 'child_process';
import { rmSync, writeFileSync } from 'fs';
import path from 'path';
import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Format with CLI', {
  log: true,
});

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

          if (!isDirectFormatEnabled()) {
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

const getCommand = (language?: string) =>
  vscode.workspace
    .getConfiguration(
      'AkiraVoid.formatWithCLI',
      language ? { languageId: language } : undefined,
    )
    .get<string>('command', 'npx prettier --ignore-unknown "{file}"');

const isDirectFormatEnabled = (language?: string) =>
  vscode.workspace
    .getConfiguration(
      'AkiraVoid.formatWithCLI',
      language ? { languageId: language } : undefined,
    )
    .get<boolean>('directFormat', true);

const formatWithFormatter = (doc: vscode.TextDocument) => {
  const terminal =
    vscode.window.terminals.find(t => t.name === 'Format with CLI') ??
    vscode.window.createTerminal('Format with CLI');
  terminal.hide();
  outputChannel.debug(
    `Format with CLI specified terminal created. Name: ${terminal.name}; Process ID: ${terminal.processId}; State: ${terminal.state}.`,
  );
  try {
    const command = getCommand(doc.languageId).replace('{file}', doc.fileName);
    terminal.sendText(command);
    outputChannel.info(`Command ${command} executed.`);
    return [];
  } catch (error) {
    outputChannel.error(error as Error);
  }
};

const formatDirectly = (doc: vscode.TextDocument) => {
  const content = doc.getText();
  const workspaceRoot = getWorkspaceRootOfDocument(doc);
  outputChannel.debug(`The cache root is "${workspaceRoot}".`);
  const cacheFile = path.join(
    workspaceRoot,
    `.~format-with-cli.cache${path.extname(doc.fileName)}`,
  );
  const command = getCommand(doc.languageId).replace('{file}', cacheFile);
  outputChannel.info(
    `Will run the command "${command}" to format the document "${doc.fileName}".`,
  );
  try {
    writeFileSync(cacheFile, content, { encoding: 'utf-8', flag: 'w' });
    const output = execSync(command, {
      windowsHide: false,
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
