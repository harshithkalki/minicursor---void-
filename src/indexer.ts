import * as vscode from 'vscode';
import client from './lib/openAiClient';          

interface ChunkEntry {
  filePath: string;
  text: string;
  vector: number[];
}
const exclude = '**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/build/**';
const include = '**/*.{ts,tsx,js,jsx,py,md,json,css,html}'

function chunkText(text: string): string[] {
    const lines = text.split('\n');
    const chunks: string[] = [];
    let current: string[] = [];

    for (const line of lines) {
        if (/^(def |class |function |const |async function |export )/.test(line) && current.length > 0) {
            chunks.push(current.join('\n'));
            current = [];
        }
        current.push(line);
    }
    if (current.length > 0) chunks.push(current.join('\n'));
    return chunks.filter(c => c.trim().length > 0);
}

class Indexer {

    async index(workspaceUri: vscode.Uri): Promise<ChunkEntry[]> {
        const chunkList: ChunkEntry[] = [];
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceUri, include), exclude);
        for (const file of files) {
            const data = await vscode.workspace.fs.readFile(file);
            const text = Buffer.from(data).toString('utf-8')
            const textToEmbed = chunkText(text);

            for (const textSnippet of textToEmbed){
            //openai embedding part
            const response = await client.embeddings.create({
                model: 'text-embedding-3-small',
                input: textSnippet
            });
            const embedding = response.data[0];
            if (!embedding) throw new Error('No embedding returned');
            const chunkEntry: ChunkEntry = {
                filePath: file.fsPath,
                text: textSnippet,
                vector: embedding.embedding,
            };
                chunkList.push(chunkEntry);
            }
        }
        return chunkList;
    }
    

}

export default Indexer;