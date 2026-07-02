import { useState, useEffect, useRef } from "react";
import api from "../api/client.js";
import SeverityBadge from "../components/SeverityBadge.jsx";

const DEMO_QUESTIONS = [
  "Has the efficiency deviation for this UPS been raised as an RFI before?",
  "What is the resolution for battery autonomy below specification?",
  "Is IP31 rating mandatory for UPS in an air-conditioned room?",
  "What are the THDi compliance requirements for the 1500 kVA UPS?",
];

export default function RFIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentSources, setCurrentSources] = useState([]);
  const [currentPrecedents, setCurrentPrecedents] = useState([]);
  const [rfis, setRfis] = useState([]);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    api
      .getRFIs()
      .then((data) => setRfis(Array.isArray(data.rfis) ? data.rfis : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(queryText) {
    const text = (queryText || input).trim();
    if (!text || sending) return;
    setInput("");

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const data = await api.queryRFI(text);
      const assistantMsg = {
        role: "assistant",
        content: data.answer || "No answer returned.",
        confidence: data.confidence || 0,
        precedent_rfis: Array.isArray(data.precedent_rfis)
          ? data.precedent_rfis
          : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentSources(Array.isArray(data.sources) ? data.sources : []);
      setCurrentPrecedents(
        Array.isArray(data.precedent_rfis) ? data.precedent_rfis : [],
      );
    } catch (err) {
      const errMsg = {
        role: "assistant",
        content: `Error: ${err.message}. Check that the backend is running and Ollama is serving the configured model.`,
        confidence: 0,
        precedent_rfis: [],
        sources: [],
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function confidenceBadgeClass(conf) {
    if (conf >= 0.8) return "bg-green-100 text-green-800";
    if (conf >= 0.6) return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  }

  return (
    <div className="max-w-7xl mx-auto" style={{ height: "calc(100vh - 8rem)" }}>
      <h1 className="text-2xl font-bold text-slate-800 mb-4">
        RFI Intelligence
      </h1>
      <div className="flex gap-4" style={{ height: "calc(100% - 4rem)" }}>
        {/* ── Left: RFI register ── */}
        <div className="w-52 flex-shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 overflow-y-auto p-4">
          <h2 className="font-semibold text-slate-600 text-sm mb-3">
            Project RFIs ({rfis.length})
          </h2>
          {rfis.length === 0 ? (
            <p className="text-slate-400 text-xs">
              No RFIs loaded. Run seed_data.py first.
            </p>
          ) : (
            rfis.map((rfi) => (
              <div
                key={rfi.id}
                onClick={() =>
                  setInput(`Explain the resolution for: ${rfi.title}`)
                }
                className="cursor-pointer rounded-lg p-2 hover:bg-slate-50 transition-colors mb-2"
              >
                <p className="text-xs font-semibold text-teal-600">
                  {rfi.rfi_code}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                  {rfi.title}
                </p>
                <span
                  className={`inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                    rfi.is_resolved
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {rfi.is_resolved ? "resolved" : "open"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* ── Centre: Chat ── */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-10 space-y-5">
                <div>
                  <p className="text-slate-700 font-semibold">
                    Ask a question about your project
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    Searches spec clauses and resolved RFIs for grounded answers
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 max-w-lg mx-auto">
                  {DEMO_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs text-teal-700 bg-teal-50
                        hover:bg-teal-100 rounded-lg px-4 py-2.5 transition-colors leading-relaxed"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "user" ? (
                  <div
                    className="bg-teal-600 text-white rounded-2xl rounded-tr-sm
                      px-4 py-3 max-w-lg text-sm leading-relaxed"
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-2xl w-full">
                    <div className="bg-slate-50 border-l-4 border-teal-500 rounded-r-2xl px-4 py-3">
                      {/* Message header */}
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <span className="text-xs font-semibold text-teal-700">
                          DCPI Intelligence
                        </span>
                        {msg.confidence > 0 && (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${confidenceBadgeClass(
                              msg.confidence,
                            )}`}
                          >
                            Confidence: {Math.round(msg.confidence * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Answer text */}
                      <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>

                      {/* Precedent RFI cards */}
                      {msg.precedent_rfis && msg.precedent_rfis.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.precedent_rfis.map((p, j) => (
                            <div
                              key={j}
                              className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-amber-700">
                                  📂 Precedent: {p.rfi_code}
                                </span>
                                <span className="text-xs text-slate-500">
                                  · Similarity{" "}
                                  {Math.round((p.similarity_score || 0) * 100)}%
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {p.title}
                              </p>
                              {p.resolution_summary && (
                                <p className="text-xs text-slate-500 mt-1 italic">
                                  {p.resolution_summary.slice(0, 200)}
                                  {p.resolution_summary.length > 200
                                    ? "..."
                                    : ""}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about specifications, RFI history, or technical requirements... (Enter to send, Shift+Enter for newline)"
                rows={2}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5
                  text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300
                  disabled:cursor-not-allowed text-white font-semibold
                  px-5 rounded-xl transition-colors text-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Sources sidebar ── */}
        <div
          className="w-56 flex-shrink-0 bg-white rounded-xl shadow-sm border border-slate-100
          overflow-y-auto p-4"
        >
          <h2 className="font-semibold text-slate-600 text-sm mb-3">Sources</h2>
          {currentSources.length === 0 ? (
            <p className="text-slate-400 text-xs leading-relaxed">
              Citations appear here after your first query.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {currentSources.slice(0, 6).map((src, i) => (
                  <div
                    key={i}
                    className="border border-slate-100 rounded-lg p-2.5"
                  >
                    <p className="text-xs font-semibold text-slate-600 truncate">
                      {src.clause_number || `Source ${i + 1}`}
                    </p>
                    {src.text_preview && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {src.text_preview.slice(0, 120)}
                      </p>
                    )}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                        <span>Similarity</span>
                        <span>{Math.round((src.score || 0) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1">
                        <div
                          className="bg-teal-400 h-1 rounded-full"
                          style={{
                            width: `${Math.round((src.score || 0) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {currentPrecedents.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-amber-700 mb-2">
                    Precedent RFIs
                  </h3>
                  {currentPrecedents.map((p, i) => (
                    <div
                      key={i}
                      className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2"
                    >
                      <p className="text-xs font-bold text-amber-700">
                        {p.rfi_code}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {p.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sim: {Math.round((p.similarity_score || 0) * 100)}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
