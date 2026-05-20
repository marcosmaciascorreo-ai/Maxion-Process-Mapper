import React, { useRef, useState, useEffect, useCallback } from 'react';
import { computeLayout, LANE_LABEL_WIDTH, PHASE_BAR_HEIGHT } from '../utils/layoutEngine.js';
import { generateSVG, generatePhaseBar, generateLaneLabels } from '../utils/svgRenderer.js';
import NodeEditPanel from './NodeEditPanel.jsx';

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', textAlign:'center', padding:'0 32px', userSelect:'none' }}>
      <div style={{ width:72, height:72, borderRadius:18, background:'linear-gradient(135deg,#0083BE,#005f8c)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:22, marginBottom:20, boxShadow:'0 8px 28px rgba(0,131,190,0.22)', fontFamily:'IBM Plex Mono' }}>MW</div>
      <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:8, fontFamily:'IBM Plex Sans' }}>Maxion Process Mapper</h2>
      <p style={{ color:'#94a3b8', fontSize:13, maxWidth:300, marginBottom:28, fontFamily:'IBM Plex Sans', lineHeight:1.6 }}>
        Describe un proceso en el chat de la izquierda y la IA generará el diagrama swimlane automáticamente.
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, maxWidth:300, width:'100%' }}>
        {[
          { icon:'🏗️', label:'CIP',           desc:'Construcción en Progreso' },
          { icon:'🏭', label:'Capitalización', desc:'KO88 · KO8G' },
          { icon:'📉', label:'Depreciación',   desc:'AFAB Mensual' },
          { icon:'💰', label:'CAPEX',          desc:'Solicitud y aprobación' },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'#fff', border:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize:18 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#475569' }}>{item.label}</div>
              <div style={{ fontSize:10, color:'#94a3b8' }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:11, color:'#cbd5e1', marginTop:24, fontFamily:'IBM Plex Mono' }}>O carga un proceso demo desde la Biblioteca →</p>
    </div>
  );
}

// ─── Node overlay ─────────────────────────────────────────────────────────────
function NodeOverlay({ node, onSelect, onAddAfter, onDragStart }) {
  const [hovered, setHovered] = useState(false);
  const left = node.cx - LANE_LABEL_WIDTH - node.w / 2;
  const top  = node.cy - PHASE_BAR_HEIGHT - node.h / 2;

  return (
    <div
      data-node-overlay="true"
      style={{
        position:'absolute', left, top, width:node.w, height:node.h,
        borderRadius: node.type === 'decision' ? 0 : 6,
        border: hovered ? `2px solid ${node.color||'#0083BE'}99` : '2px solid transparent',
        boxSizing:'border-box', cursor:'grab', zIndex:10,
        transition:'border-color 0.12s, box-shadow 0.12s',
        boxShadow: hovered ? `0 0 0 3px ${node.color||'#0083BE'}22` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        // Start drag tracking — onDragStart will decide if it's a click or drag
        const rect = e.currentTarget.getBoundingClientRect();
        onDragStart(node, e.clientX, e.clientY, rect);
      }}
    >
      {/* Add after button */}
      <button
        data-node-overlay="true"
        onClick={(e) => { e.stopPropagation(); onAddAfter(node.id); }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position:'absolute', right:-14, top:'50%', transform:'translateY(-50%)',
          width:22, height:22, borderRadius:'50%', background:'#0083BE', color:'#fff',
          border:'2px solid #fff', fontSize:14, lineHeight:'18px', cursor:'pointer', zIndex:20,
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, padding:0,
          opacity: hovered ? 1 : 0.15, transition:'all 0.15s',
          boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity=1; e.currentTarget.style.transform='translateY(-50%) scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity=hovered?1:'0.15'; e.currentTarget.style.transform='translateY(-50%) scale(1)'; }}
        title="Agregar nodo después"
      >+</button>
    </div>
  );
}

// ─── Add node at end of lane ──────────────────────────────────────────────────
function AddLaneNodeButton({ lane, rightmostNode, onAdd }) {
  const [hovered, setHovered] = useState(false);
  if (!rightmostNode) return null;
  const left = rightmostNode.cx - LANE_LABEL_WIDTH + rightmostNode.w / 2 + 12;
  const top  = rightmostNode.cy - PHASE_BAR_HEIGHT - 14;
  return (
    <button data-node-overlay="true"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => onAdd(lane.id, rightmostNode.phaseId, rightmostNode.id)}
      title={`Agregar nodo en ${lane.label}`}
      style={{
        position:'absolute', left, top, width:28, height:28, borderRadius:'50%',
        background: hovered ? '#0083BE' : '#f8fafc',
        border:`2px dashed ${hovered ? '#0083BE' : '#94a3b8'}`,
        color: hovered ? '#fff' : '#94a3b8', fontSize:16, cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:10,
        transition:'all 0.15s', fontWeight:700, padding:0,
        boxShadow: hovered ? '0 2px 8px rgba(0,131,190,0.25)' : 'none',
        opacity: hovered ? 1 : 0.4,
      }}
    >+</button>
  );
}

// ─── Process header ───────────────────────────────────────────────────────────
function ProcessHeader({ process }) {
  if (!process) return null;
  return (
    <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'10px 18px 8px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexShrink:0 }}>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', fontFamily:'IBM Plex Sans', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{process.title}</div>
        {process.subtitle && <div style={{ fontSize:10, color:'#0083BE', fontFamily:'IBM Plex Mono', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{process.subtitle}</div>}
      </div>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        {[['#0083BE','Flujo'],['#F47920','Decisión'],['#16A34A','SAP'],['#EF4444','Error']].map(([color, label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#64748b', fontFamily:'IBM Plex Mono' }}>
            <div style={{ width:8, height:8, borderRadius:2, background:color, flexShrink:0 }}/>{label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers for drag target detection ───────────────────────────────────────
function getLaneAtY(screenY, svgAreaEl, layout, zoom) {
  const rect = svgAreaEl.getBoundingClientRect();
  const relY = (screenY - rect.top) / zoom;
  for (const lane of layout.lanes) {
    const laneTop = lane.top - PHASE_BAR_HEIGHT;
    if (relY >= laneTop && relY < laneTop + lane.height) return lane.id;
  }
  return null;
}

function getPhaseAtX(screenX, svgAreaEl, layout, zoom) {
  const rect = svgAreaEl.getBoundingClientRect();
  const relX = (screenX - rect.left) / zoom;
  for (const phase of layout.phases) {
    const phaseLeft = phase.startX - LANE_LABEL_WIDTH;
    if (relX >= phaseLeft && relX < phaseLeft + phase.width) return phase.id;
  }
  // If past all phases, return last phase
  return layout.phases[layout.phases.length - 1]?.id || null;
}

// ─── Main DiagramCanvas ───────────────────────────────────────────────────────
export default function DiagramCanvas({
  process,
  zoom,
  onZoomIn, onZoomOut, onZoomReset, onSetZoom,
  onUpdateNode, onDeleteNode, onAddNode,
  id = 'diagram-canvas',
}) {
  const containerRef = useRef(null);
  const svgAreaRef   = useRef(null);

  const [isPanning,    setIsPanning]    = useState(false);
  const [panStart,     setPanStart]     = useState({ x:0, y:0, scrollLeft:0, scrollTop:0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [panelPos,     setPanelPos]     = useState({ x:0, y:0 });

  // Drag state
  const [drag, setDrag] = useState(null);
  // drag = { nodeId, nodeLabel, nodeColor, startX, startY, ghostX, ghostY,
  //          targetLaneId, targetPhaseId, isDragging }
  const dragRef = useRef(null); // mirror of drag for event handlers

  const layout = process ? computeLayout(process) : null;

  // Ctrl+scroll zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        onSetZoom(z => Math.min(2.5, Math.max(0.3, +(z + (e.deltaY > 0 ? -0.1 : 0.1)).toFixed(1))));
      }
    };
    el.addEventListener('wheel', handler, { passive:false });
    return () => el.removeEventListener('wheel', handler);
  }, [onSetZoom]);

  // ── Drag handlers (document-level during drag) ───────────────────────────
  useEffect(() => {
    const onMouseMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.isDragging && Math.hypot(dx, dy) < 6) return; // threshold

      const isDragging = true;
      let targetLaneId  = d.targetLaneId;
      let targetPhaseId = d.targetPhaseId;

      if (svgAreaRef.current && layout) {
        targetLaneId  = getLaneAtY(e.clientY, svgAreaRef.current, layout, zoom) || d.targetLaneId;
        targetPhaseId = getPhaseAtX(e.clientX, svgAreaRef.current, layout, zoom) || d.targetPhaseId;
      }

      const updated = { ...d, isDragging, ghostX:e.clientX, ghostY:e.clientY, targetLaneId, targetPhaseId };
      dragRef.current = updated;
      setDrag(updated);
    };

    const onMouseUp = (e) => {
      const d = dragRef.current;
      if (!d) return;

      if (d.isDragging && d.targetLaneId && d.targetPhaseId) {
        // Only move if target differs from source
        const srcNode = process?.nodes?.find(n => n.id === d.nodeId);
        if (srcNode && (srcNode.laneId !== d.targetLaneId || srcNode.phaseId !== d.targetPhaseId)) {
          onUpdateNode(d.nodeId, { laneId: d.targetLaneId, phaseId: d.targetPhaseId });
        }
      } else if (!d.isDragging) {
        // It was a click — open edit panel
        setSelectedNode(d.clickNode);
        setPanelPos(d.clickPos);
      }

      dragRef.current = null;
      setDrag(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };
  }, [layout, zoom, process, onUpdateNode]);

  // ── Pan handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest('[data-node-overlay]')) return;
    setIsPanning(true);
    setPanStart({ x:e.clientX, y:e.clientY, scrollLeft:containerRef.current.scrollLeft, scrollTop:containerRef.current.scrollTop });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    containerRef.current.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
    containerRef.current.scrollTop  = panStart.scrollTop  - (e.clientY - panStart.y);
  }, [isPanning, panStart]);

  const handleMouseUp   = useCallback(() => setIsPanning(false), []);
  const handleCanvasClick = useCallback(() => setSelectedNode(null), []);

  // ── Node drag start ───────────────────────────────────────────────────────
  const handleDragStart = useCallback((node, clientX, clientY, rect) => {
    const d = {
      nodeId:       node.id,
      nodeLabel:    node.label,
      nodeColor:    node.color || '#0083BE',
      startX:       clientX,
      startY:       clientY,
      ghostX:       clientX,
      ghostY:       clientY,
      targetLaneId:  node.laneId,
      targetPhaseId: node.phaseId,
      isDragging:   false,
      // For click detection:
      clickNode: node,
      clickPos:  { x: rect.right, y: rect.top + rect.height / 2 },
    };
    dragRef.current = d;
    setDrag(d);
  }, []);

  const handleAddAfter = useCallback((afterNodeId) => onAddNode(afterNodeId), [onAddNode]);
  const handleAddLaneNode = useCallback((laneId, phaseId, afterNodeId) => onAddNode(afterNodeId), [onAddNode]);

  if (!process || !layout) {
    return <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#f0f4f8' }}><EmptyState /></div>;
  }

  const { svgWidth, nodes: layoutNodes, lanes, phases } = layout;
  const svgStr       = generateSVG(process);
  const phaseBarHtml = generatePhaseBar(layout);
  const labelsHtml   = generateLaneLabels(layout);

  const laneRightmost = {};
  lanes.forEach(lane => {
    const laneNodes = layoutNodes.filter(n => n.laneId === lane.id);
    if (laneNodes.length > 0)
      laneRightmost[lane.id] = laneNodes.reduce((max, n) => n.cx > max.cx ? n : max, laneNodes[0]);
  });

  // Lane highlight during drag
  const dragTargetLane = drag?.isDragging
    ? lanes.find(l => l.id === drag.targetLaneId)
    : null;

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#f0f4f8' }}>
      <ProcessHeader process={process} />

      {/* Drag ghost */}
      {drag?.isDragging && (
        <div style={{
          position:'fixed', left: drag.ghostX - 70, top: drag.ghostY - 18,
          width:140, height:36, borderRadius:8, pointerEvents:'none', zIndex:9999,
          background:`${drag.nodeColor}22`, border:`2px dashed ${drag.nodeColor}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, color: drag.nodeColor, fontFamily:'IBM Plex Sans', fontWeight:600,
          boxShadow:'0 4px 16px rgba(0,0,0,0.15)', backdropFilter:'blur(2px)',
          overflow:'hidden', whiteSpace:'nowrap', padding:'0 8px',
        }}>
          ↕ {drag.nodeLabel?.substring(0,20)}{drag.nodeLabel?.length > 20 ? '…' : ''}
        </div>
      )}

      <div
        ref={containerRef}
        id={id}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        style={{
          flex:1, overflow:'auto', background:'#f0f4f8',
          backgroundImage:'radial-gradient(circle, #dde5ee 1px, transparent 1px)',
          backgroundSize:'20px 20px', padding:16,
          cursor: isPanning ? 'grabbing' : drag?.isDragging ? 'grabbing' : 'grab',
          userSelect:'none',
        }}
      >
        <div style={{ transform:`scale(${zoom})`, transformOrigin:'0 0', transition:'transform 0.1s ease', width:'fit-content', minWidth:`${svgWidth}px` }}>

          <div id="diagram-card-inner" style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', boxShadow:'0 4px 20px rgba(0,0,0,0.07)', overflow:'hidden', minWidth:`${svgWidth}px` }}>

            <div dangerouslySetInnerHTML={{ __html: phaseBarHtml }} />

            <div style={{ display:'flex' }}>
              <div dangerouslySetInnerHTML={{ __html: labelsHtml }} />

              {/* SVG area */}
              <div ref={svgAreaRef} style={{ flex:1, position:'relative', overflow:'visible' }}>
                <div dangerouslySetInnerHTML={{ __html: svgStr }} />

                {/* Lane drop highlight */}
                {dragTargetLane && (
                  <div style={{
                    position:'absolute', left:0, top: dragTargetLane.top - PHASE_BAR_HEIGHT,
                    width:'100%', height: dragTargetLane.height,
                    background:`${drag.nodeColor}12`,
                    border:`2px dashed ${drag.nodeColor}55`,
                    pointerEvents:'none', zIndex:5, borderRadius:4,
                    transition:'top 0.1s, height 0.1s',
                  }}/>
                )}

                {/* Node overlays */}
                {layoutNodes.map(node => (
                  <NodeOverlay key={node.id} node={node}
                    onSelect={(n, pos) => { setSelectedNode(n); setPanelPos(pos); }}
                    onAddAfter={handleAddAfter}
                    onDragStart={handleDragStart}
                  />
                ))}

                {/* Add-node buttons at end of each lane */}
                {lanes.map(lane => laneRightmost[lane.id] ? (
                  <AddLaneNodeButton key={lane.id} lane={lane}
                    rightmostNode={laneRightmost[lane.id]}
                    onAdd={handleAddLaneNode}
                  />
                ) : null)}
              </div>
            </div>
          </div>

          {/* Notes */}
          {process.notes?.length > 0 && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 18px', marginTop:12, display:'flex', gap:20, flexWrap:'wrap', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              {process.notes.map((note, i) => (
                <div key={i} style={{ fontSize:11, color:'#64748b', fontFamily:'IBM Plex Mono,monospace' }}>{note}</div>
              ))}
            </div>
          )}

          {/* Shape legend */}
          <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:10, color:'#94a3b8', fontFamily:'IBM Plex Mono,monospace', padding:'0 4px', flexWrap:'wrap', gap:6 }}>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'center' }}>
              {[
                { svg:<svg width="28" height="14"><ellipse cx="14" cy="7" rx="12" ry="6" fill="#0083BE"/></svg>, label:'Inicio/Fin' },
                { svg:<svg width="28" height="14"><rect x="2" y="1" width="24" height="12" rx="3" fill="none" stroke="#0083BE" strokeWidth="1.5"/></svg>, label:'Actividad' },
                { svg:<svg width="28" height="14"><rect x="2" y="1" width="24" height="12" rx="3" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.5"/></svg>, label:'SAP' },
                { svg:<svg width="20" height="14"><polygon points="10,1 19,7 10,13 1,7" fill="none" stroke="#F47920" strokeWidth="1.5"/></svg>, label:'Decisión' },
              ].map(item => (
                <span key={item.label} style={{ display:'flex', alignItems:'center', gap:4 }}>{item.svg}{item.label}</span>
              ))}
            </div>
            <div>Maxion Wheels · {process.title}</div>
          </div>
        </div>
      </div>

      {/* Node edit panel */}
      {selectedNode && !drag?.isDragging && (
        <NodeEditPanel
          node={selectedNode}
          lanes={process.lanes || []}
          phases={process.phases || []}
          position={panelPos}
          onUpdate={(nodeId, updates) => { onUpdateNode(nodeId, updates); setSelectedNode(null); }}
          onDelete={(nodeId)  => { onDeleteNode(nodeId); setSelectedNode(null); }}
          onAddAfter={(nodeId) => { onAddNode(nodeId); setSelectedNode(null); }}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
