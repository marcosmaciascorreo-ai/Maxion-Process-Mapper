import React, { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'Proceso de depreciación mensual con AFAB en SAP',
  'Capitalización de activo fijo desde CIP con KO88',
  'Proceso de baja de activo fijo con ABAVN',
  'Solicitud de CAPEX con aprobación gerencial',
  'Proceso de alta de activo fijo con AS01',
];

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#0083BE',
            animation: `typingDot 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes typingDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: '8px' }}
    >
      {!isUser && (
        <div
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0083BE, #005f8c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 2,
          }}
        >
          <span style={{ color: 'white', fontWeight: 700, fontSize: 10, fontFamily: 'IBM Plex Mono' }}>AI</span>
        </div>
      )}
      <div
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily: 'IBM Plex Sans',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser ? '#0083BE' : '#fff',
          color: isUser ? '#fff' : '#1e293b',
          border: isUser ? 'none' : '1px solid #e2e8f0',
          boxShadow: isUser ? '0 2px 8px rgba(0,131,190,0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {msg.loading ? <TypingDots /> : msg.content}
        {msg.type === 'success' && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>✓</span> Diagrama generado
          </div>
        )}
      </div>
      {isUser && (
        <div
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 2,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', fontFamily: 'IBM Plex Mono' }}>Tú</span>
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ onGenerate, onRefine, loading, currentProcess }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de mapeo de procesos Maxion.\n\nDescribe el proceso que deseas mapear y generaré un diagrama swimlane automáticamente con los colores corporativos.\n\nUsa las sugerencias rápidas o escribe tu propia descripción.',
    }
  ]);
  const [isRefinement, setIsRefinement] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentProcess) setIsRefinement(true);
  }, [currentProcess]);

  const addLoadingMsg = () => {
    setMessages(prev => [...prev, { role: 'assistant', loading: true, content: '' }]);
  };

  const replaceLastMsg = (msg) => {
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = msg;
      return updated;
    });
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    addLoadingMsg();

    try {
      let result;
      if (isRefinement && currentProcess) {
        result = await onRefine(text, currentProcess);
      } else {
        result = await onGenerate(text);
      }

      if (result) {
        replaceLastMsg({
          role: 'assistant',
          type: 'success',
          content: `Diagrama generado: "${result.title}"\n\n${result.nodes?.length || 0} pasos · ${result.lanes?.length || 0} actores · ${result.phases?.length || 0} fases`,
        });
        setIsRefinement(true);
      }
    } catch (err) {
      replaceLastMsg({
        role: 'assistant',
        type: 'error',
        content: `Error: ${err.message}`,
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleNewProcess = () => {
    setIsRefinement(false);
    setMessages([{
      role: 'assistant',
      content: 'Listo para un nuevo proceso. Descríbelo en lenguaje natural.',
    }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRight: '1px solid #e2e8f0' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #0083BE, #005f8c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 11, fontFamily: 'IBM Plex Mono' }}>AI</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'IBM Plex Sans' }}>Chat del Proceso</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'IBM Plex Mono' }}>GPT-4o · Maxion Wheels</div>
          </div>
        </div>
        {isRefinement && (
          <button
            onClick={handleNewProcess}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20,
              border: '1px solid #e2e8f0', color: '#64748b',
              background: '#f8fafc', cursor: 'pointer',
              fontFamily: 'IBM Plex Sans',
            }}
          >
            + Nuevo
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      {!isRefinement && (
        <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600, fontFamily: 'IBM Plex Mono', letterSpacing: '0.5px' }}>
            SUGERENCIAS RÁPIDAS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                style={{
                  textAlign: 'left', fontSize: 11.5, padding: '5px 12px',
                  borderRadius: 16, border: '1px solid #e2e8f0',
                  color: '#475569', background: '#f8fafc', cursor: 'pointer',
                  fontFamily: 'IBM Plex Sans', transition: 'all 0.15s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#0083BE';
                  e.currentTarget.style.background = '#eff8ff';
                  e.currentTarget.style.color = '#0083BE';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Refine hint */}
      {isRefinement && currentProcess && (
        <div style={{ padding: '0 12px 6px', flexShrink: 0 }}>
          <div style={{
            fontSize: 11, color: '#64748b', background: '#f8fafc',
            borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0',
            fontFamily: 'IBM Plex Sans',
          }}>
            💡 <strong>Refinar:</strong> "Agrega paso de aprobación", "Cambia el actor X", "Añade ruta de excepción"...
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '8px 12px 12px', flexShrink: 0 }}>
        <div style={{
          border: '1px solid #cbd5e1', borderRadius: 14,
          overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          background: '#fff',
        }}
          onFocus={() => {}}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRefinement
                ? 'Refina el diagrama: "Agrega un paso de revisión antes del paso 3"...'
                : 'Describe el proceso en lenguaje natural...'
            }
            rows={3}
            disabled={loading}
            style={{
              width: '100%', padding: '10px 12px',
              fontSize: 13, resize: 'none',
              border: 'none', outline: 'none',
              background: '#fff', color: '#0f172a',
              fontFamily: 'IBM Plex Sans',
              lineHeight: 1.5,
            }}
          />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', background: '#f8fafc', borderTop: '1px solid #f1f5f9',
          }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'IBM Plex Mono' }}>
              Enter = enviar · Shift+Enter = nueva línea
            </span>
            <button
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              style={{
                padding: '6px 16px',
                background: loading || !input.trim() ? '#94a3b8' : '#0083BE',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'IBM Plex Sans', transition: 'background 0.15s',
                opacity: loading || !input.trim() ? 0.6 : 1,
              }}
            >
              {loading ? '...' : isRefinement ? 'Refinar' : 'Generar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
