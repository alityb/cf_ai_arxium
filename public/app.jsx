const { useState, useEffect, useRef } = React;

// Get API URL from current origin
const API_URL = window.location.origin;

// Generate or retrieve session ID
function getSessionId() {
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("sessionId", sessionId);
  }
  return sessionId;
}

// Noise background component
function NoiseBackground() {
  return (
    <div
      className="noise-background"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "#0a0a0a",
        opacity: 0.25,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.08,
          animation: "noise 0.2s infinite",
        }}
      />
    </div>
  );
}

// Citation component
function Citation({ citation }) {
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className="citation-link"
    >
      <div className="citation-card">
        <div className="citation-title">{citation.title}</div>
        <div className="citation-section">{citation.section}</div>
      </div>
    </a>
  );
}

// Citations list component
function Citations({ citations }) {
  if (!citations || citations.length === 0) return null;

  return (
    <div className="citations-container">
      <div className="citations-label">Sources:</div>
      <div className="citations-grid">
        {citations.map((citation, idx) => (
          <Citation key={idx} citation={citation} />
        ))}
      </div>
    </div>
  );
}

// Message component
function Message({ message }) {
  const isUser = message.role === "user";
  const isLoading = message.isLoading;

  return (
    <div className={`message ${message.role}${isLoading ? " loading" : ""}`}>
      {isUser ? (
        <div className="message-content">
          <span className="prompt">arxium$</span>{" "}
          <span className="message-text">{message.content}</span>
        </div>
      ) : (
        <div className="message-content">
          <span className="assistant-prompt">&gt;</span>{" "}
          <span className="message-text">{message.content}</span>
          {!isLoading && <Citations citations={message.citations} />}
        </div>
      )}
    </div>
  );
}

// Response length selector component
function ResponseLengthSelector({ value, onChange }) {
  const options = [
    { value: "short", label: "Short" },
    { value: "medium", label: "Medium" },
    { value: "long", label: "Long" },
  ];

  return (
    <div className="response-length-selector">
      <label className="response-length-label">Response length:</label>
      <div className="response-length-buttons">
        {options.map((option) => (
          <button
            key={option.value}
            className={`response-length-btn ${
              value === option.value ? "active" : ""
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Main App component
function App() {
  const [sessionId] = useState(getSessionId());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [responseLength, setResponseLength] = useState("medium");
  const [showCursor, setShowCursor] = useState(true);
  const [mounted, setMounted] = useState(false);
  const chatHistoryRef = useRef(null);
  const inputRef = useRef(null);

  // Cursor blink animation
  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat history
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+L or Cmd+L to clear history
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault();
        clearHistory();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load chat history
  async function loadHistory() {
    try {
      const response = await fetch(`${API_URL}/api/history/${sessionId}`);
      if (!response.ok) return;

      const history = await response.json();
      setMessages(
        history.map((msg) => ({
          ...msg,
          citations: [],
          isLoading: false,
        }))
      );
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }

  // Clear chat history
  async function clearHistory() {
    if (!confirm("Clear all chat history?")) return;

    try {
      const response = await fetch(`${API_URL}/api/clear/${sessionId}`, {
        method: "POST",
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      setMessages([]);
      addMessage("assistant", "History cleared.", []);
    } catch (error) {
      addMessage("assistant", `Error clearing history: ${error.message}`, []);
      console.error("Error:", error);
    }
  }

  // Add message to chat
  function addMessage(role, content, citations = [], isLoading = false) {
    const newMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
      citations,
      isLoading,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  }

  // Handle query submission
  async function handleSubmit(e) {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    // Add user message
    addMessage("user", query);
    setInput("");

    // Show loading
    const loadingId = addMessage(
      "assistant",
      "Searching ArXiv and analyzing papers...",
      [],
      true
    );

    try {
      const response = await fetch(`${API_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          session_id: sessionId,
          response_length: responseLength,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Remove loading, add real response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                ...msg,
                content: data.answer,
                citations: data.citations || [],
                isLoading: false,
              }
            : msg
        )
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? {
                ...msg,
                content: `Error: ${error.message}`,
                citations: [],
                isLoading: false,
              }
            : msg
        )
      );
      console.error("Error:", error);
    }
  }

  return (
    <>
      <NoiseBackground />
      <div
        className={`terminal-window ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="terminal-header">
          <div className="terminal-title">arxium</div>
          <div className="terminal-controls">
            <button
              className="clear-button"
              onClick={clearHistory}
              title="Clear history (Ctrl+L)"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4L4 12M4 4l8 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Clear
            </button>
          </div>
        </div>
        <div className="terminal-body">
          <div ref={chatHistoryRef} className="chat-history">
            {messages.length === 0 && (
              <div className="welcome-message">
                <div className="welcome-prompt">
                  <span className="prompt">arxium$</span>
                  <span
                    className={`cursor ${
                      showCursor ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    ▊
                  </span>
                </div>
                <div className="welcome-text">
                  Ask questions about ML research papers. I'll search ArXiv and
                  provide answers with citations.
                </div>
              </div>
            )}
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </div>
          <div className="input-section">
            <ResponseLengthSelector
              value={responseLength}
              onChange={setResponseLength}
            />
            <form className="input-line" onSubmit={handleSubmit}>
              <span className="prompt">arxium$</span>
              <input
                ref={inputRef}
                id="terminal-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your query..."
                autoFocus
                autoComplete="off"
              />
              <span
                className={`cursor ${
                  showCursor ? "opacity-100" : "opacity-0"
                }`}
              >
                █
              </span>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Render app
ReactDOM.render(<App />, document.getElementById("root"));

