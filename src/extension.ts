// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log("Simplified Prettier is now active!");

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    vscode.languages.getLanguages().then((languages) => {
        const terminal =
            vscode.window.terminals.find(
                (t) => t.name === "Simplified Prettier"
            ) ?? vscode.window.createTerminal("Simplified Prettier");
        let disposable =
            vscode.languages.registerDocumentFormattingEditProvider(
                languages.map((language) => ({ language })),
                {
                    provideDocumentFormattingEdits(doc) {
                        try {
                            terminal.sendText(
                                getCommand(doc.languageId).replace("{file}", doc.fileName)
                            );
                            return [];
                        } catch (error) {
                            console.error(error);
                        }
                    },
                }
            );

        context.subscriptions.push(disposable);
    });
}

const getCommand = (language?: string) =>
    vscode.workspace
        .getConfiguration(
            "akiravoid.simplified-prettier",
            language ? { languageId: language } : undefined
        )
        .get<string>("command", "npx prettier --write --ignore-unknown {file}");
