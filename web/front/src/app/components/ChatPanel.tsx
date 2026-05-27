"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { 
  X, Send, Bot, User, 
  Sparkles, Zap, Brain, Heart, 
  MessageSquare, ChevronRight, 
  Search, ShieldCheck, Stethoscope, Clock3, MessageCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { chatWithECG } from "../../services/api";

interface ChatPanelProps {
  analysisId: string;
  anomalies?: string[];
  externalQuery?: { text: string; timestamp: number } | null;
}

export default function ChatPanel({ analysisId, anomalies = [], externalQuery }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Déclencher une requête externe (Quick Actions)
  useEffect(() => {
    if (externalQuery) {
      setOpen(true);
      sendMessage(externalQuery.text);
    }
  }, [externalQuery]);

  // Actions rapides intelligentes
  const quickActions = [
    { 
      label: "Analyser risques", 
      icon: <ShieldCheck size={14} />, 
      query: "Quels sont les principaux risques cardiovasculaires associés à ces résultats ?",
      color: "#10B981" 
    },
    { 
      label: "Recommandations", 
      icon: <Zap size={14} />, 
      query: "Quelles sont les prochaines étapes cliniques recommandées ?",
      color: "#F59E0B" 
    },
    { 
      label: "Explication anomalies", 
      icon: <Brain size={14} />, 
      query: `Peux-tu m'expliquer en détail les anomalies détectées : ${anomalies.join(", ")} ?`,
      color: "#6366F1" 
    },
    { 
      label: "Rapport résumé", 
      icon: <Sparkles size={14} />, 
      query: "Fais-moi un résumé synthétique de cette analyse pour un confrère.",
      color: "#EC4899" 
    }
  ];

  const sendMessage = async (text?: string) => {
    const messageToSend = (text || input).trim();
    if (!messageToSend || loading) return;

    const newMessages = [
      ...messages,
      { role: "user", content: messageToSend },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const data = await chatWithECG(analysisId, messageToSend, newMessages);
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.reply },
      ]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Désolé, je rencontre une difficulté technique. Veuillez réessayer dans un instant." },
      ]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <AnimatePresence>
        {/* Bouton flottant agrandi et animé - STYLE ORANGE CLOCK */}
        {!open && (
          <motion.button
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 45 }}
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            style={{
              position: "fixed",
              bottom: "32px",
              right: "32px",
              width: "72px",
              height: "72px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              color: "white",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 40px rgba(99,102,241,0.4), inset 0 0 0 1px rgba(255,255,255,0.2)",
              zIndex: 9999,
            }}
          >
            <div style={{ position: 'relative' }}>
              <MessageCircle size={32} />
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#10B981',
                  border: '2px solid white'
                }}
              />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Panel chat Premium Glassmorphism - TAILLE RÉDUITE */}
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            style={{
              position: "fixed",
              bottom: "32px",
              right: "32px",
              width: "380px",
              height: "600px",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              borderRadius: "28px",
              boxShadow: "0 30px 60px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.5)",
              display: "flex",
              flexDirection: "column",
              zIndex: 9999,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                color: "white",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ 
                  width: "36px", height: "36px", borderRadius: "12px", 
                  background: "rgba(255,255,255,0.2)", display: "flex", 
                  alignItems: "center", justifyContent: "center",
                  border: "1px solid rgba(255,255,255,0.1)"
                }}>
                  <MessageCircle size={20} color="white" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: "16px", margin: 0, letterSpacing: "-0.01em" }}>
                    Assistant Cardio IA
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10B981" }} />
                    <span style={{ opacity: 0.8, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      En ligne
                    </span>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  cursor: "pointer",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </motion.button>
            </div>

            {/* Messages Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {messages.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ textAlign: "center", marginTop: "20px" }}
                >
                  <div style={{ 
                    width: "70px", height: "70px", borderRadius: "24px", 
                    background: "rgba(99,102,241,0.08)", display: "flex", 
                    alignItems: "center", justifyContent: "center", margin: "0 auto 16px"
                  }}>
                    <Heart size={32} color="#6366F1" strokeWidth={1.5} />
                  </div>
                  <h4 style={{ color: "#1F2937", fontWeight: 800, fontSize: "18px", marginBottom: "6px" }}>
                    Comment puis-je aider ?
                  </h4>
                  <p style={{ color: "#6B7280", fontSize: "13px", lineHeight: "1.5", maxWidth: "240px", margin: "0 auto 20px" }}>
                    Posez vos questions sur cet examen ECG.
                  </p>
                  
                  {/* Quick Actions Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {quickActions.map((action, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => sendMessage(action.query)}
                        style={{
                          textAlign: "left",
                          padding: "12px",
                          borderRadius: "18px",
                          background: "white",
                          border: "1px solid rgba(0,0,0,0.04)",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.02)",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px"
                        }}
                      >
                        <div style={{ 
                          width: "24px", height: "24px", borderRadius: "6px", 
                          background: `${action.color}15`, color: action.color,
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          {action.icon}
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#374151" }}>
                          {action.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === "user" ? 15 : -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    gap: "10px",
                    alignItems: "flex-end",
                  }}
                >
                  {msg.role === "assistant" && (
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "9px",
                      background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)", display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Stethoscope size={14} color="white" />
                    </div>
                  )}
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "12px 16px",
                      borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                      background: msg.role === "user"
                        ? "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)"
                        : "white",
                      color: msg.role === "user" ? "white" : "#1F2937",
                      fontSize: "13.5px",
                      lineHeight: "1.5",
                      boxShadow: msg.role === "user" 
                        ? "0 8px 16px rgba(99,102,241,0.12)"
                        : "0 4px 12px rgba(0,0,0,0.02)",
                      border: msg.role === "assistant" ? "1px solid rgba(0,0,0,0.05)" : "none",
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "9px",
                    background: "#6366F1", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Stethoscope size={14} color="white" />
                  </div>
                  <div style={{
                    padding: "12px 16px",
                    borderRadius: "20px 20px 20px 4px",
                    background: "white",
                    display: "flex", gap: "5px", alignItems: "center",
                    border: "1px solid rgba(0,0,0,0.05)",
                  }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        style={{
                          width: "5px", height: "5px", borderRadius: "50%",
                          background: "#6366F1", opacity: 0.4 + (i * 0.2)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Section */}
            <div
              style={{
                padding: "16px 20px 24px",
                background: "transparent",
                flexShrink: 0,
              }}
            >
              <div style={{ 
                display: "flex", 
                gap: "8px", 
                background: "white",
                padding: "6px",
                borderRadius: "18px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                border: "1px solid rgba(0,0,0,0.05)"
              }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez ici..."
                  style={{
                    flex: 1,
                    border: "none",
                    padding: "8px 12px",
                    fontSize: "13.5px",
                    outline: "none",
                    background: "transparent",
                    color: "#1F2937",
                    fontWeight: 500
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: input.trim() && !loading ? "#6366F1" : "#F3F4F6",
                    border: "none",
                    color: input.trim() && !loading ? "white" : "#9CA3AF",
                    cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <Send size={16} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        ::-webkit-scrollbar {
          width: 5px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.1);
        }
      `}</style>
    </>
  );
}