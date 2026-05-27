"use client";

import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  ExternalLink,
  Sparkles,
  Zap,
  Brain,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Clock,
  AlertCircle
} from 'lucide-react';

import { askMedicalChatbot } from "../../services/api";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { name: string; url: string }[];
  timestamp: string;
}

const QUICK_SUGGESTIONS = [
  {
    label: 'Fibrillation auriculaire',
    icon: <ShieldCheck size={14} />,
    color: '#10B981'
  },
  {
    label: 'Interpréter un QRS large',
    icon: <Brain size={14} />,
    color: '#6366F1'
  },
  {
    label: "Critères d'infarctus",
    icon: <Zap size={14} />,
    color: '#F59E0B'
  },
  {
    label: 'Score CHA2DS2-VASc',
    icon: <Sparkles size={14} />,
    color: '#EC4899'
  }
];

const PRIMARY_GRADIENT =
  "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)";

export default function ChatbotIA() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Bonjour Docteur. Je suis votre assistant Cardio-IA. Comment puis-je vous éclairer aujourd'hui ?\n\nJe peux vous aider à interpréter des tracés complexes, vérifier les dernières guidelines ESC/AHA ou calculer des scores de risque.",
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const query = (text || input).trim();

    if (!query || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setMessages((prev) => [...prev, userMessage]);

    setInput('');
    setLoading(true);

    try {
      const data = await askMedicalChatbot(query);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "Désolé, je rencontre une difficulté technique pour accéder à la base de connaissances médicales. Veuillez réessayer.",
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm("Effacer toute la conversation ?")) {
      setMessages([messages[0]]);
    }
  };

  return (
    <DashboardLayout>
      <div
        style={{
          height: '100vh',
          background: '#f8fafc',
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: '#1e293b',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* SCROLLABLE AREA */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar"
          style={{
            padding: '18px 22px 170px',
          }}
        >
          {/* HERO */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',

              background:
                'linear-gradient(135deg, #4f46e5 0%, #4338ca 45%, #3730a3 100%)',

              borderRadius: 30,

              padding: '30px 36px',

              minHeight: 185,

              marginBottom: 34,

              boxShadow:
                '0 28px 80px rgba(79,70,229,0.22)',
            }}
          >
            {/* BACKGROUND EFFECT */}
            <div
              style={{
                position: 'absolute',
                top: -120,
                right: -100,

                width: 340,
                height: 340,

                background:
                  'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 72%)',
              }}
            />

            {/* ILLUSTRATION */}
            <img
              src="/pageChatbot4.png"
              alt="Chatbot Illustration"
              style={{
                position: 'absolute',

                right: 200,

                top: '45%',

                transform: 'translateY(-50%)',

                width: 340,

                height: 340,

                objectFit: 'contain',

                pointerEvents: 'none',

                zIndex: 1,

                opacity: 0.98,

                filter:
                  'drop-shadow(0 20px 38px rgba(0,0,0,0.18))',
              }}
            />

            {/* BUTTON */}
            <div
              style={{
                position: 'absolute',

                top: 60,

                right: 34,

                zIndex: 3,
              }}
            >
              <button
                onClick={clearChat}
                style={{
                  border:
                    '1px solid rgba(255,255,255,0.16)',

                  background:
                    'rgba(255,255,255,0.12)',

                  color: 'white',

                  borderRadius: 18,

                  padding: '14px 18px',

                  cursor: 'pointer',

                  display: 'flex',

                  alignItems: 'center',

                  gap: 10,

                  fontSize: 13,

                  fontWeight: 900,

                  backdropFilter: 'blur(12px)',

                  boxShadow:
                    '0 10px 30px rgba(0,0,0,0.12)',
                }}
              >
                <Trash2 size={17} />
                Réinitialiser
              </button>
            </div>

            {/* CONTENT */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  color: 'white',

                  fontSize: 52,

                  fontWeight: 950,

                  lineHeight: 1.05,

                  letterSpacing: '-2px',
                }}
              >
                Assistant Cardio-IA
              </h1>

              <p
                style={{
                  margin: '16px 0 0',

                  maxWidth: 760,

                  color: 'rgba(255,255,255,0.82)',

                  fontSize: 16,

                  lineHeight: 1.8,

                  fontWeight: 500,
                }}
              >
                Obtenez des avis cliniques et des interprétations
                cardiologiques basés sur vos données.
              </p>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="max-w-4xl mx-auto space-y-10 px-2">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{
                    opacity: 0,
                    y: 30,
                    scale: 0.95,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`flex gap-5 ${
                    message.role === 'user'
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20"
                      style={{
                        background: PRIMARY_GRADIENT,
                      }}
                    >
                      <Stethoscope
                        className="w-6 h-6 text-white"
                      />
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${
                      message.role === 'user'
                        ? 'items-end'
                        : 'items-start'
                    } max-w-[88%] lg:max-w-[80%]`}
                  >
                    <div
                      className={`relative p-6 rounded-[28px] shadow-sm transition-all hover:shadow-md ${
                        message.role === 'user'
                          ? 'text-white'
                          : 'bg-white border border-slate-100 text-slate-800'
                      }`}
                      style={{
                        background:
                          message.role === 'user'
                            ? PRIMARY_GRADIENT
                            : 'white',

                        borderRadius:
                          message.role === 'user'
                            ? '28px 28px 4px 28px'
                            : '28px 28px 28px 4px',
                      }}
                    >
                      <p className="text-[16px] leading-relaxed whitespace-pre-line font-medium tracking-tight">
                        {message.content}
                      </p>
                    </div>

                    {/* SOURCES */}
                    {message.sources &&
                      message.sources.length > 0 && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            y: 10,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
                        >
                          {message.sources
                            .filter(s => s.url && s.url.startsWith('http'))
                            .map((source, i) => {
                              let domain = "Référence Médicale";
                              try {
                                domain = new URL(source.url).hostname.replace('www.', '');
                              } catch (e) {}
                              
                              return (
                                <a
                                  key={i}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-indigo-400 hover:shadow-indigo-500/10 hover:shadow-xl transition-all cursor-pointer group no-underline"
                                >
                                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <ExternalLink size={14} />
                                  </div>

                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[12px] font-bold text-slate-700 truncate" title={source.name}>
                                      {source.name}
                                    </span>

                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                                      Source : {domain}
                                    </span>
                                  </div>
                                </a>
                              );
                            })}
                        </motion.div>
                      )}

                    {/* TIME */}
                    <div className="mt-3 flex items-center gap-3 px-1">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={12} />
                        {message.timestamp}
                      </span>
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white border border-slate-200 shadow-sm">
                      <User className="w-6 h-6 text-indigo-600" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* LOADING */}
            {loading && (
              <motion.div
                initial={{
                  opacity: 0,
                  x: -10,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                className="flex gap-5"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-600 shadow-lg shadow-indigo-500/20 animate-pulse">
                  <Bot className="w-6 h-6 text-white" />
                </div>

                <div className="bg-white border border-slate-100 p-6 rounded-[28px] rounded-tl-none shadow-sm flex items-center gap-4">
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          y: [0, -8, 0],
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                        className="w-2.5 h-2.5 rounded-full bg-indigo-500"
                      />
                    ))}
                  </div>

                  <span className="text-sm font-bold text-indigo-500 italic tracking-tight">
                    Analyse clinique en cours...
                  </span>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-0 bg-transparent pointer-events-none z-50">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="relative flex items-center group shadow-[0_20px_70px_rgba(79,70,229,0.15)] rounded-[32px] bg-white/95 backdrop-blur-md border border-slate-100/50">
              <input
                value={input}
                onChange={(e) =>
                  setInput(e.target.value)
                }
                onKeyDown={(e) =>
                  e.key === 'Enter' && handleSend()
                }
                placeholder="Décrivez un symptôme ou posez une question technique..."
                className="w-full h-16 pl-8 pr-16 bg-transparent border-none focus:outline-none transition-all text-slate-700 font-semibold placeholder:text-slate-400 text-base"
              />

              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className={`absolute right-2.5 w-12 h-12 flex items-center justify-center transition-all shadow-xl active:scale-90 ${
                  input.trim() && !loading
                    ? 'bg-indigo-600 text-white shadow-indigo-500/30 hover:scale-105 hover:bg-indigo-700'
                    : 'bg-slate-200 text-slate-400'
                }`}
                style={{
                  borderRadius: '24px',
                }}
              >
                <Send size={22} />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-center opacity-40">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 py-1">
                <AlertCircle
                  size={12}
                  className="text-slate-400"
                />

                Vérification clinique requise par un
                professionnel de santé
              </div>
            </div>
          </div>
        </div>

        {/* SCROLLBAR */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              ::-webkit-scrollbar {
                width: 6px;
              }

              ::-webkit-scrollbar-track {
                background: transparent;
              }

              ::-webkit-scrollbar-thumb {
                background: #E2E8F0;
                border-radius: 10px;
              }

              ::-webkit-scrollbar-thumb:hover {
                background: #CBD5E1;
              }
            `,
          }}
        />
      </div>
    </DashboardLayout>
  );
}