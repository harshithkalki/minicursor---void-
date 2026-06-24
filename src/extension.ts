import * as vscode from 'vscode';
import { ChatViewProvider } from './panels/ChatViewProvider';

export  function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "minicursor" is now active!');

  let disposable = vscode.commands.registerCommand('minicursor.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World from Mini Cursor!');
  });
  context.subscriptions.push(disposable);
  const chatViewProvider = new ChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider)
  );

}
export function deactivate() {}
