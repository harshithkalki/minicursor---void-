# MiniCursor

A VS Code extension that brings AI-powered chat and code editing to your sidebar — built from scratch without LangChain, Copilot APIs, or any AI framework abstractions.

## What it does

- **Chat with your codebase** — ask questions about your code and get answers grounded in the actual files in your workspace, not just GPT's general knowledge
- **AI-powered edits** — prefix any message with `/edit` to request a code change; MiniCursor shows a diff and lets you accept or reject before touching your files
- **Session-scoped RAG** — your workspace is indexed on startup using OpenAI embeddings and cosine similarity; no external vector database, no persistence overhead
- **Streaming responses** — chat responses stream token by token, the same way Cursor does it

## How it works

1. On activation, MiniCursor reads every source file in your workspace, chunks them by function/class boundaries, and embeds each chunk using `text-embedding-3-small`
2. When you ask a question, your query is embedded and compared against every stored chunk using cosine similarity
3. The top-3 most relevant chunks are injected into the GPT-4o-mini prompt as context
4. For `/edit` requests, the most relevant file is read in full and sent to GPT with a strict JSON prompt; the response is shown as a VS Code diff before any changes are written to disk

## Stack

- TypeScript
- VS Code Extension API
- OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`)
- React (webview UI)
- esbuild (dual-target bundling — Node for extension host, browser IIFE for webview)
- Hand-rolled RAG pipeline — custom chunking, cosine similarity, in-memory vector store

## Running locally

```bash
git clone https://github.com/harshithkalki/minicursor
cd minicursor
npm install
```

Create a `.env` file in the project root:

```
OPENAI_API_KEY=sk-...
```

Then open the project in VS Code and press **F5** to launch the Extension Development Host. Open any project folder in the new window and click the MiniCursor icon in the activity bar.

## Usage

| Input                                              | Behavior                                         |
| -------------------------------------------------- | ------------------------------------------------ |
| `how does auth work?`                              | RAG-augmented chat answer streamed from GPT      |
| `/edit add error handling to the login function`   | Shows a diff, writes to disk only on Accept      |
| Command Palette → `MiniCursor: Re-index Workspace` | Re-scans and re-embeds the workspace mid-session |

## Why I built this

Most AI coding tools are black boxes. I built MiniCursor to understand exactly how retrieval-augmented generation works at the implementation level — chunking strategy, embedding quality, cosine similarity ranking, streaming through VS Code's webview message-passing API — without any framework hiding the details.
