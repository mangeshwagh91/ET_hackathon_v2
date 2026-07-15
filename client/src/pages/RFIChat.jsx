import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Paperclip, Mic, FileText, Search, Plus,
  MessageSquare, BrainCircuit, Maximize2, Copy,
  BookOpen, FolderClosed, Zap, ShieldAlert, CheckCircle,
  AudioLines
} from "lucide-react";
import api from "../api/client.js";
import SeverityBadge from "../components/SeverityBadge.jsx";
import ComplianceBackground from "../components/compliance/ComplianceBackground.jsx";
import RfiThinkingTimeline from "../components/chat/RfiThinkingTimeline.jsx";

const DEMO_QUESTIONS = [
  "Has the efficiency deviation for this UPS been raised as an RFI before?",
  "What is the resolution for battery autonomy below specification?",
  "Is IP31 rating mandatory for UPS in an air-conditioned room?",
  "What are the THDi compliance requirements for this UPS?",
];

export default function RFIChat() {
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem("dcpi_rfi_chat");
    return saved ? JSON.parse(saved) : [];
  });
  const [pastConversations, setPastConversations] = useState(() => {
    const saved = sessionStorage.getItem("dcpi_rfi_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentSources, setCurrentSources] = useState([]);
  const [currentPrecedents, setCurrentPrecedents] = useState([]);
  const [rfis, setRfis] = useState([]);

  const [activeConversationId, setActiveConversationId] = useState(() => {
    const saved = sessionStorage.getItem("dcpi_rfi_active_conv");
    return saved ? JSON.parse(saved) : null;
  });

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    api
      .getRFIs()
      .then((data) => setRfis(data.rfis || []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    sessionStorage.setItem("dcpi_rfi_chat", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem("dcpi_rfi_history", JSON.stringify(pastConversations));
  }, [pastConversations]);

  useEffect(() => {
    if (activeConversationId) {
      sessionStorage.setItem("dcpi_rfi_active_conv", JSON.stringify(activeConversationId));
    } else {
      sessionStorage.removeItem("dcpi_rfi_active_conv");
    }
  }, [activeConversationId]);

  const handleNewQuery = () => {
    if (messages.length > 0 && !activeConversationId) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.content : "Conversation";
      setPastConversations(prev => [{ id: Date.now(), title, messages }, ...prev]);
    } else if (messages.length > 0 && activeConversationId) {
      // Update existing conversation with any new messages added
      setPastConversations(prev => prev.map(conv => 
        conv.id === activeConversationId ? { ...conv, messages } : conv
      ));
    }
    setMessages([]);
    setCurrentSources([]);
    setCurrentPrecedents([]);
    setInput("");
    setActiveConversationId(null);
  };

  const loadConversation = (conv) => {
    // If there's an ongoing unsaved conversation, save it first
    if (messages.length > 0 && !activeConversationId) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.content : "Conversation";
      setPastConversations(prev => [{ id: Date.now(), title, messages }, ...prev]);
    } else if (messages.length > 0 && activeConversationId) {
      // Update existing before switching
      setPastConversations(prev => prev.map(c => 
        c.id === activeConversationId ? { ...c, messages } : c
      ));
    }

    setMessages(conv.messages);
    setActiveConversationId(conv.id);
    setCurrentSources([]);
    setCurrentPrecedents([]);
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  async function sendMessage(queryText) {
    const text = (queryText || input).trim();
    if (!text || sending) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const data = await api.queryRFI(text);

      const responseData = data.agent_response || data;
      const payload = responseData.knowledge_response || responseData.schedule_response || responseData.procurement_response || responseData.compliance_check || responseData.commissioning_tasks || responseData;

      let contentStr = payload.answer || payload.message || payload.error || responseData.error;
      if (!contentStr) {
        if (payload.tasks_analyzed !== undefined) {
          contentStr = `**Schedule Risk Analysis Complete**\n- Tasks Analyzed: ${payload.tasks_analyzed}\n- High Risk Tasks: ${payload.high_risk_count}\n`;
          if (payload.at_risk_tasks?.length > 0) {
            contentStr += "\n**At-Risk Tasks:**\n" + payload.at_risk_tasks.map(t => `- **${t.task_code}**: Risk Score ${Math.round(t.risk_score * 100)}%`).join("\n");
          }
        } else if (payload.compliance_status) {
          contentStr = `**Compliance Check: ${payload.po_id}**\nStatus: ${payload.compliance_status}\nDeviations: ${payload.total_deviations}`;
        } else if (payload.tracking_number || payload.eta) {
          contentStr = `**Shipment Tracking**\nStatus: ${payload.status}\nETA: ${payload.eta}`;
        } else {
          contentStr = typeof payload === 'string' ? payload : "```json\n" + JSON.stringify(payload, null, 2) + "\n```";
        }
      }

      const assistantMsg = {
        role: "assistant",
        content: contentStr,
        confidence: payload.confidence,
        precedent_rfis: payload.precedent_rfis || [],
        sources: payload.sources || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentSources(payload.sources || []);
      setCurrentPrecedents(payload.precedent_rfis || []);
    } catch (err) {
      const errMsg = {
        role: "assistant",
        content: `**Error:** ${err.message}\n\nPlease check that the backend is running and the API key is set.`,
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

  // Lines that are generic/empty and should not be shown as standalone paragraphs
  const GENERIC_FILTERS = [
    /there is no precedent rfi resolution found/i,
    /no precedent rfi/i,
    /review the project scope, budget, and timeline to ensure alignment/i,
    /^\s*\[confidence:/i,
  ];

  const isGenericLine = (text) => GENERIC_FILTERS.some(rx => rx.test(text.trim()));

  const formatResponseContent = (content) => {
    if (!content) return null;

    // Fast path: if the entire response is a JSON string (or similar), or contains code blocks.
    const hasCodeBlock = content.includes('```');

    // Split by code blocks: ```language ... ```
    if (hasCodeBlock) {
      const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);

      return parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract the content inside the backticks
          const codeLines = part.split('\n');
          const codeContent = codeLines.slice(1, -1).join('\n'); // drop ```lang and closing ```

          return (
            <div key={index} className="bg-[#131413] border border-[#2A2C2A] rounded-xl p-4 my-3 overflow-x-auto custom-scrollbar">
              <pre className="text-[12px] font-mono text-[#8A8D8A] whitespace-pre-wrap">
                {codeContent}
              </pre>
            </div>
          );
        }

        // For non-code parts, if it's just whitespace, ignore
        if (!part.trim()) return null;

        // Use our standard text renderer for this part
        return <div key={index}>{renderFormattedText(part)}</div>;
      });
    }

    // If no code block, just render standard text
    return renderFormattedText(content);
  };

  const renderFormattedText = (textContent) => {
    // Strip the trailing [Confidence: ...] tag from the bottom
    const confidenceMatch = textContent.match(/\[confidence:\s*(high|medium|low)\]/i);
    const confidenceLevel = confidenceMatch ? confidenceMatch[1].toUpperCase() : null;
    const cleanContent = textContent.replace(/\[confidence:\s*(high|medium|low)\]/gi, '').trim();

    // Split into sections: (a) ... (b) ... (c) ...
    const sectionRegex = /\(([a-c])\)\s+([^:]+):\s*/gi;
    const sections = [];
    let lastIndex = 0;

    const sectionMatches = [...cleanContent.matchAll(/\n?\(([a-c])\)\s+([^\n:]+):?\s*/gi)];

    if (sectionMatches.length > 0) {
      sectionMatches.forEach((sm, idx) => {
        const start = sm.index;
        const end = idx + 1 < sectionMatches.length ? sectionMatches[idx + 1].index : cleanContent.length;
        const body = cleanContent.slice(start + sm[0].length, end).trim();
        const nonGenericLines = body.split('\n').filter(l => l.trim() && !isGenericLine(l));
        if (nonGenericLines.length > 0) {
          sections.push({ label: sm[2].trim(), body: nonGenericLines.join('\n') });
        }
      });
    }

    const renderLines = (text) =>
      text.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Bold markers become headings
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return <h4 key={i} className="font-bold text-white mt-3 mb-1 text-sm">{trimmed.replace(/\*\*/g, '')}</h4>;
        }

        // Inline bold within lines
        const withBold = trimmed.split(/(\*\*[^*]+\*\*)/).map((part, pi) =>
          part.startsWith('**') ? <strong key={pi} className="text-[#EDEFEE] font-semibold">{part.replace(/\*\*/g, '')}</strong> : part
        );

        // Source citations highlight
        const parts = [];
        const sourceRx = /(\[SOURCE \d+[^\]]*\])/g;
        let lastSplit = 0;
        let src;
        const withBoldStr = trimmed; // This handles parsing citations over text
        while ((src = sourceRx.exec(withBoldStr)) !== null) {
          if (src.index > lastSplit) parts.push(withBoldStr.slice(lastSplit, src.index));
          parts.push(<span key={`src-${src.index}`} className="text-emerald-400 font-bold text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded mx-1">{src[1]}</span>);
          lastSplit = src.index + src[0].length;
        }
        if (lastSplit < withBoldStr.length) parts.push(withBoldStr.slice(lastSplit));

        // Note: Because we split bold separately from citations, mixing them is tricky.
        // We'll trust the simpler rendering if citations exist.
        const finalContent = parts.length > 0 ? parts : withBold;

        if (trimmed.startsWith('- ')) {
          return <li key={i} className="ml-4 list-disc mb-1 leading-relaxed text-[#EDEFEE]">{finalContent}</li>;
        }
        return <p key={i} className="leading-relaxed mb-3 text-[#EDEFEE]">{finalContent}</p>;
      }).filter(Boolean);

    const renderConfidence = () => {
      if (!confidenceLevel) return null;
      return (
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full mt-2 shadow-sm ${confidenceLevel === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            confidenceLevel === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              'bg-[#181A19] text-[#8A8D8A] border border-[#2A2C2A]'
          }`}>
          <span className="w-1.5 h-1.5 rounded-full inline-block bg-current" />
          Confidence: {confidenceLevel}
        </div>
      );
    };

    if (sections.length > 0) {
      return (
        <div className="space-y-4">
          {sections.map((sec, si) => (
            <div key={si}>
              <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-500 mb-2">{sec.label}</div>
              <div>{renderLines(sec.body)}</div>
            </div>
          ))}
          {renderConfidence()}
        </div>
      );
    }

    return (
      <div>
        <div>{renderLines(cleanContent)}</div>
        {renderConfidence()}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full h-full relative bg-[#131413] overflow-hidden flex flex-col">
      <ComplianceBackground />

      {/* ─── Main Workspace ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative z-10 w-full">

        {/* Left Panel: Sidebar */}
        <div className="w-[240px] flex-none bg-[#131413] border-r border-[#2A2C2A] flex flex-col overflow-hidden hidden lg:flex">
          {/* Sidebar Header */}
          <div className="h-12 border-b border-[#2A2C2A] bg-[#181A19] flex items-center px-4 flex-shrink-0">
            <h1 className="text-[13px] font-bold text-white tracking-wide uppercase">RFI Intelligence</h1>
          </div>

          <div className="p-4 border-b border-[#2A2C2A]">
            <button
              onClick={handleNewQuery}
              className="w-full bg-[#181A19] hover:bg-[#2A2C2A] border border-[#2A2C2A] rounded-md p-2 flex items-center justify-center gap-2 text-sm font-semibold text-white transition-colors"
            >
              <Plus size={16} /> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#8A8D8A] mb-3 flex items-center gap-2">
                <Search size={12} /> Historical RFIs
              </h2>

              {rfis.length === 0 ? (
                <p className="text-[11px] text-[#8A8D8A] p-2 text-center bg-[#131413] rounded-md border border-[#181A19]">No history available</p>
              ) : (
                <div className="space-y-1">
                  {rfis.map((rfi) => (
                    <div
                      key={rfi.id}
                      onClick={() => sendMessage(`Explain the resolution for: ${rfi.title}`)}
                      className="cursor-pointer rounded-md p-2 hover:bg-[#181A19] transition-all group border border-transparent hover:border-[#2A2C2A]"
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare size={12} className="text-[#8A8D8A] group-hover:text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#EDEFEE] truncate">{rfi.rfi_code}</p>
                          <p className="text-[10px] text-[#8A8D8A] line-clamp-2 mt-0.5 leading-tight">{rfi.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#8A8D8A] mb-3 flex items-center gap-2">
                <MessageSquare size={12} /> Recent Chats
              </h2>

              {pastConversations.length === 0 ? (
                <p className="text-[11px] text-[#8A8D8A] p-2 text-center bg-[#131413] rounded-md border border-[#181A19]">No recent chats</p>
              ) : (
                <div className="space-y-1">
                  {pastConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className="cursor-pointer rounded-md p-2 hover:bg-[#181A19] transition-all group border border-transparent hover:border-[#2A2C2A]"
                    >
                      <div className="flex items-start gap-2">
                        <BrainCircuit size={12} className="text-[#8A8D8A] group-hover:text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-[#8A8D8A] line-clamp-2 leading-tight">{conv.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Chat Area */}
        <div className="flex-1 flex flex-col bg-[#131413] relative overflow-hidden">

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4">
                <div className="w-16 h-16 bg-[#181A19] border border-[#2A2C2A] rounded-2xl flex items-center justify-center text-emerald-500 mb-6 shadow-xl">
                  <BrainCircuit size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">How can I assist you today?</h2>
                <p className="text-[#8A8D8A] mb-8 max-w-md text-sm">
                  I am your AI engineering assistant. I can cross-reference specifications, analyze vendor deviations, and search historical RFIs.
                </p>

                <div className="flex flex-col gap-3 w-full max-w-lg">
                  {DEMO_QUESTIONS.map((q, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => sendMessage(q)}
                      className="bg-[#131413] hover:bg-[#181A19] border border-[#2A2C2A] rounded-xl px-4 py-3 text-[13px] font-medium text-[#d4d4d8] shadow-sm hover:border-[#2A2C2A] transition-all text-left"
                    >
                      {q}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto w-full flex flex-col space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                      <div className="bg-[#181A19] text-[#EDEFEE] border border-[#2A2C2A] rounded-2xl rounded-tr-sm px-5 py-3 max-w-2xl text-[14px] shadow-lg font-medium leading-relaxed">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="w-full flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#181A19] border border-[#2A2C2A] flex flex-shrink-0 items-center justify-center text-emerald-500 shadow-sm mt-1">
                          <BrainCircuit size={16} />
                        </div>

                        <div className="flex-1">
                          <div className="bg-transparent text-[14px] text-[#d4d4d8] leading-relaxed">
                            {formatResponseContent(msg.content)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {sending && (
              <div className="max-w-4xl mx-auto w-full mt-6">
                <RfiThinkingTimeline />
              </div>
            )}

            <div ref={chatEndRef} className="h-4" />
          </div>

          {/* Input Area */}
          <div className="p-4 relative bottom-[5px]">
            <div className="max-w-4xl mx-auto bg-[#212121] shadow-2xl rounded-full flex items-end p-1 pl-3 transition-all border border-[#2A2C2A]">
              <button className="p-2 text-white hover:text-gray-300 transition-colors rounded-full flex-shrink-0 mb-[1px]">
                <Plus size={24} strokeWidth={2} />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                className="flex-1 max-h-32 min-h-[40px] bg-transparent border-0 outline-none focus:outline-none focus:ring-0 px-3 py-2.5 text-[14px] resize-none text-white placeholder-[#8A8D8A] custom-scrollbar leading-relaxed overflow-hidden"
                rows={1}
              />

              <div className="flex items-center gap-1.5 flex-shrink-0 pr-1 mb-[3px]">
                <button className="p-2 text-white hover:text-gray-300 transition-colors rounded-full hidden sm:flex">
                  <Mic size={20} strokeWidth={2} />
                </button>
                <button
                  onClick={() => input.trim() && !sending && sendMessage()}
                  disabled={sending}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${sending ? 'opacity-50 cursor-not-allowed bg-[#161616] text-white' : 'bg-[#161616] text-white hover:bg-[#2A2C2A]'
                    }`}
                >
                  {input.trim() ? <Send size={16} strokeWidth={2.5} className="mr-[2px]" /> : <AudioLines size={18} strokeWidth={2.5} />}
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-[#8A8D8A] mt-3 font-medium">
              AI can make mistakes. Verify critical engineering parameters against official documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
