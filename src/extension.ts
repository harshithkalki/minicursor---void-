import * as vscode from 'vscode';

export  function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "minicursor" is now active!');

  let disposable = vscode.commands.registerCommand('minicursor.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from Mini Cursor!');
  });
  context.subscriptions.push(disposable);
}
export function deactivate() {}
