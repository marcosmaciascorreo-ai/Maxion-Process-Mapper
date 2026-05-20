import React, { useState, useCallback, useEffect } from 'react';
import ChatPanel from './components/ChatPanel.jsx';
import DiagramCanvas from './components/DiagramCanvas.jsx';
import ExportMenu from './components/ExportMenu.jsx';
import ProcessLibrary from './components/ProcessLibrary.jsx';
import LaneEditor from './components/LaneEditor.jsx';
import ManualEntryModal from './components/ManualEntryModal.jsx';
import { useProcessAI } from './hooks/useProcessAI.js';
import { useDiagram } from './hooks/useDiagram.js';

export default function App() {
  const [showLibrary,       setShowLibrary]       = useState(false);
  const [showEditor,        setShowEditor]        = useState(false);
  const [showManual,        setShowManual]        = useState(false);
  const [saveNotification,  setSaveNotification]  = useState(null);

  const { loading, error, extractProcess, refineProcess } = useProcessAI();

  const {
    currentProcess, setProcess,
    savedProcesses, saveProcess, loadProcess, deleteProcess, duplicateProcess,
    zoom, zoomIn, zoomOut, zoomReset, setZoom,
    undo, redo, canUndo, canRedo,
    updateNode, deleteNode, addNode,
  } = useDiagram();

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async (description) => {
    const result = await extractProcess(description);
    if (result) setProcess(result);
    return result;
  }, [extractProcess, setProcess]);

  const handleRefine = useCallback(async (instruction, process) => {
    const result = await refineProcess(instruction, process);
    if (result) setProcess(result);
    return result;
  }, [refineProcess, setProcess]);

  const handleSave = useCallback(() => {
    if (!currentProcess) return;
    const saved = saveProcess(currentProcess);
    setSaveNotification(`Guardado: "${saved.name}"`);
    setTimeout(() => setSaveNotification(null), 3000);
  }, [currentProcess, saveProcess]);

  const handleLoadProcess = useCallback((savedProcess) => {
    loadProcess(savedProcess);
    setShowLibrary(false);
  }, [loadProcess]);

  const handleDuplicate = useCallback((savedProcess) => {
    const dup = duplicateProcess(savedProcess);
    setSaveNotification(`Duplicado: "${dup.name}"`);
    setTimeout(() => setSaveNotification(null), 2500);
  }, [duplicateProcess]);

  const handleEditorUpdate = useCallback((updatedProcess) => {
    setProcess(updatedProcess);
    setShowEditor(false);
  }, [setProcess]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#f0f4f8' }}>

      {/* ── Top Toolbar ────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', borderBottom:'1px solid #e2e8f0', background:'#fff', flexShrink:0, flexWrap:'wrap' }}>
        {/* Logo */}
        <div style={{ width:32, height:32, borderRadius:8, background:'#0083BE', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:11, flexShrink:0, fontFamily:'IBM Plex Mono', boxShadow:'0 2px 8px rgba(0,131,190,0.18)', marginRight:2 }}>MW</div>
        <div style={{ marginRight:8 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', lineHeight:'1.2', fontFamily:'IBM Plex Sans' }}>Maxion Process Mapper</div>
          {currentProcess && (
            <div style={{ fontSize:10, color:'#94a3b8', fontFamily:'IBM Plex Mono', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>{currentProcess.title}</div>
          )}
        </div>

        <div style={{ width:1, height:22, background:'#e2e8f0', margin:'0 2px' }}/>

        {/* Library */}
        <button
          onClick={() => setShowLibrary(v => !v)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'IBM Plex Sans', background: showLibrary ? '#0083BE' : '#f8fafc', color: showLibrary ? '#fff' : '#475569', border: showLibrary ? 'none' : '1px solid #e2e8f0', transition:'all 0.15s' }}
        >
          📚 Biblioteca
        </button>

        {/* Save */}
        {currentProcess && (
          <button
            onClick={handleSave}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'IBM Plex Sans', background:'#eff8ff', color:'#0083BE', border:'1px solid #bae6fd', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.borderColor = '#7dd3fc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#eff8ff'; e.currentTarget.style.borderColor = '#bae6fd'; }}
          >
            💾 Guardar
          </button>
        )}

        {/* Edit (LaneEditor) */}
        {currentProcess && (
          <button
            onClick={() => setShowEditor(true)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'IBM Plex Sans', background:'#f8fafc', color:'#475569', border:'1px solid #e2e8f0' }}
          >
            ✏️ Editar actores
          </button>
        )}

        {/* Manual entry */}
        <button
          onClick={() => setShowManual(true)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'IBM Plex Sans', background:'#f8fafc', color:'#475569', border:'1px solid #e2e8f0' }}
          title="Crear diagrama manualmente sin IA"
        >
          📋 Manual
        </button>

        <div style={{ width:1, height:22, background:'#e2e8f0', margin:'0 2px' }}/>

        {/* Undo / Redo Pill */}
        <div style={{ display:'flex', alignItems:'center', background:'#f1f5f9', padding:2, borderRadius:8 }}>
          {[
            { fn: undo, can: canUndo, title:'Deshacer (Ctrl+Z)',   icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 6h6a4 4 0 0 1 0 8H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 6l3-3M2 6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { fn: redo, can: canRedo, title:'Rehacer (Ctrl+Y)',    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 6H8a4 4 0 0 0 0 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 6l-3-3M14 6l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          ].map(({ fn, can, title, icon }) => (
            <button key={title} onClick={fn} disabled={!can} title={title}
              style={{ padding:6, borderRadius:6, background:'none', border:'none', color: can ? '#475569' : '#cbd5e1', cursor: can ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
              onMouseEnter={e => { if(can) e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { if(can) e.currentTarget.style.background = 'none'; }}
            >{icon}</button>
          ))}
        </div>

        <div style={{ width:1, height:22, background:'#e2e8f0', margin:'0 2px' }}/>

        {/* Zoom controls Pill */}
        <div style={{ display:'flex', alignItems:'center', background:'#f1f5f9', padding:2, borderRadius:8 }}>
          {[
            { label:'−', fn: zoomOut },
            { label: `${Math.round(zoom*100)}%`, fn: zoomReset, active: true },
            { label:'+', fn: zoomIn  },
          ].map(({ label, fn, active }) => (
            <button key={label} onClick={fn}
              style={{ padding:'4px 8px', fontSize:12, borderRadius:6, border:'none', background: active ? '#fff' : 'transparent', color: active ? '#0083BE' : '#475569', cursor:'pointer', fontFamily:'IBM Plex Mono', minWidth:active?40:28, textAlign:'center', transition:'all 0.15s', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.05)' : 'none' }}
              onMouseEnter={e => { if(!active) e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={e => { if(!active) e.currentTarget.style.background = 'transparent'; }}
            >{label}</button>
          ))}
        </div>

        <div style={{ flex:1 }}/>

        {/* Process stats */}
        {currentProcess && (
          <div style={{ fontSize:11, color:'#94a3b8', display:'flex', gap:12, fontFamily:'IBM Plex Mono' }}>
            <span>{currentProcess.nodes?.length || 0} nodos</span>
            <span>{currentProcess.lanes?.length || 0} actores</span>
          </div>
        )}

        <div style={{ width:1, height:22, background:'#e2e8f0', margin:'0 2px' }}/>

        {/* Export */}
        <ExportMenu process={currentProcess} diagramCanvasId="diagram-canvas" />
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Library panel */}
        {showLibrary && (
          <div style={{ flexShrink:0, zIndex:20 }}>
            <ProcessLibrary
              processes={savedProcesses}
              currentProcess={currentProcess}
              onLoad={handleLoadProcess}
              onDelete={deleteProcess}
              onDuplicate={handleDuplicate}
              onClose={() => setShowLibrary(false)}
            />
          </div>
        )}

        {/* Chat panel */}
        <div style={{ flexShrink:0, width:'35%', minWidth:280, maxWidth:420 }}>
          <ChatPanel
            onGenerate={handleGenerate}
            onRefine={handleRefine}
            loading={loading}
            currentProcess={currentProcess}
          />
        </div>

        {/* Diagram canvas */}
        <div style={{ flex:1, overflow:'hidden' }}>
          <DiagramCanvas
            process={currentProcess}
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onZoomReset={zoomReset}
            onSetZoom={setZoom}
            onUpdateNode={updateNode}
            onDeleteNode={deleteNode}
            onAddNode={addNode}
            id="diagram-canvas"
          />
        </div>
      </div>

      {/* ── Toast notifications ────────────────────────────────────────────── */}
      {saveNotification && (
        <div className="animate-slide-down" style={{ position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', background:'rgba(15,23,42,0.85)', backdropFilter:'blur(8px)', color:'#fff', fontSize:13, padding:'10px 18px', borderRadius:20, boxShadow:'0 10px 25px -5px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', gap:8, zIndex:200, fontFamily:'IBM Plex Sans', whiteSpace:'nowrap' }}>
          <span style={{ color:'#4ade80' }}>✓</span> {saveNotification}
        </div>
      )}

      {/* ── Error toast ────────────────────────────────────────────────────── */}
      {error && (
        <div className="animate-slide-down" style={{ position:'fixed', top:24, left:'50%', transform:'translateX(-50%)', background:'rgba(239,68,68,0.9)', backdropFilter:'blur(8px)', color:'#fff', fontSize:13, padding:'10px 18px', borderRadius:20, boxShadow:'0 10px 25px -5px rgba(239,68,68,0.3)', zIndex:200, fontFamily:'IBM Plex Sans', maxWidth:360, textAlign:'center', whiteSpace:'nowrap' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Lane Editor Modal ──────────────────────────────────────────────── */}
      {showEditor && currentProcess && (
        <LaneEditor
          process={currentProcess}
          onUpdate={handleEditorUpdate}
          onClose={() => setShowEditor(false)}
        />
      )}

      {/* ── Manual Entry Modal ─────────────────────────────────────────────── */}
      {showManual && (
        <ManualEntryModal
          onBuild={(process) => setProcess(process)}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  );
}
