import * as vscode from 'vscode';

import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import OpenAI from "openai";
import * as dotenv from 'dotenv';
dotenv.config();

export const client = new OpenAI(
      {apiKey: process.env.OPENAI_API_KEY}
);


export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'minicursor.chatView';
  
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public async resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    // webviewView.webview.postMessage({ type: 'aiResponse', text: 'here is the answer...' });
    webviewView.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'userMessage') {
            console.log('Received from webview:', message.text);

            const response = await client.chat.completions.create({
                stream: true,
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: message.text }
                ]
            })
            for await (const chunk of response) {
                const token = chunk.choices[0]?.delta?.content || '';
                console.log('Streaming token:', token);
                
                if (token) {
                    webviewView.webview.postMessage({ type: 'aiResponse', text: token });
                }}
                webviewView.webview.postMessage({ type: 'aiResponseEnd' });

            // webviewView.webview.postMessage({ type: 'aiResponse', text: 'Echo: ' + message.text });
        }
        });
    }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.js')
    );
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div id="root"></div>
      <script src="${scriptUri}"></script>
    </body>
    </html>`;
  }
}