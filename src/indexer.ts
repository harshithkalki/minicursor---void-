import * as vscode from 'vscode';
import client from './lib/openAiClient';          

export interface ChunkEntry {
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

function splitLargeChunk(chunk: string, maxChars: number = 3000): string[] {
    if (chunk.length <= maxChars) return [chunk];
    return chunk.split(/\n\n+/).filter(c => c.trim().length > 0);
}

 class Indexer {

    async index(workspaceUri: vscode.Uri): Promise<ChunkEntry[]> {
        const chunkList: ChunkEntry[] = [];
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceUri, include),     new vscode.RelativePattern(workspaceUri, '**/node_modules/**')
        );
        const excludeList = [/node_modules/, /\.git/, /dist/, /build/, /out/, /\.min\.js/];
        const filtered = files.filter(f => !excludeList.some(pattern => pattern.test(f.fsPath)));
        console.log(`Found ${filtered.length} files to index`);
        for (const file of filtered) {
            console.log(`Embedding chunk from ${file.fsPath}`);
            const data = await vscode.workspace.fs.readFile(file);
            const text = Buffer.from(data).toString('utf-8')
            const chunks = chunkText(text).flatMap(c => splitLargeChunk(c));
            for (const textSnippet of chunks){
            // rough estimate: 1 token ≈ 4 characters
            if (textSnippet.length > 32000) continue;  
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