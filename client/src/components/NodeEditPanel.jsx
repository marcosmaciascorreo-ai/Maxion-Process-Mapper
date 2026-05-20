import React, { useState, useEffect, useRef } from 'react';

const NODE_TYPES = [
  { value: 'activity',  label: '▭  Actividad manual' },
  { value: 'sap',       label: '▭  Transacción SAP' },
  { value: 'decision',  label: '◇  Decisión (Sí/No)' },
  { value: 'document',  label: '▭  Documento' },
  { value: 'start',     label: '○  Inicio' },
  { value: 'end',       label: '○  Fin' },
  { value: 'milestone', label: '◆  Hito' },
];

const COLORS = [
  { hex: '#0083BE', label: 'Azul Maxion'  },
  { hex: '#F47920', label: 'Naranja'      },
  { hex: '#16A34A', label: 'Verde SAP'    },
  { hex: '#EF4444', label: 'Rojo Error'   },
  { hex: '#64748B', label: 'Gris'         },
  { hex: '#7C3AED', label: 'Morado'       },
];

const STEP = 10;
const MIN_W = 60;
const MIN_H = 30;

export default function NodeEditPanel({
  node,
  lanes = [],
  phases = [],
  allNodes = [],
  edges = [],
  onUpdate,
  onDelete,
  onAddAfter,
  onUpdateEdges,
  onClose,
  position,
}) {
  const [label,    setLabel]    = useState(node.label    || '');
  const [sublabel, setSublabel] = useState(node.sublabel || '');
  const [type,     setType]     = useState(node.type     || 'activity');
  const [color,    setColor]    = useState(node.color    || '#0083BE');
  const [laneId,   setLaneId]   = useState(node.laneId   || '');
  const [phaseId,  setPhaseId]  = useState(node.phaseId  || '');

  // Decision branches
  const siEdge = edges.find(e => e.from === node.id && e.label === 'Sí');
  const noEdge = edges.find(e => e.from === node.id && e.label === 'No');
  const [siTarget, setSiTarget] = useState(siEdge?.to || '');
  const [noTarget, setNoTarget] = useState(noEdge?.to || '');

  // Size — initialize from layout dims (node.w / node.h come from positionedNodes)
  const autoW = node.w || 155;
  const autoH = node.h || 54;
  const [customW, setCustomW] = useState(node.customW || autoW);
  const [customH, setCustomH] = useState(node.customH || autoH);
  const [sizeReset, setSizeReset] = useState(false); // flag to clear custom dims on save

  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Smart positioning
  const panelW = 288;
  const panelH = 520;
  let left = position.x + 12;
  let top  = position.y - 24;
  if (left + panelW > window.innerWidth  - 8) left = position.x - panelW - 12;
  if (left < 8) left = 8;
  if (top  + panelH > window.innerHeight - 8) top  = window.innerHeight - panelH - 8;
  if (top  < 8) top  = 8;

  const handleSave = () => {
    if (!label.trim()) return;
    onUpdate(node.id, {
      label:    label.trim(),
      sublabel: sublabel.trim() || null,
      type,
      color,
      laneId,
      phaseId,
      customW: sizeReset ? null : (customW !== autoW ? customW : (node.customW || null)),
      customH: sizeReset ? null : (customH !== autoH ? customH : (node.customH || null)),
    });
    // Update decision branches
    if ((type === 'decision' || node.type === 'decision') && onUpdateEdges) {
      const changes = [];
      if (siTarget) changes.push({ from: node.id, label: 'Sí', to: siTarget });
      if (noTarget) changes.push({ from: node.id, label: 'No', to: noTarget });
      if (changes.length) onUpdateEdges(changes);
    }
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar el nodo "${node.label}"?`)) {
      onDelete(node.id); onClose();
    }
  };

  const handleAddAfter = () => { onAddAfter(node.id); onClose(); };

  const handleResetSize = () => {
    setCustomW(autoW);
    setCustomH(autoH);
    setSizeReset(true);
  };

  const isStartEnd = type === 'start' || type === 'end';
  const hasSizeChanged = node.customW || customW !== autoW || customH !== autoH;

  return (
    <div ref={panelRef} style={{
      position:'fixed', left, top, width:panelW,
      background:'#fff', border:'1px solid #e2e8f0', borderRadius:14,
      boxShadow:'0 8px 32px rgba(0,0,0,0.14)', zIndex:1000,
      fontFamily:'IBM Plex Sans, sans-serif', overflow:'hidden',
      animation:'panelIn 0.15s ease-out',
    }}>
      <style>{`@keyframes panelIn { from{opacity:0;transform:scale(0.95) translateY(-4px)} to{opacity:1;transform:scale(1) translateY(0)} }`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px 10px', borderBottom:'1px solid #f1f5f9' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:10, height:10, borderRadius:2, background:color }}/>
          <span style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>Editar nodo</span>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#94a3b8', lineHeight:1, padding:2 }}>✕</button>
      </div>

      <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:10, maxHeight: window.innerHeight - 180, overflowY:'auto' }}>

        {/* Label */}
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4, fontFamily:'IBM Plex Mono' }}>TEXTO PRINCIPAL</label>
          <textarea value={label} onChange={e => setLabel(e.target.value)} rows={2}
            style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #e2e8f0', borderRadius:8, resize:'vertical', fontFamily:'IBM Plex Sans', color:'#0f172a', outline:'none', boxSizing:'border-box' }}
            onFocus={e => e.target.style.borderColor='#0083BE'}
            onBlur={e  => e.target.style.borderColor='#e2e8f0'}
          />
        </div>

        {/* Sublabel */}
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4, fontFamily:'IBM Plex Mono' }}>TEXTO SECUNDARIO (opcional)</label>
          <input value={sublabel} onChange={e => setSublabel(e.target.value)} placeholder="ej. en SAP, mensual..."
            style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #e2e8f0', borderRadius:8, fontFamily:'IBM Plex Sans', color:'#0f172a', outline:'none', boxSizing:'border-box' }}
            onFocus={e => e.target.style.borderColor='#0083BE'}
            onBlur={e  => e.target.style.borderColor='#e2e8f0'}
          />
        </div>

        {/* Type */}
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4, fontFamily:'IBM Plex Mono' }}>TIPO DE NODO</label>
          <select value={type} onChange={e => setType(e.target.value)}
            style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #e2e8f0', borderRadius:8, fontFamily:'IBM Plex Sans', color:'#0f172a', background:'#fff', outline:'none', cursor:'pointer', boxSizing:'border-box' }}
          >
            {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Color */}
        <div>
          <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:6, fontFamily:'IBM Plex Mono' }}>COLOR</label>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
            {COLORS.map(c => (
              <button key={c.hex} title={c.label} onClick={() => setColor(c.hex)} style={{
                width:26, height:26, borderRadius:6, background:c.hex, cursor:'pointer',
                border: color===c.hex ? '3px solid #0f172a' : '2px solid white',
                outline: color===c.hex ? '2px solid '+c.hex : '1px solid #e2e8f0',
                transition:'transform 0.1s', transform: color===c.hex ? 'scale(1.15)' : 'scale(1)',
              }}/>
            ))}
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ width:26, height:26, borderRadius:6, border:'1px solid #e2e8f0', cursor:'pointer', padding:2 }}
              title="Color personalizado"
            />
          </div>
        </div>

        {/* Lane / Phase */}
        {lanes.length > 1 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4, fontFamily:'IBM Plex Mono' }}>ACTOR</label>
              <select value={laneId} onChange={e => setLaneId(e.target.value)}
                style={{ width:'100%', padding:'6px 8px', fontSize:11, border:'1px solid #e2e8f0', borderRadius:8, fontFamily:'IBM Plex Sans', background:'#fff', outline:'none', cursor:'pointer', boxSizing:'border-box' }}
              >
                {lanes.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4, fontFamily:'IBM Plex Mono' }}>FASE</label>
              <select value={phaseId} onChange={e => setPhaseId(e.target.value)}
                style={{ width:'100%', padding:'6px 8px', fontSize:11, border:'1px solid #e2e8f0', borderRadius:8, fontFamily:'IBM Plex Sans', background:'#fff', outline:'none', cursor:'pointer', boxSizing:'border-box' }}
              >
                {phases.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ── Decision branches ────────────────────────────────────────────── */}
        {(type === 'decision' || node.type === 'decision') && allNodes.length > 0 && (
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:8, fontFamily:'IBM Plex Mono' }}>RAMAS DE DECISIÓN</label>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { label:'Sí →', val: siTarget, set: setSiTarget, color:'#16A34A', bg:'#f0fdf4', border:'#bbf7d0' },
                { label:'No →', val: noTarget, set: setNoTarget, color:'#EF4444', bg:'#fff5f5', border:'#fecaca' },
              ].map(({ label: lbl, val, set, color, bg, border }) => (
                <div key={lbl} style={{ display:'flex', alignItems:'center', gap:8, background: bg, border:`1px solid ${border}`, borderRadius:8, padding:'7px 10px' }}>
                  <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'IBM Plex Mono', minWidth:30 }}>{lbl}</span>
                  <select
                    value={val}
                    onChange={e => set(e.target.value)}
                    style={{ flex:1, padding:'5px 8px', fontSize:11, border:'1px solid #e2e8f0', borderRadius:7, fontFamily:'IBM Plex Sans', color:'#0f172a', background:'#fff', outline:'none', cursor:'pointer' }}
                    onFocus={e => e.target.style.borderColor = color}
                    onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                  >
                    <option value="">— seleccionar nodo destino —</option>
                    {allNodes
                      .filter(n => n.id !== node.id)
                      .map(n => (
                        <option key={n.id} value={n.id}>
                          {n.label || `(${n.type})`}
                        </option>
                      ))
                    }
                  </select>
                </div>
              ))}
              <div style={{ fontSize:10, color:'#94a3b8', fontFamily:'IBM Plex Mono' }}>
                Selecciona a qué nodo va cada rama al guardar
              </div>
            </div>
          </div>
        )}

        {/* ── Size controls ─────────────────────────────────────────────────── */}
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748b', fontFamily:'IBM Plex Mono' }}>TAMAÑO</label>
            {hasSizeChanged && !sizeReset && (
              <button onClick={handleResetSize}
                style={{ fontSize:10, color:'#0083BE', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', fontFamily:'IBM Plex Sans' }}
              >
                Auto
              </button>
            )}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { label:'ANCHO', val:customW, set:setCustomW, min:MIN_W },
              { label:'ALTO',  val:customH, set:setCustomH, min:MIN_H },
            ].map(({ label: lbl, val, set, min }) => (
              <div key={lbl}>
                <div style={{ fontSize:10, color:'#94a3b8', marginBottom:3, fontFamily:'IBM Plex Mono' }}>{lbl}</div>
                <div style={{ display:'flex', alignItems:'center', border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                  <button onClick={() => { setSizeReset(false); set(v => Math.max(min, v - STEP)); }}
                    style={{ padding:'5px 9px', background:'#f8fafc', border:'none', cursor:'pointer', color:'#475569', fontSize:15, lineHeight:1, flexShrink:0 }}
                  >−</button>
                  <span style={{ flex:1, textAlign:'center', fontSize:11, fontFamily:'IBM Plex Mono', color:'#0f172a', userSelect:'none' }}>{val}px</span>
                  <button onClick={() => { setSizeReset(false); set(v => v + STEP); }}
                    style={{ padding:'5px 9px', background:'#f8fafc', border:'none', cursor:'pointer', color:'#475569', fontSize:15, lineHeight:1, flexShrink:0 }}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Action buttons */}
      <div style={{ padding:'10px 14px 14px', borderTop:'1px solid #f1f5f9', display:'flex', flexDirection:'column', gap:7 }}>
        <button onClick={handleSave} disabled={!label.trim()} style={{
          width:'100%', padding:'9px', borderRadius:9, border:'none',
          background: label.trim() ? '#0083BE' : '#e2e8f0',
          color: label.trim() ? '#fff' : '#94a3b8',
          fontSize:13, fontWeight:700, cursor: label.trim() ? 'pointer' : 'not-allowed',
          fontFamily:'IBM Plex Sans', transition:'background 0.15s',
        }}>
          Guardar cambios
        </button>

        <div style={{ display:'flex', gap:7 }}>
          <button onClick={handleAddAfter} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid #0083BE', background:'#eff8ff', color:'#0083BE', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'IBM Plex Sans' }}>
            + Agregar después
          </button>
          {!isStartEnd && (
            <button onClick={handleDelete} style={{ flex:1, padding:'7px', borderRadius:9, border:'1px solid #fecaca', background:'#fff5f5', color:'#EF4444', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'IBM Plex Sans' }}>
              🗑 Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
