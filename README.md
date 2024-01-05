# Format with CLI

This is a simple formatter to format files by running a CLI command.

> **Think about it:** do you really need the complexity offered by those official formatter extensions such as `esbenp.prettier-vscode`, while they may even cannot format correctly for you just as the CLI of original formatter does? The most desparate thing is, the authors of those extensions may just forgot that they have such a project, so you must wait half a year and pray that the repo owners will merge the PRs you need for you.

## Features

This "formatter" only has one feature: executes the command set by you when you're trying to format a document.

## Requirements

-   Visual Studio Code: ^1.85.0

## Extension Settings

This extension contributes the following settings:

-   `akiravoid.format-with-cli.command`: Set the command for formatting. It can contains a placeholder `{file}` which refers to the path of the file to be formatted. The default value is `npx prettier --write --ignore-unknown {file}` since this extension is firstly made to solve the uncomfortable expirence when the author is trying to leverage the official prettier extension. This setting can be overrided based on language ID.

**Example:**

```jsonc
// settings.json
{
    // ...

    // Here is the default command that will be executed on all languages.
    "akiravoid.format-with-cli.command": "npx prettier --write --ignore-unknown {file}",
    // Here is the command that will only be executed on C# documents.
    "[csharp]": {
        "akiravoid.format-with-cli.command": "dotnet csharppier {file}"
    }

    // ...
}
```

## Known Issues

-   If you enabled Format on Save feature of Visual Studio Code and you changed the command setting, then the command which is executed immediately after you saved the configuration will still be the command before. This is caused by the mechanism of Visual Studio Code, and I currently have no idea about how to fix it. If you want this issue to be fixed, open an issue on GitHub and let me know.

## Release Notes

### 1.0.0

#### Features

-   support executing CLI command to format documents.
