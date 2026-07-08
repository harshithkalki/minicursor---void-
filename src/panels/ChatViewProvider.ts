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


const editPrompt = `You are a coding assistant helping modify a codebase.
The user wants to make a specific change to their code.
You will be given the user's request and relevant code snippets as context.

Using the context provided, return ONLY a valid JSON object in this exact shape:
{
  "filePath": "<relative path of the file to modify>",
  "content": "<complete new file content with the requested changes applied>"
}

Rules:
- Return the COMPLETE file content, not just the changed lines
- filePath must be relative to the workspace root
- No explanation, no markdown code fences, no extra text
- Only the raw JSON object`

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'minicursor.chatView';
  private _webviewView: vscode.WebviewView | undefined;
  private chunkList: ChunkEntry[] = [];
  private pendingEdit: { filePath: string; content: string } | null = null;

  public async reindex() {
    if (!this._webviewView) return;
    const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceUri) throw new Error('No workspace open');
    this._webviewView.webview.postMessage({ type: 'indexing' });
    const indexer = new Indexer();
    this.chunkList = await indexer.index(workspaceUri);
    this._webviewView.webview.postMessage({ type: 'indexingDone', count: this.chunkList.length });
}
  
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public async resolveWebviewView(webviewView: vscode.WebviewView) {
    try{  
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    this._webviewView = webviewView;
    const indexer = new Indexer();
    webviewView.webview.html = this.getHtml(webviewView.webview);
    const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceUri) throw new Error('No workspace open');
    webviewView.webview.postMessage({ type: 'indexing' });
    const chunk = await indexer.index(workspaceUri);
    this.chunkList = chunk;
    if (this.chunkList.length === 0) {
      webviewView.webview.postMessage({ type: 'aiResponse', text: 'No code files found in the workspace.' });
      return;
    }
    webviewView.webview.postMessage({ type: 'indexingDone', count: this.chunkList.length });
    webviewView.webview.onDidReceiveMessage(async (message) => {
          try {
      if (message.type === 'acceptEdit') {
            if (!this.pendingEdit) return;
            const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
            if (!workspaceUri) throw new Error('No workspace open');
            const fileUri = vscode.Uri.joinPath(workspaceUri, this.pendingEdit.filePath);
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(this.pendingEdit.content, 'utf-8'));
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            this.pendingEdit = null;
            webviewView.webview.postMessage({ type: 'editApplied' });
        }

        if (message.type === 'rejectEdit') {
            this.pendingEdit = null;
            webviewView.webview.postMessage({ type: 'editRejected' });
        }
        if (message.type === 'userMessage') {
            let editMessage = false;
            console.log('Received from webview:', message.text);
            let messageText = message.text;
            if(message.text.startsWith('/edit')){
                editMessage = true;
                messageText = message.text.replace('/edit', '').trim();
            }else {
              editMessage = false;
            }

             const queryResponse = await client.embeddings.create({
                model: "text-embedding-3-small",
                input: messageText
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

            if(!editMessage){
            const response = await client.chat.completions.create({
                stream: true,
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a coding assistant. Answer questions using the provided code context. If the answer is in the context, reference it directly." },
                    { role: "user", content: `${messageText}\n\nContext:\n${contextText}` }
                ]
            })
          
            for await (const chunk of response) {
                const token = chunk.choices[0]?.delta?.content || '';
                console.log('Streaming token:', token);
                
                if (token) {
                    webviewView.webview.postMessage({ type: 'aiResponse', text: token });
                }}
                webviewView.webview.postMessage({ type: 'aiResponseEnd' });
            }else{
              const topFile = similarities[0]?.chunk.filePath;
              if (!topFile) throw new Error('No relevant file found');
              const fileUri = vscode.Uri.file(topFile);
              const fileData = await vscode.workspace.fs.readFile(fileUri);
              const fullFileContent = Buffer.from(fileData).toString('utf-8');
              const response = await client.chat.completions.create({
                response_format: { type: "json_object" },
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: editPrompt },
                    { role: "user", content: `${messageText}\n\nFile: ${topFile}\n\n${fullFileContent}` }
                ]
            })
            const rawContent = response.choices[0]?.message?.content;
            if (!rawContent) throw new Error('No response from OpenAI');
            const parsed = JSON.parse(rawContent) as { filePath: string; content: string };
            this.pendingEdit = parsed;
            const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
            if (!workspaceUri) throw new Error('No workspace open');
            const originalUri = vscode.Uri.joinPath(workspaceUri, parsed.filePath);
            const proposedUri = vscode.Uri.parse(`untitled:MiniCursor-proposed-${Date.now()}`);
            const edit = new vscode.WorkspaceEdit();
            edit.insert(proposedUri, new vscode.Position(0, 0), parsed.content);
            await vscode.workspace.applyEdit(edit);
            await vscode.commands.executeCommand(
                'vscode.diff',
                originalUri,
                proposedUri,
                `MiniCursor: ${parsed.filePath}`
            );
            webviewView.webview.postMessage({ 
                type: 'editReady', 
                filePath: parsed.filePath 
            });
            }

        }
        } catch (err) {
        console.error('Message handler error:', err);
        webviewView.webview.postMessage({ 
            type: 'error', 
            text: `Something went wrong: ${err instanceof Error ? err.message : String(err)}` 
        });
    }
      
    })
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