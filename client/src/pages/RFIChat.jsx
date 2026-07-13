import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Paperclip, Mic, FileText, Search, Plus, 
  MessageSquare, BrainCircuit, Maximize2, Copy, 
  BookOpen, FolderClosed, Zap, ShieldAlert, CheckCircle
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
  
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    api
      .getRFIs()
      .then((data) => setRfis(data.rfis || []))
      .catch(() => {});
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

  const handleNewQuery = () => {
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.content : "Conversation";
      setPastConversations(prev => [{ id: Date.now(), title, messages }, ...prev]);
    }
    setMessages([]);
    setCurrentSources([]);
    setCurrentPrecedents([]);
    setInput("");
  };

  const loadConversation = (conv) => {
    setMessages(conv.messages);
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
            contentStr += "\n**At-Risk Tasks:**\n" + payload.at_risk_tasks.map(t => `- **${t.task_code}**: Risk Score ${Math.round(t.risk_score*100)}%`).join("\n");
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

    // Strip the trailing [Confidence: ...] tag from the bottom
    const confidenceMatch = content.match(/\[confidence:\s*(high|medium|low)\]/i);
    const confidenceLevel = confidenceMatch ? confidenceMatch[1].toUpperCase() : null;
    const cleanContent = content.replace(/\[confidence:\s*(high|medium|low)\]/gi, '').trim();

    // Split into sections: (a) ... (b) ... (c) ...
    const sectionRegex = /\(([a-c])\)\s+([^:]+):\s*/gi;
    const sections = [];
    let lastIndex = 0;
    let match;

    // Try to find section headers (a), (b), (c)
    const sectionMatches = [...cleanContent.matchAll(/\n?\(([a-c])\)\s+([^\n:]+):?\s*/gi)];

    if (sectionMatches.length > 0) {
      sectionMatches.forEach((sm, idx) => {
        const start = sm.index;
        const end = idx + 1 < sectionMatches.length ? sectionMatches[idx + 1].index : cleanContent.length;
        const body = cleanContent.slice(start + sm[0].length, end).trim();

        // Filter out empty or generic-only sections
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
          return <h4 key={i} className="font-bold text-slate-800 mt-3 mb-1 text-sm">{trimmed.replace(/\*\*/g, '')}</h4>;
        }

        // Inline bold within lines
        const withBold = trimmed.split(/(\*\*[^*]+\*\*)/).map((part, pi) =>
          part.startsWith('**') ? <strong key={pi}>{part.replace(/\*\*/g, '')}</strong> : part
        );

        // Source citations highlight
        const parts = [];
        const sourceRx = /(\[SOURCE \d+[^\]]*\])/g;
        let lastSplit = 0;
        let src;
        const withBoldStr = trimmed;
        while ((src = sourceRx.exec(withBoldStr)) !== null) {
          if (src.index > lastSplit) parts.push(withBoldStr.slice(lastSplit, src.index));
          parts.push(<span key={`src-${src.index}`} className="text-indigo-600 font-semibold text-xs bg-indigo-50 px-1 py-0.5 rounded">{src[1]}</span>);
          lastSplit = src.index + src[0].length;
        }
        if (lastSplit < withBoldStr.length) parts.push(withBoldStr.slice(lastSplit));

        if (trimmed.startsWith('- ')) {
          return <li key={i} className="ml-4 list-disc text-slate-700 mb-0.5">{parts.length > 0 ? parts : withBold}</li>;
        }
        return <p key={i} className="text-slate-700 leading-relaxed mb-2">{parts.length > 0 ? parts : withBold}</p>;
      }).filter(Boolean);

    if (sections.length > 0) {
      return (
        <div className="space-y-4">
          {sections.map((sec, si) => (
            <div key={si}>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">{sec.label}</div>
              <div>{renderLines(sec.body)}</div>
            </div>
          ))}
          {confidenceLevel && (
            <div className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${
              confidenceLevel === 'HIGH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              confidenceLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-slate-50 text-slate-600 border border-slate-200'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full inline-block bg-current" />
              Confidence: {confidenceLevel}
            </div>
          )}
        </div>
      );
    }

    // Fallback: plain text rendering
    return (
      <div>
        <div>{renderLines(cleanContent)}</div>
        {confidenceLevel && (
          <div className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-2 ${
            confidenceLevel === 'HIGH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            confidenceLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-slate-50 text-slate-600 border border-slate-200'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full inline-block bg-current" />
            Confidence: {confidenceLevel}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[600px] flex flex-col relative overflow-hidden bg-slate-50 rounded-3xl border border-slate-200 shadow-sm">
      <ComplianceBackground />

      {/* ─── Premium Header ────────────────────────────────────────────── */}
      <header className="h-16 flex-shrink-0 border-b border-white/20 bg-white/40 backdrop-blur-md px-6 flex items-center justify-between relative z-20">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            RFI Intelligence
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Ask technical questions across specifications, standards, and historical data.
          </p>
        </div>
      </header>

      {/* ─── Main Workspace ────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative z-10 p-4 gap-4 max-w-[1600px] mx-auto w-full">
        
        {/* Left Panel: Conversation History */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4 hidden lg:flex">
          <button 
            onClick={handleNewQuery}
            className="w-full bg-white/80 hover:bg-white backdrop-blur-md border border-slate-200/60 rounded-xl p-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-800 transition-all shadow-sm hover:shadow"
          >
            <Plus size={18} /> New Query
          </button>

          <div className="flex-1 bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-4 overflow-y-auto custom-scrollbar shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2 mt-4">
              <Search size={12} /> Historical RFIs
            </h2>
            
            {rfis.length === 0 ? (
              <p className="text-xs text-slate-400 p-2 text-center bg-slate-50/50 rounded-lg">No history available</p>
            ) : (
              <div className="space-y-1">
                {rfis.map((rfi) => (
                  <div
                    key={rfi.id}
                    onClick={() => sendMessage(`Explain the resolution for: ${rfi.title}`)}
                    className="cursor-pointer rounded-xl p-2.5 hover:bg-white/80 transition-all group border border-transparent hover:border-slate-200/50 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare size={14} className="text-slate-400 group-hover:text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{rfi.rfi_code}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">{rfi.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 mt-6 flex items-center gap-2">
              <MessageSquare size={12} /> Recent Conversations
            </h2>
            
            {pastConversations.length === 0 ? (
              <p className="text-xs text-slate-400 p-2 text-center bg-slate-50/50 rounded-lg">No recent chats</p>
            ) : (
              <div className="space-y-1">
                {pastConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv)}
                    className="cursor-pointer rounded-xl p-2.5 hover:bg-white/80 transition-all group border border-transparent hover:border-slate-200/50 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <BrainCircuit size={14} className="text-slate-400 group-hover:text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">{conv.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Chat Area */}
        <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden relative">
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 shadow-sm rotate-3">
                  <BrainCircuit size={32} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-3">How can I assist you today?</h2>
                <p className="text-slate-500 mb-8 max-w-md">I am your AI engineering assistant. I can cross-reference specifications, analyze vendor deviations, and search historical RFIs.</p>
                
                <div className="flex flex-wrap justify-center gap-2">
                  {DEMO_QUESTIONS.map((q, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => sendMessage(q)}
                      className="bg-white/80 hover:bg-white border border-slate-200/60 rounded-full px-4 py-2.5 text-xs font-medium text-slate-600 shadow-sm hover:shadow transition-all text-left"
                    >
                      {q}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-2xl text-[15px] shadow-sm font-medium">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="w-full max-w-4xl flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-shrink-0 items-center justify-center text-white shadow-sm mt-1">
                        <BrainCircuit size={16} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="bg-white/80 border border-slate-100 rounded-2xl rounded-tl-sm p-6 shadow-sm">
                          


                          {/* Response Body */}
                          <div className="text-[15px] text-slate-700 leading-relaxed">
                            {formatResponseContent(msg.content)}
                          </div>



                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {sending && <RfiThinkingTimeline />}
            
            <div ref={chatEndRef} className="h-4" />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/50 backdrop-blur-xl">
            <div className="max-w-4xl mx-auto relative bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-2xl flex items-end p-2 transition-all">
              <button className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-xl mb-0.5">
                <Paperclip size={20} />
              </button>
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask an engineering question..."
                className="flex-1 max-h-40 min-h-[44px] bg-transparent border-0 px-4 py-3 text-[15px] resize-none focus:ring-0 text-slate-800 placeholder-slate-400 custom-scrollbar"
                rows={1}
              />
              
              <div className="flex gap-1 mb-0.5">
                <button className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hidden sm:block">
                  <Mic size={20} />
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || sending}
                  className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                    input.trim() && !sending 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Send size={18} className={input.trim() && !sending ? 'translate-x-0.5 -translate-y-0.5' : ''} />
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">AI can make mistakes. Verify critical engineering parameters against official documentation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
