import { execSync } from 'child_process';
import { rmSync, writeFileSync } from 'fs';
import path from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Format with CLI is now active!');

  vscode.languages.getLanguages().then(languages => {
    let disposable = vscode.languages.registerDocumentFormattingEditProvider(
      languages.map(language => ({ language })),
      {
        provideDocumentFormattingEdits(doc) {
          if (doc.uri.scheme !== 'file') {
            throw new TypeError(
              'Format with CLI currently does not support formatting documents that are not local files.',
            );
          }

          if (!isDirectFormatEnabled()) {
            return formatWithFormatter(doc);
          }

          return formatDirectly(doc);
        },
      },
    );

    context.subscriptions.push(disposable);
  });
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
  try {
    terminal.sendText(
      getCommand(doc.languageId).replace('{file}', doc.fileName),
    );
    return [];
  } catch (error) {
    console.error(error);
  }
};

const formatDirectly = (doc: vscode.TextDocument) => {
  const content = doc.getText();
  const workspaceRoot = getWorkspaceRootOfDocument(doc);
  const cacheFile = path.join(
    workspaceRoot,
    `.~format-with-cli.cache${path.extname(doc.fileName)}`,
  );
  const command = getCommand(doc.languageId).replace('{file}', cacheFile);
  try {
    writeFileSync(cacheFile, content, { encoding: 'utf-8', flag: 'w' });
    const output = execSync(command, {
      windowsHide: false,
      encoding: 'utf-8',
      cwd: workspaceRoot,
    });
    rmSync(cacheFile);
    const range = new vscode.Range(
      doc.lineAt(0).range.start,
      doc.lineAt(doc.lineCount - 1).range.end,
    );
    const edit = vscode.TextEdit.replace(range, output);
    return [edit];
  } catch (error) {
    console.error(error);
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
      /** Need this validation since the `path.dirname()` may not return `.` on Windows. */
      break;
    }

    searchingPath = nextPath;
  }

  if (root === undefined) {
    return vscode.env.appRoot;
  }

  return isWindows ? root.replaceAll('/', '\\') : root;
};
