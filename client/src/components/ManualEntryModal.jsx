import React, { useState, useCallback } from 'react';

const NODE_TYPES = [
  { value:'activity',  label:'Actividad' },
  { value:'sap',       label:'SAP' },
  { value:'decision',  label:'Decisión' },
  { value:'document',  label:'Documento' },
  { value:'milestone', label:'Hito' },
  { value:'start',     label:'Inicio' },
  { value:'end',       label:'Fin' },
];

const TYPE_COLORS = {
  activity: '#0083BE', sap: '#16A34A', decision: '#F47920',
  document: '#94A3B8', milestone: '#0083BE', start: '#0083BE', end: '#0083BE',
};

const PHASE_COLORS = ['#0083BE','#F47920','#16A34A','#7C3AED','#EF4444'];

function uid(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

function buildProcess({ title, subtitle, lanes, phases, nodes }) {
  if (!title.trim() || !lanes.length || !phases.length || !nodes.length) return null;

  // Build edges: connect nodes sequentially within each lane group,
  // then connect last node of each phase to first node of next phase (across lanes)
  const validNodes = nodes.filter(n => n.label.trim() && n.laneId && n.phaseId);
  if (!validNodes.length) return null;

  // Ensure start and end nodes
  const hasStart = validNodes.some(n => n.type === 'start');
  const hasEnd   = validNodes.some(n => n.type === 'end');

  const finalNodes = [
    ...(hasStart ? [] : [{ id: uid('n'), type:'start', label:'Inicio', sublabel:null, laneId: validNodes[0].laneId, phaseId: phases[0].id, color:'#0083BE', badge:null }]),
    ...validNodes.map(n => ({ ...n, color: n.color || TYPE_COLORS[n.type] || '#0083BE', badge:null })),
    ...(hasEnd   ? [] : [{ id: uid('n'), type:'end',   label:'Fin',    sublabel:null, laneId: validNodes[validNodes.length-1].laneId, phaseId: phases[phases.length-1].id, color:'#0083BE', badge:null }]),
  ];

  // Sequential edges
  const edges = [];
  for (let i = 0; i < finalNodes.length - 1; i++) {
    const from = finalNodes[i];
    const to   = finalNodes[i + 1];
    const crossLane = from.laneId !== to.laneId;
    if (from.type === 'decision') {
      edges.push({ from: from.id, to: to.id, label: 'Sí', style: crossLane ? 'dashed':'solid', color: from.color, loop:false });
      // No branch since we don't have info — user can refine
    } else {
      edges.push({ from: from.id, to: to.id, label: null, style: crossLane ? 'dashed':'solid', color: from.color, loop:false });
    }
  }

  return {
    title: title.trim(),
    subtitle: subtitle.trim() || '',
    phases: phases.map((p, i) => ({ id: p.id, label: p.label.trim() || `FASE ${i+1}`, color: PHASE_COLORS[i % PHASE_COLORS.length] })),
    lanes: lanes.map(l => ({ id: l.id, label: l.label.trim() || 'Actor', sublabel: l.sublabel.trim() || null, icon: l.icon || '👤' })),
    nodes: finalNodes,
    edges,
    notes: [],
  };
}

export default function ManualEntryModal({ onBuild, onClose }) {
  const [title,    setTitle]    = useState('');
  const [subtitle, setSubtitle] = useState('');

  const [lanes, setLanes] = useState([
    { id: uid('lane'), label: '', sublabel: '', icon: '👤' },
  ]);
  const [phases, setPhases] = useState([
    { id: uid('fase'), label: '' },
    { id: uid('fase'), label: '' },
  ]);
  const [nodes, setNodes] = useState([
    { id: uid('n'), type:'start',    label:'Inicio', sublabel:'', laneId:'', phaseId:'' },
    { id: uid('n'), type:'activity', label:'',       sublabel:'', laneId:'', phaseId:'' },
    { id: uid('n'), type:'end',      label:'Fin',    sublabel:'', laneId:'', phaseId:'' },
  ]);

  const [error, setError] = useState('');

  // ── Lanes ─────────────────────────────────────────────────────────────────
  const addLane  = () => setLanes(prev => [...prev, { id: uid('lane'), label:'', sublabel:'', icon:'👤' }]);
  const delLane  = (id) => setLanes(prev => prev.filter(l => l.id !== id));
  const setLane  = (id, field, val) => setLanes(prev => prev.map(l => l.id===id ? {...l,[field]:val} : l));

  // ── Phases ────────────────────────────────────────────────────────────────
  const addPhase = () => setPhases(prev => [...prev, { id: uid('fase'), label:'' }]);
  const delPhase = (id) => setPhases(prev => prev.filter(p => p.id !== id));
  const setPhase = (id, val) => setPhases(prev => prev.map(p => p.id===id ? {...p, label:val} : p));

  // ── Nodes ─────────────────────────────────────────────────────────────────
  const addNode  = () => setNodes(prev => [...prev, { id: uid('n'), type:'activity', label:'', sublabel:'', laneId: lanes[0]?.id||'', phaseId: phases[0]?.id||'' }]);
  const delNode  = (id) => setNodes(prev => prev.filter(n => n.id !== id));
  const setNode  = (id, field, val) => setNodes(prev => prev.map(n => n.id===id ? {...n,[field]:val} : n));
  const moveNode = (id, dir) => setNodes(prev => {
    const i = prev.findIndex(n => n.id === id);
    if (dir === -1 && i === 0) return prev;
    if (dir ===  1 && i === prev.length-1) return prev;
    const arr = [...prev];
    [arr[i], arr[i+dir]] = [arr[i+dir], arr[i]];
    return arr;
  });

  const handleBuild = useCallback(() => {
    setError('');
    if (!title.trim()) { setError('El título es obligatorio.'); return; }
    if (!lanes.some(l => l.label.trim())) { setError('Agrega al menos un actor con nombre.'); return; }
    if (!phases.some(p => p.label.trim())) { setError('Agrega al menos una fase con nombre.'); return; }
    if (!nodes.some(n => n.label.trim())) { setError('Agrega al menos un nodo con texto.'); return; }

    const nodesWithDefaults = nodes.map(n => ({
      ...n,
      laneId:  n.laneId  || lanes[0]?.id  || '',
      phaseId: n.phaseId || phases[0]?.id || '',
    }));

    const process = buildProcess({ title, subtitle, lanes, phases, nodes: nodesWithDefaults });
    if (!process) { setError('No se pudo construir el diagrama. Revisa los campos.'); return; }
    onBuild(process);
    onClose();
  }, [title, subtitle, lanes, phases, nodes, onBuild, onClose]);

  const fieldStyle = {
    padding:'6px 9px', fontSize:12, border:'1px solid #e2e8f0', borderRadius:7,
    fontFamily:'IBM Plex Sans', color:'#0f172a', outline:'none', background:'#fff',
    boxSizing:'border-box',
  };

  const labelStyle = {
    fontSize:10, fontWeight:700, color:'#64748b', fontFamily:'IBM Plex Mono',
    letterSpacing:'0.05em', marginBottom:4, display:'block',
  };

  const sectionStyle = {
    background:'#f8fafc', borderRadius:10, padding:'12px 14px', border:'1px solid #e2e8f0',
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)',
      zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background:'#fff', borderRadius:16, boxShadow:'0 24px 64px rgba(0,0,0,0.2)',
        width:'100%', maxWidth:700, maxHeight:'90vh', display:'flex', flexDirection:'column',
        fontFamily:'IBM Plex Sans, sans-serif', overflow:'hidden',
      }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #e2e8f0', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#0f172a' }}>✏️ Entrada manual</div>
            <div style={{ fontSize:11, color:'#94a3b8', fontFamily:'IBM Plex Mono', marginTop:2 }}>Arma el diagrama sin IA — define actores, fases y nodos</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8', padding:4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:16, flex:1 }}>

          {/* Title */}
          <div style={sectionStyle}>
            <label style={labelStyle}>TÍTULO DEL PROCESO</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="ej. Proceso de Capitalización de Activos Fijos"
              style={{ ...fieldStyle, width:'100%' }}
              onFocus={e => e.target.style.borderColor='#0083BE'} onBlur={e => e.target.style.borderColor='#e2e8f0'}
            />
            <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Subtítulo opcional (área, sistema, periodicidad)"
              style={{ ...fieldStyle, width:'100%', marginTop:6 }}
              onFocus={e => e.target.style.borderColor='#0083BE'} onBlur={e => e.target.style.borderColor='#e2e8f0'}
            />
          </div>

          {/* Lanes */}
          <div style={sectionStyle}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ ...labelStyle, marginBottom:0 }}>ACTORES (LANES)</label>
              <button onClick={addLane} style={{ fontSize:11, color:'#0083BE', background:'none', border:'1px solid #bae6fd', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontFamily:'IBM Plex Sans' }}>+ Actor</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {lanes.map(lane => (
                <div key={lane.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 50px 32px', gap:6, alignItems:'center' }}>
                  <input value={lane.label} onChange={e => setLane(lane.id,'label',e.target.value)} placeholder="Nombre del actor"
                    style={fieldStyle} onFocus={e=>e.target.style.borderColor='#0083BE'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}
                  />
                  <input value={lane.sublabel} onChange={e => setLane(lane.id,'sublabel',e.target.value)} placeholder="Área / sistema"
                    style={fieldStyle} onFocus={e=>e.target.style.borderColor='#0083BE'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}
                  />
                  <input value={lane.icon} onChange={e => setLane(lane.id,'icon',e.target.value)} placeholder="👤"
                    style={{ ...fieldStyle, textAlign:'center', fontSize:16 }}
                  />
                  <button onClick={() => delLane(lane.id)} disabled={lanes.length <= 1}
                    style={{ padding:6, background:'none', border:'1px solid #fecaca', borderRadius:6, cursor:lanes.length<=1?'not-allowed':'pointer', color:'#ef4444', fontSize:14, opacity:lanes.length<=1?0.4:1 }}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Phases */}
          <div style={sectionStyle}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ ...labelStyle, marginBottom:0 }}>FASES</label>
              <button onClick={addPhase} style={{ fontSize:11, color:'#0083BE', background:'none', border:'1px solid #bae6fd', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontFamily:'IBM Plex Sans' }}>+ Fase</button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {phases.map((phase, idx) => (
                <div key={phase.id} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background: PHASE_COLORS[idx % PHASE_COLORS.length], flexShrink:0 }}/>
                  <input value={phase.label} onChange={e => setPhase(phase.id, e.target.value)}
                    placeholder={`Fase ${idx+1}`}
                    style={{ ...fieldStyle, width:160 }}
                    onFocus={e=>e.target.style.borderColor='#0083BE'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}
                  />
                  <button onClick={() => delPhase(phase.id)} disabled={phases.length <= 1}
                    style={{ padding:'4px 6px', background:'none', border:'none', cursor:phases.length<=1?'not-allowed':'pointer', color:'#ef4444', opacity:phases.length<=1?0.3:0.7, fontSize:12 }}
                  >✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Nodes */}
          <div style={sectionStyle}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div>
                <label style={{ ...labelStyle, marginBottom:0 }}>NODOS (en orden de flujo)</label>
                <div style={{ fontSize:10, color:'#94a3b8', fontFamily:'IBM Plex Mono', marginTop:2 }}>Ordénalos de arriba a abajo según el flujo del proceso</div>
              </div>
              <button onClick={addNode} style={{ fontSize:11, color:'#0083BE', background:'none', border:'1px solid #bae6fd', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontFamily:'IBM Plex Sans', flexShrink:0 }}>+ Nodo</button>
            </div>

            {/* Header row */}
            <div style={{ display:'grid', gridTemplateColumns:'90px 110px 110px 1fr 80px', gap:6, marginBottom:4, padding:'0 2px' }}>
              {['TIPO','ACTOR','FASE','TEXTO',''].map(h => (
                <div key={h} style={{ fontSize:9, fontWeight:700, color:'#94a3b8', fontFamily:'IBM Plex Mono', letterSpacing:'0.05em' }}>{h}</div>
              ))}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {nodes.map((node, idx) => (
                <div key={node.id} style={{ display:'grid', gridTemplateColumns:'90px 110px 110px 1fr 80px', gap:6, alignItems:'center' }}>
                  {/* Type */}
                  <select value={node.type} onChange={e => setNode(node.id,'type',e.target.value)}
                    style={{ ...fieldStyle, padding:'5px 6px', fontSize:11 }}
                  >
                    {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>

                  {/* Lane */}
                  <select value={node.laneId} onChange={e => setNode(node.id,'laneId',e.target.value)}
                    style={{ ...fieldStyle, padding:'5px 6px', fontSize:11 }}
                  >
                    <option value="">— actor —</option>
                    {lanes.map(l => <option key={l.id} value={l.id}>{l.label || '(sin nombre)'}</option>)}
                  </select>

                  {/* Phase */}
                  <select value={node.phaseId} onChange={e => setNode(node.id,'phaseId',e.target.value)}
                    style={{ ...fieldStyle, padding:'5px 6px', fontSize:11 }}
                  >
                    <option value="">— fase —</option>
                    {phases.map(p => <option key={p.id} value={p.id}>{p.label || '(sin nombre)'}</option>)}
                  </select>

                  {/* Label */}
                  <input value={node.label} onChange={e => setNode(node.id,'label',e.target.value)}
                    placeholder="Texto del paso..."
                    style={{ ...fieldStyle }}
                    onFocus={e=>e.target.style.borderColor='#0083BE'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}
                  />

                  {/* Actions */}
                  <div style={{ display:'flex', gap:3 }}>
                    <button onClick={() => moveNode(node.id,-1)} disabled={idx===0} title="Subir"
                      style={{ padding:'4px 6px', background:'#f1f5f9', border:'none', borderRadius:5, cursor:idx===0?'not-allowed':'pointer', color:'#475569', fontSize:11, opacity:idx===0?0.3:1 }}
                    >↑</button>
                    <button onClick={() => moveNode(node.id,1)} disabled={idx===nodes.length-1} title="Bajar"
                      style={{ padding:'4px 6px', background:'#f1f5f9', border:'none', borderRadius:5, cursor:idx===nodes.length-1?'not-allowed':'pointer', color:'#475569', fontSize:11, opacity:idx===nodes.length-1?0.3:1 }}
                    >↓</button>
                    <button onClick={() => delNode(node.id)} disabled={nodes.length<=1} title="Eliminar"
                      style={{ padding:'4px 6px', background:'none', border:'1px solid #fecaca', borderRadius:5, cursor:nodes.length<=1?'not-allowed':'pointer', color:'#ef4444', fontSize:11, opacity:nodes.length<=1?0.3:1 }}
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:'#fff5f5', border:'1px solid #fecaca', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#ef4444', fontFamily:'IBM Plex Sans' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 20px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose}
            style={{ padding:'9px 18px', borderRadius:9, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'IBM Plex Sans' }}
          >
            Cancelar
          </button>
          <button onClick={handleBuild}
            style={{ padding:'9px 22px', borderRadius:9, border:'none', background:'#0083BE', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'IBM Plex Sans', display:'flex', alignItems:'center', gap:6 }}
            onMouseEnter={e => e.currentTarget.style.background='#006fa0'}
            onMouseLeave={e => e.currentTarget.style.background='#0083BE'}
          >
            Generar diagrama →
          </button>
        </div>
      </div>
    </div>
  );
}
