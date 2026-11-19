import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquareText,
  X,
  RotateCcw,
  Send,
  ChevronRight,
  ArrowLeft,
  Home,
  GraduationCap,
  Building2,
  Globe,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Search,
  Lightbulb,
} from 'lucide-react';
import {
  CHATBOT_PROFILES,
  resolveBotForPathname,
  searchBotKnowledge,
  type ChatbotId,
  type ChatbotNode,
  type ChatbotOption,
} from '../data/chatbot';
import { contactInfo } from '../data';
import { useAuth } from '../lib/auth';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  node?: ChatbotNode;
  customOptions?: ChatbotOption[];
  timestamp: string;
}

type ThreadMap = Record<ChatbotId, ChatMessage[]>;
type CurrentNodeMap = Record<ChatbotId, string>;

function nowTime(): string {
  return new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function createInitialBotMessage(botId: ChatbotId, userFirstName?: string): ChatMessage {
  const profile = CHATBOT_PROFILES[botId];
  const root = profile.nodes[profile.rootNodeId];
  const personalPrefix = userFirstName ? `${userFirstName}, ` : '';
  return {
    id: `init-${botId}-${Date.now()}`,
    sender: 'bot',
    text: userFirstName
      ? `¡Hola ${personalPrefix}bienvenido! ${root.message.replace(/^¡Hola!\s*/i, '')}`
      : root.message,
    node: root,
    timestamp: nowTime(),
  };
}

function getBotIcon(botId: ChatbotId, size = 18) {
  if (botId === 'academy') return <GraduationCap size={size} />;
  if (botId === 'platform') return <Building2 size={size} />;
  return <Globe size={size} />;
}

export default function SumakChatbotWidget() {
  const location = useLocation();
  const { profile } = useAuth();
  const userFirstName = profile?.nombre_completo?.trim().split(/\s+/)[0];

  const routeBotId = useMemo(() => resolveBotForPathname(location.pathname), [location.pathname]);

  const [activeBotId, setActiveBotId] = useState<ChatbotId>(routeBotId);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [threads, setThreads] = useState<ThreadMap>(() => ({
    web: [createInitialBotMessage('web', userFirstName)],
    platform: [createInitialBotMessage('platform', userFirstName)],
    academy: [createInitialBotMessage('academy', userFirstName)],
  }));

  const [currentNodeIds, setCurrentNodeIds] = useState<CurrentNodeMap>({
    web: CHATBOT_PROFILES.web.rootNodeId,
    platform: CHATBOT_PROFILES.platform.rootNodeId,
    academy: CHATBOT_PROFILES.academy.rootNodeId,
  });

  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Sincronizar automáticamente el bot activo cuando cambia la sección/ruta de la app
  useEffect(() => {
    setActiveBotId(routeBotId);
  }, [routeBotId]);

  // Auto-scroll al último mensaje cuando hay nueva interacción
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [threads, activeBotId, isOpen, isTyping]);

  const activeProfile = CHATBOT_PROFILES[activeBotId];
  const activeMessages = threads[activeBotId] ?? [];
  const currentNode = activeProfile.nodes[currentNodeIds[activeBotId]] ?? activeProfile.nodes[activeProfile.rootNodeId];

  // Sugerencias instantáneas al escribir en el buscador del chat
  const liveSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    return searchBotKnowledge(activeProfile, inputValue, 4);
  }, [activeProfile, inputValue]);

  function pushNodeTransition(targetNodeId: string, userLabel?: string) {
    const targetNode = activeProfile.nodes[targetNodeId];
    if (!targetNode) return;

    const botSnapshot = activeBotId;

    if (userLabel) {
      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'user',
        text: userLabel,
        timestamp: nowTime(),
      };
      setThreads((prev) => ({
        ...prev,
        [botSnapshot]: [...prev[botSnapshot], userMsg],
      }));
    }

    setIsTyping(true);
    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: 'bot',
        text: targetNode.message,
        node: targetNode,
        timestamp: nowTime(),
      };
      setThreads((prev) => ({
        ...prev,
        [botSnapshot]: [...prev[botSnapshot], botMsg],
      }));
      setCurrentNodeIds((prev) => ({
        ...prev,
        [botSnapshot]: targetNode.id,
      }));
      setIsTyping(false);
    }, 180);
  }

  function handleOptionClick(opt: ChatbotOption) {
    setInputValue('');
    pushNodeTransition(opt.targetNodeId, opt.label);
  }

  function handleResetConversation() {
    setInputValue('');
    const rootId = activeProfile.rootNodeId;
    setCurrentNodeIds((prev) => ({ ...prev, [activeBotId]: rootId }));
    setThreads((prev) => ({
      ...prev,
      [activeBotId]: [createInitialBotMessage(activeBotId, userFirstName)],
    }));
  }

  function handleGoBack() {
    if (currentNode.parentNodeId) {
      pushNodeTransition(currentNode.parentNodeId, 'Volver al menú anterior');
    } else if (currentNode.id !== activeProfile.rootNodeId) {
      pushNodeTransition(activeProfile.rootNodeId, 'Ir al Menú Principal');
    }
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    const botSnapshot = activeBotId;
    const matches = searchBotKnowledge(activeProfile, query, 4);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: nowTime(),
    };

    setThreads((prev) => ({
      ...prev,
      [botSnapshot]: [...prev[botSnapshot], userMsg],
    }));
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      if (matches.length > 0 && (matches.length === 1 || matches[0].score >= matches[1].score + 6 || matches[0].score >= 22)) {
        const best = matches[0].node;
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: best.message,
          node: best,
          timestamp: nowTime(),
        };
        setThreads((prev) => ({
          ...prev,
          [botSnapshot]: [...prev[botSnapshot], botMsg],
        }));
        setCurrentNodeIds((prev) => ({
          ...prev,
          [botSnapshot]: best.id,
        }));
      } else if (matches.length > 0) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `Encontré estos temas relacionados con "${query}". Elige la opción que deseas consultar:`,
          customOptions: [
            ...matches.map((m) => ({
              label: m.node.title,
              targetNodeId: m.node.id,
              badge: m.node.category,
            })),
            { label: 'Volver al Menú Principal', targetNodeId: activeProfile.rootNodeId },
          ],
          timestamp: nowTime(),
        };
        setThreads((prev) => ({
          ...prev,
          [botSnapshot]: [...prev[botSnapshot], botMsg],
        }));
      } else {
        const rootNode = activeProfile.nodes[activeProfile.rootNodeId];
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `No encontré una coincidencia exacta para "${query}" en este asistente. Selecciona una categoría del menú o escribe una palabra clave (ej. precios, packs, comisiones, diploma, transferencia):`,
          customOptions: rootNode.options,
          timestamp: nowTime(),
        };
        setThreads((prev) => ({
          ...prev,
          [botSnapshot]: [...prev[botSnapshot], botMsg],
        }));
      }
      setIsTyping(false);
    }, 200);
  }

  // Último conjunto de opciones visibles al pie de la conversación
  const latestMessage = activeMessages[activeMessages.length - 1];
  const latestOptions: ChatbotOption[] =
    latestMessage?.sender === 'bot'
      ? latestMessage.customOptions ?? latestMessage.node?.options ?? activeProfile.nodes[activeProfile.rootNodeId].options
      : [];

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end font-sans print:hidden">
      {/* ── VENTANA EXPANDIDA DEL CHATBOT ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`mb-3 flex flex-col bg-white rounded-3xl border border-[#C8D8CB] shadow-[0_24px_70px_rgba(7,29,15,0.28)] overflow-hidden transition-all duration-200 ${
              isExpanded
                ? 'w-[calc(100vw-24px)] sm:w-[500px] h-[82vh] sm:h-[680px] max-h-[calc(100vh-100px)]'
                : 'w-[calc(100vw-24px)] sm:w-[405px] h-[78vh] sm:h-[590px] max-h-[calc(100vh-100px)]'
            }`}
          >
            {/* Header con Selector de los 3 Bots */}
            <div className={`bg-gradient-to-br ${activeProfile.accentGradient} text-white px-4 pt-3.5 pb-3 shrink-0 relative overflow-hidden`}>
              <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[#D4AF37]/20 blur-2xl" />

              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-[#E8C94A] shrink-0 shadow-sm relative">
                    {getBotIcon(activeBotId, 20)}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0B2913]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-heading font-extrabold text-sm leading-tight truncate">
                        {activeProfile.name}
                      </h2>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#D4AF37] text-[#071D0F] shrink-0">
                        24/7
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-100/75 truncate mt-0.5">
                      {activeProfile.roleTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetConversation}
                    title="Reiniciar conversación al menú principal"
                    className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition cursor-pointer"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpanded((e) => !e)}
                    title={isExpanded ? 'Tamaño compacto' : 'Ampliar ventana'}
                    className="hidden sm:flex p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition cursor-pointer"
                  >
                    {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Minimizar asistente"
                    className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition cursor-pointer"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Selector de los 3 Bots Especializados */}
              <div className="relative z-10 mt-3 grid grid-cols-3 gap-1 bg-black/30 p-1 rounded-2xl border border-white/10">
                {(['web', 'platform', 'academy'] as ChatbotId[]).map((id) => {
                  const prof = CHATBOT_PROFILES[id];
                  const isActive = activeBotId === id;
                  const isRouteRecommended = routeBotId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setActiveBotId(id);
                        setInputValue('');
                      }}
                      className={`relative flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white text-[#0B2913] shadow-sm'
                          : 'text-white/75 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {getBotIcon(id, 13)}
                      <span className="truncate">{prof.shortName}</span>
                      {isRouteRecommended && !isActive && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0"
                          title="Recomendado en esta página"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barra de Ruta + Temas Rápidos */}
            <div className="bg-[#F6FAF7] border-b border-[#DCE7DF] px-3.5 py-2 space-y-2 shrink-0">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  {currentNode.id !== activeProfile.rootNodeId && (
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-[#C8D8CB] text-[#1A4E26] font-bold hover:bg-[#EBF4ED] transition cursor-pointer shrink-0"
                    >
                      <ArrowLeft size={11} /> Atrás
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => pushNodeTransition(activeProfile.rootNodeId, 'Ir al Menú Principal')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-[#C8D8CB] text-slate-700 font-bold hover:text-[#1A4E26] hover:bg-[#EBF4ED] transition cursor-pointer shrink-0"
                  >
                    <Home size={11} /> Menú
                  </button>
                  <span className="text-slate-400 truncate font-medium">
                    · {currentNode.category}
                  </span>
                </div>

                <a
                  href={`https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(`Hola SUMAK, vengo desde el asistente (${activeProfile.shortName}) y necesito atención humana.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 hover:underline shrink-0"
                >
                  WhatsApp <ExternalLink size={10} />
                </a>
              </div>

              {/* Atajos rápidos fijos del bot activo */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {activeProfile.quickTopics.map((qt) => (
                  <button
                    key={qt.nodeId}
                    type="button"
                    onClick={() => pushNodeTransition(qt.nodeId, qt.label)}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-[#1A4E26] text-[#1A4E26] hover:text-white border border-[#C8D8CB] text-[10px] font-bold whitespace-nowrap transition cursor-pointer shrink-0"
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuerpo de Mensajes */}
            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 bg-gradient-to-b from-[#FAFDFB] to-[#F3F7F4]">
              {activeMessages.map((msg) => {
                if (msg.sender === 'user') {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[82%] bg-gradient-to-br from-[#1A4E26] to-[#12381B] text-white px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm">
                        <p className="text-xs sm:text-[13px] font-semibold leading-snug">{msg.text}</p>
                        <p className="text-[9px] text-emerald-100/70 text-right mt-1">{msg.timestamp}</p>
                      </div>
                    </motion.div>
                  );
                }

                const rich = msg.node?.rich;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2"
                  >
                    <div className="w-7 h-7 rounded-xl bg-[#0B2913] text-[#E8C94A] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      {getBotIcon(activeBotId, 14)}
                    </div>

                    <div className="flex-1 min-w-0 bg-white border border-[#DCE7DF] rounded-2xl rounded-tl-sm p-3.5 shadow-[0_4px_14px_rgba(11,41,19,0.05)] space-y-2.5">
                      {/* Header del mensaje */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#1A4E26] bg-[#EBF4ED] px-2 py-0.5 rounded-full">
                          {msg.node?.title || activeProfile.shortName}
                        </span>
                        <span className="text-[9px] text-slate-400">{msg.timestamp}</span>
                      </div>

                      {/* Texto principal */}
                      <p className="text-xs sm:text-[13px] text-[#1F2937] leading-relaxed">
                        {msg.text}
                      </p>

                      {rich?.summary && (
                        <p className="text-[11px] font-bold text-[#1A4E26] bg-[#F4F7F5] px-3 py-1.5 rounded-xl border border-[#DCE7DF]">
                          {rich.summary}
                        </p>
                      )}

                      {/* Tabla de Datos / Precios / Cuentas / Niveles */}
                      {rich?.facts && rich.facts.length > 0 && (
                        <div className="rounded-xl border border-[#DCE7DF] overflow-hidden divide-y divide-[#EEF3EF] bg-[#FAFDFB]">
                          {rich.facts.map((fact, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] ${
                                fact.highlight ? 'bg-[#FEF9EC]' : ''
                              }`}
                            >
                              <span className="font-semibold text-slate-600">{fact.label}</span>
                              <span
                                className={`font-extrabold text-right ${
                                  fact.highlight ? 'text-[#92400E]' : 'text-[#0B2913]'
                                }`}
                              >
                                {fact.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Pasos numerados */}
                      {rich?.steps && rich.steps.length > 0 && (
                        <ol className="space-y-1.5 pt-0.5">
                          {rich.steps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 leading-snug">
                              <span className="w-4 h-4 rounded-full bg-[#1A4E26] text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      )}

                      {/* Bullets con check */}
                      {rich?.bullets && rich.bullets.length > 0 && (
                        <ul className="space-y-1.5 pt-0.5">
                          {rich.bullets.map((b, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-700 leading-snug">
                              <CheckCircle2 size={13} className="text-[#1A4E26] shrink-0 mt-0.5" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Consejo destacado */}
                      {rich?.tip && (
                        <div className="flex items-start gap-2 bg-amber-50/90 border border-amber-200/80 rounded-xl px-2.5 py-2 text-[11px] text-amber-950 leading-snug">
                          <Lightbulb size={13} className="text-amber-600 shrink-0 mt-0.5" />
                          <span>{rich.tip}</span>
                        </div>
                      )}

                      {/* Botones de Acción Directa en la App */}
                      {rich?.actions && rich.actions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {rich.actions.map((act, idx) =>
                            act.external ? (
                              <a
                                key={idx}
                                href={act.to}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5C] text-white text-[11px] font-extrabold shadow-2xs transition"
                              >
                                {act.label} <ExternalLink size={11} />
                              </a>
                            ) : (
                              <Link
                                key={idx}
                                to={act.to}
                                onClick={() => {
                                  if (window.innerWidth < 640) setIsOpen(false);
                                }}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                                  act.variant === 'primary'
                                    ? 'bg-[#1A4E26] hover:bg-[#133B1C] text-white shadow-2xs'
                                    : 'bg-[#EBF4ED] hover:bg-[#D5E8D9] text-[#1A4E26] border border-[#C8D8CB]'
                                }`}
                              >
                                {act.label} <ChevronRight size={12} />
                              </Link>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Indicador de escritura */}
              {isTyping && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#0B2913] text-[#E8C94A] flex items-center justify-center shrink-0">
                    {getBotIcon(activeBotId, 14)}
                  </div>
                  <div className="bg-white border border-[#DCE7DF] rounded-2xl px-3.5 py-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A4E26] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A4E26] animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A4E26] animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}

              {/* Opciones Interactivas del Menú Actual */}
              {!isTyping && latestOptions.length > 0 && (
                <div className="pl-9 space-y-1.5 pt-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Opciones disponibles:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {latestOptions.map((opt, idx) => (
                      <button
                        key={`${opt.targetNodeId}-${idx}`}
                        type="button"
                        onClick={() => handleOptionClick(opt)}
                        className="group w-full text-left flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#1A4E26] text-[#0B2913] hover:text-white border border-[#C8D8CB] hover:border-[#1A4E26] text-xs font-bold shadow-2xs transition-all cursor-pointer"
                      >
                        <span className="flex-1 leading-snug">{opt.label}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {opt.badge && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FEF6E9] text-[#92400E] group-hover:bg-[#D4AF37] group-hover:text-[#071D0F] transition-colors">
                              {opt.badge}
                            </span>
                          )}
                          <ChevronRight
                            size={14}
                            className="text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>

            {/* Sugerencias instantáneas al escribir */}
            {liveSuggestions.length > 0 && (
              <div className="px-3.5 py-2 bg-[#F4F8F5] border-t border-[#DCE7DF] space-y-1 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A4E26] flex items-center gap-1">
                  <Search size={10} /> Coincidencias en la base de respuestas:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {liveSuggestions.map((m) => (
                    <button
                      key={m.node.id}
                      type="button"
                      onClick={() => {
                        setInputValue('');
                        pushNodeTransition(m.node.id, m.node.title);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#1A4E26] text-[#1A4E26] hover:text-white border border-[#C8D8CB] text-[11px] font-bold transition cursor-pointer"
                    >
                      {m.node.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Barra de Escritura / Búsqueda */}
            <form
              onSubmit={handleTextSubmit}
              className="p-3 bg-white border-t border-[#DCE7DF] flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Escribe una palabra clave o duda en ${activeProfile.shortName}...`}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#F4F7F5] border border-[#DCE7DF] focus:bg-white focus:border-[#1A4E26] text-xs text-[#111] placeholder:text-slate-400 outline-none"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="w-9 h-9 rounded-xl bg-[#1A4E26] hover:bg-[#143D1E] text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition cursor-pointer"
                aria-label="Consultar respuesta"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOTÓN FLOTANTE SIEMPRE VISIBLE EN ESQUINA INFERIOR DERECHA ── */}
      <div className="flex items-center gap-2.5">
        <AnimatePresence>
          {!isOpen && showTeaser && (
            <motion.div
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }}
              className="hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#C8D8CB] rounded-2xl pl-3.5 pr-2 py-2 shadow-[0_10px_28px_rgba(7,29,15,0.14)]"
            >
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="text-left cursor-pointer"
              >
                <p className="text-xs font-extrabold text-[#0B2913] leading-tight flex items-center gap-1">
                  <Sparkles size={12} className="text-[#D4AF37]" />
                  {activeProfile.name}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  ¿Necesitas ayuda? Haz clic aquí
                </p>
              </button>
              <button
                type="button"
                onClick={() => setShowTeaser(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Ocultar aviso"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => {
            setIsOpen((o) => !o);
            setShowTeaser(false);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          aria-label={isOpen ? 'Cerrar asistente SUMAK' : `Abrir ${activeProfile.name}`}
          className="relative flex items-center gap-2.5 px-4 py-3 sm:px-4.5 sm:py-3.5 rounded-full bg-gradient-to-br from-[#071D0F] via-[#133F1F] to-[#1A4E26] text-white border border-[#D4AF37]/50 shadow-[0_14px_35px_rgba(7,29,15,0.35)] cursor-pointer group"
        >
          <span className="relative flex items-center justify-center text-[#E8C94A]">
            {isOpen ? <X size={20} /> : <MessageSquareText size={20} />}
          </span>
          <span className="text-xs font-extrabold tracking-tight hidden sm:inline">
            {isOpen ? 'Cerrar' : activeProfile.shortName}
          </span>
          {!isOpen && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-xs">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </span>
          )}
        </motion.button>
      </div>
    </div>
  );
}
