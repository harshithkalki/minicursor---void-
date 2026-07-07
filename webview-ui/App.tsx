import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

// import "vscode-webview"

type Message = {
  id: number;
  sender: "user" | "ai";
  text: string;
};

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
};
const vscode = acquireVsCodeApi();

const App = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "Hello! How can I help you today?",
    },
  ]);
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      console.log("webview received:", event.data);
      const message = event.data;
      if (message.type === "aiResponse") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.sender === "ai") {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + message.text },
            ];
          }
          return [
            ...prev,
            { id: Date.now(), sender: "ai", text: message.text },
          ];
        });
      }
      if (message.type === "editReady") {
        setPendingEdit(message.filePath);
      }
      if (message.type === "editApplied") {
        setPendingEdit(null);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "ai",
            text: "✓ Changes applied successfully.",
          },
        ]);
        // optionally add a message to the chat
      }
      if (message.type === "editRejected") {
        setPendingEdit(null);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "ai",
            text: "✗ Edit discarded.",
          },
        ]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const [input, setInput] = useState("");
  const [pendingEdit, setPendingEdit] = useState<string | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "user",
        text: input,
      },
    ]);

    vscode.postMessage({ type: "userMessage", text: input });

    setInput("");

    // Demo AI response
    // setTimeout(() => {
    //   setMessages((prev) => [
    //     ...prev,
    //     {
    //       id: Date.now() + 1,
    //       sender: "ai",
    //       text: "This is a placeholder AI response.",
    //     },
    //   ]);
    // }, 1000);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--vscode-editor-background)",
        color: "var(--vscode-editor-foreground)",
      }}
    >
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent:
                message.sender === "user" ? "flex-end" : "flex-start",
            }}
          >
            {/* <div
              style={{
                maxWidth: "70%",
                padding: "10px 14px",
                borderRadius: "12px",
                backgroundColor:
                  message.sender === "user" ? "#2563eb" : "#f3f4f6",
                color: message.sender === "user" ? "#fff" : "#000",
              }}
            >
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div> */}
            {message.sender === "user" ? (
              <div
                style={{
                  maxWidth: "80%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "var(--vscode-input-background)",
                  color: "var(--vscode-input-foreground)",
                }}
              >
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
            ) : (
              <div
                style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  color: "var(--vscode-editor-foreground)",
                  lineHeight: "1.6",
                }}
              >
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>
      {pendingEdit && (
        <div
          style={{
            padding: "8px 16px",
            display: "flex",
            gap: "8px",
            borderTop: "1px solid var(--vscode-panel-border)",
          }}
        >
          <button
            onClick={() => vscode.postMessage({ type: "acceptEdit" })}
            style={{
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              backgroundColor: "var(--vscode-testing-iconPassed)",
            }}
          >
            Accept
          </button>
          <button
            onClick={() => vscode.postMessage({ type: "rejectEdit" })}
            style={{
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              backgroundColor: "var(--vscode-testing-iconFailed)",
            }}
          >
            Reject
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          padding: "16px",
          borderTop: "1px solid var(--vscode-panel-border)",
          background: "var(--vscode-editor-background)",
          gap: "8px",
        }}
      >
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          style={{
            flex: 1,
            padding: "8px 10px",
            border: "1px solid var(--vscode-input-border)",
            borderRadius: "6px",
            background: "var(--vscode-input-background)",
            color: "var(--vscode-input-foreground)",
            outline: "none",
          }}
        />

        <button
          onClick={handleSend}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default App;
