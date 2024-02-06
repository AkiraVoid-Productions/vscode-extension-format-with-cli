import { execSync } from 'child_process';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Format with CLI is now active!');

  vscode.languages.getLanguages().then(languages => {
    let disposable = vscode.languages.registerDocumentFormattingEditProvider(
      languages.map(language => ({ language })),
      {
        provideDocumentFormattingEdits(doc) {
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
    .get<string>('command', 'npx prettier --ignore-unknown {file}');

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
  try {
    const output = execSync(
      getCommand(doc.languageId).replace('{file}', doc.fileName),
    ).toString('utf-8');
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
