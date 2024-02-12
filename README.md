# Format with CLI

This is a simple formatter to format files by running a CLI command.

> **Think about it:** do you really need the complexity offered by those official formatter extensions such as `esbenp.prettier-vscode`, while they may even cannot format correctly for you just as the CLI of original formatter does? The most desperate thing is, the authors of those extensions may just forgot that they have such a project, so you must wait half a year and pray that the repo owners will merge the PRs you need for you.

## Features

This "formatter" only has one feature: executes the command set by you when you're trying to format a document.

## Requirements

- Visual Studio Code: ^1.85.0

## Extension Settings

This extension contributes the following settings:

- `AkiraVoid.formatWithCLI.command`: Set the command for formatting. It can contains a placeholder `{file}` which refers to the path of the file to be formatted. Please make note that you should generally surround the {file} placeholder within the double quotes, or the path may be broken. The default value is `npx prettier --ignore-unknown "{file}"` since this extension is initially made to solve the uncomfortable experience when the author is trying to use the official prettier extension. This setting can be overridden based on language ID.
- `AkiraVoid.formatWithCLI.directFormat`: Enable/Disable Direct Format. The Direct Format leverages vscode-provided API to format a file, instead of leave the file to the formatter CLI itself. It call formatter CLI on a cache file first, then the formatter output the result in standard output, finally, this extension will replace the document with that output. Note that this technology is poor on performance, as it create and remove the cache file every time users try to format. This feature is enabled by default. If you want this feature to be disabled, make sure you've also set the `AkiraVoid.formatWithCLI.command` to a command that could directly change the file. This setting can be overridden based on language ID.

**Example:**

```jsonc
// settings.json
{
  // ...

  // Here is the default command that will be executed on all languages.
  "AkiraVoid.formatWithCLI.command": "npx prettier --ignore-unknown {file}",
  // Here is the command that will only be executed on C# documents.
  "[csharp]": {
    "AkiraVoid.formatWithCLI.command": "dotnet csharppier {file}",
    // Disable Direct Format as CSharpier change the files directly.
    "AkiraVoid.formatWithCLI.directFormat": false
  }

  // ...
}
```

> [!NOTE]
>
> We kindly suggest that you should add `*format-with-cli.cache*` into the `.*ignore` files in case we failed to delete this cache file after each formatting. But, as some formatters will ignore the files in `.gitignore` (such as Prettier), remember do not add cache file into it, or all documents won't get formatted when Direct Format is on.

## Known Issues

- If you enabled Format on Save feature of Visual Studio Code and you changed the command setting, then the command which is executed immediately after you saved the configuration will still be the previous command. This is caused by the mechanism of Visual Studio Code, and I currently have no idea about how to fix it. If you want this issue to be fixed, open an issue on GitHub and let me know.
- You must save the file first instead of formatting file first if you are not using direct format, or you may need to resolve the conflicts.
