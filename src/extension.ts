import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Format with CLI is now active!');

  vscode.languages.getLanguages().then(languages => {
    const terminal =
      vscode.window.terminals.find(t => t.name === 'Format with CLI') ??
      vscode.window.createTerminal('Format with CLI');
    let disposable = vscode.languages.registerDocumentFormattingEditProvider(
      languages.map(language => ({ language })),
      {
        provideDocumentFormattingEdits(doc) {
          try {
            terminal.sendText(
              getCommand(doc.languageId).replace('{file}', doc.fileName),
            );
            return [];
          } catch (error) {
            console.error(error);
          }
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
    .get<string>('command', 'npx prettier --write --ignore-unknown {file}');
