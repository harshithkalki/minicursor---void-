import React, { useState } from "react";

type Message = {
  id: number;
  sender: "user" | "ai";
  text: string;
};

const App = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      text: "Hello! How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");

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

    setInput("");

    // Demo AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: "This is a placeholder AI response.",
        },
      ]);
    }, 1000);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",

        margin: "0 auto",
        border: "1px solid #ddd",
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
            <div
              style={{
                maxWidth: "70%",
                padding: "10px 14px",
                borderRadius: "12px",
                backgroundColor:
                  message.sender === "user" ? "#2563eb" : "#f3f4f6",
                color: message.sender === "user" ? "#fff" : "#000",
              }}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          padding: "16px",
          borderTop: "1px solid #ddd",
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
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "8px",
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
