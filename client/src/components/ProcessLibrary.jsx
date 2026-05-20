import React, { useState } from 'react';

const ICON_MAP = {
  'cip': '🏗️',
  'capitaliz': '🏭',
  'depreci': '📉',
  'baja': '🗑️',
  'capex': '💰',
  'default': '📋'
};

function getIcon(name = '') {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return ICON_MAP.default;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch {
    return '';
  }
}

export default function ProcessLibrary({ processes, currentProcess, onLoad, onDelete, onDuplicate, onClose }) {
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = processes.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const builtins = filtered.filter(p => p.builtin);
  const custom = filtered.filter(p => !p.builtin);

  const handleDelete = (p) => {
    if (p.builtin) return;
    setConfirmDelete(p);
  };

  const confirmDeleteAction = () => {
    if (confirmDelete) {
      onDelete(confirmDelete.id);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200" style={{ width: '260px', minWidth: '260px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div>
          <div className="text-sm font-bold text-slate-900">Biblioteca</div>
          <div className="text-xs text-slate-400" style={{ fontFamily: 'IBM Plex Mono' }}>
            {processes.length} proceso{processes.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar proceso..."
          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-slate-50"
          style={{ fontFamily: 'IBM Plex Sans' }}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {builtins.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 sticky top-0 bg-white border-b border-slate-50" style={{ fontFamily: 'IBM Plex Mono' }}>
              PROCESOS DEMO
            </div>
            {builtins.map(p => (
              <ProcessItem
                key={p.id}
                process={p}
                isActive={currentProcess?.title === p.data?.title}
                onLoad={() => onLoad(p)}
                onDuplicate={() => onDuplicate(p)}
                onDelete={null}
                isBuiltin
              />
            ))}
          </div>
        )}

        {custom.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 sticky top-0 bg-white border-b border-slate-50" style={{ fontFamily: 'IBM Plex Mono' }}>
              MIS PROCESOS
            </div>
            {custom.map(p => (
              <ProcessItem
                key={p.id}
                process={p}
                isActive={currentProcess?.title === p.data?.title}
                onLoad={() => onLoad(p)}
                onDuplicate={() => onDuplicate(p)}
                onDelete={() => handleDelete(p)}
                isBuiltin={false}
              />
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            {search ? 'No se encontraron procesos' : 'No hay procesos guardados'}
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 rounded-xl">
          <div className="bg-white rounded-xl p-4 mx-4 shadow-xl border border-slate-200">
            <div className="text-sm font-semibold text-slate-900 mb-1">¿Eliminar proceso?</div>
            <div className="text-xs text-slate-500 mb-4">"{confirmDelete.name}" se eliminará permanentemente.</div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAction}
                className="flex-1 px-3 py-1.5 text-xs text-white rounded-lg"
                style={{ background: '#EF4444' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProcessItem({ process, isActive, onLoad, onDuplicate, onDelete, isBuiltin }) {
  const [showActions, setShowActions] = useState(false);
  const icon = process.icon || getIcon(process.name);

  return (
    <div
      className={`relative group border-b border-slate-50 transition-colors ${
        isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button
        onClick={onLoad}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left"
      >
        <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0 flex-1">
          <div
            className={`text-xs font-semibold leading-tight truncate ${
              isActive ? 'text-blue-700' : 'text-slate-800'
            }`}
          >
            {process.name}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 truncate" style={{ fontFamily: 'IBM Plex Mono' }}>
            {process.data?.nodes?.length || 0} nodos · {process.data?.lanes?.length || 0} actores
          </div>
          {process.savedAt && (
            <div className="text-xs text-slate-300 mt-0.5" style={{ fontFamily: 'IBM Plex Mono' }}>
              {formatDate(process.savedAt)}
            </div>
          )}
        </div>
        {isActive && (
          <div
            className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: '#0083BE' }}
          />
        )}
      </button>

      {/* Actions */}
      {showActions && (
        <div className="absolute right-2 top-2 flex gap-1 animate-fade-in">
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all text-xs"
            title="Duplicar"
          >
            ⧉
          </button>
          {!isBuiltin && onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-red-100 transition-all text-xs"
              title="Eliminar"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
