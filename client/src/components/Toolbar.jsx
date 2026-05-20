import React from 'react';

export default function Toolbar({
  process,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onSave,
  onToggleLibrary,
  showLibrary,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0"
      style={{ fontFamily: 'IBM Plex Sans' }}
    >
      {/* Logo */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-1"
        style={{ background: '#0083BE', fontFamily: 'IBM Plex Mono', boxShadow: '0 2px 8px rgba(0,131,190,0.2)' }}
      >
        MW
      </div>
      <div className="mr-2">
        <div className="text-sm font-bold text-slate-900 leading-tight">Maxion Process Mapper</div>
        {process && (
          <div className="text-xs text-slate-500 leading-tight truncate max-w-48" style={{ fontFamily: 'IBM Plex Mono' }}>
            {process.title}
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Library toggle */}
      <button
        onClick={onToggleLibrary}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          showLibrary
            ? 'text-white'
            : 'text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100'
        }`}
        style={{
          background: showLibrary ? '#0083BE' : undefined,
          fontFamily: 'IBM Plex Sans'
        }}
      >
        <span>📚</span>
        <span>Biblioteca</span>
      </button>

      {/* Save */}
      {process && (
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all"
        >
          <span>💾</span>
          <span>Guardar</span>
        </button>
      )}

      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="Deshacer"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 6h6a4 4 0 0 1 0 8H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 6l3-3M2 6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="Rehacer"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M14 6H8a4 4 0 0 0 0 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 6l-3-3M14 6l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomOut}
          className="px-2 py-1 text-xs font-mono rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all"
        >
          −
        </button>
        <button
          onClick={onZoomReset}
          className="px-2 py-1 text-xs font-mono rounded border text-blue-600 hover:bg-blue-50 transition-all min-w-12 text-center"
          style={{ borderColor: '#0083BE', background: '#eff8ff' }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={onZoomIn}
          className="px-2 py-1 text-xs font-mono rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all"
        >
          +
        </button>
      </div>

      <div className="flex-1" />

      {/* Process info */}
      {process && (
        <div className="text-xs text-slate-400 hidden xl:flex items-center gap-3" style={{ fontFamily: 'IBM Plex Mono' }}>
          <span>{process.nodes?.length || 0} nodos</span>
          <span>{process.lanes?.length || 0} actores</span>
          <span>{process.phases?.length || 0} fases</span>
        </div>
      )}
    </div>
  );
}
