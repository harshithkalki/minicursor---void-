import * as vscode from 'vscode';
import client from '../lib/openAiClient';
import Indexer from '../indexer';
import type{ ChunkEntry } from '../indexer';



function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0)
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dot / (magA * magB)
}


export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'minicursor.chatView';
  private chunkList: ChunkEntry[] = [];
  
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public async resolveWebviewView(webviewView: vscode.WebviewView) {
    try{

  
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    const indexer = new Indexer();
    webviewView.webview.html = this.getHtml(webviewView.webview);
    const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceUri) throw new Error('No workspace open');
    const chunk = await indexer.index(workspaceUri);
    this.chunkList = chunk;
    if (this.chunkList.length === 0) {
      webviewView.webview.postMessage({ type: 'aiResponse', text: 'No code files found in the workspace.' });
      return;
    }
    // webviewView.webview.postMessage({ type: 'aiResponse', text: 'here is the answer...' });
    webviewView.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'userMessage') {
            console.log('Received from webview:', message.text);

             const queryResponse = await client.embeddings.create({
                model: "text-embedding-3-small",
                input: message.text
            });
            const queryEmbedding = queryResponse.data[0]
            if (!queryEmbedding) throw new Error('No query embedding returned');
            const queryVector = queryEmbedding.embedding
            const similarities = this.chunkList.map(chunk => ({
                chunk,
                similarity: cosineSimilarity(queryVector, chunk.vector)
            }));
            similarities.sort((a, b) => b.similarity - a.similarity);
            const topChunks = similarities.slice(0, 3).map(item => item.chunk.text);
            const contextText = topChunks.join('\n\n');
            const response = await client.chat.completions.create({
                stream: true,
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a coding assistant. Answer questions using the provided code context. If the answer is in the context, reference it directly." },
                    { role: "user", content: `${message.text}\n\nContext:\n${contextText}` }
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
    }catch (err) {
    console.error('resolveWebviewView error:', err);
    vscode.window.showErrorMessage(`MiniCursor failed: ${err}`);
  }
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