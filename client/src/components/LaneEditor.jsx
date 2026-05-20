import React, { useState } from 'react';

export default function LaneEditor({ process, onUpdate, onClose }) {
  const [editedProcess, setEditedProcess] = useState(
    JSON.parse(JSON.stringify(process))
  );
  const [activeTab, setActiveTab] = useState('nodes');

  const handleNodeChange = (nodeId, field, value) => {
    setEditedProcess(prev => ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === nodeId ? { ...n, [field]: value } : n
      )
    }));
  };

  const handleLaneChange = (laneId, field, value) => {
    setEditedProcess(prev => ({
      ...prev,
      lanes: prev.lanes.map(l =>
        l.id === laneId ? { ...l, [field]: value } : l
      )
    }));
  };

  const handlePhaseChange = (phaseId, field, value) => {
    setEditedProcess(prev => ({
      ...prev,
      phases: prev.phases.map(p =>
        p.id === phaseId ? { ...p, [field]: value } : p
      )
    }));
  };

  const handleApply = () => {
    onUpdate(editedProcess);
    onClose();
  };

  const NODE_TYPES = ['start', 'end', 'activity', 'sap', 'decision', 'document', 'milestone'];
  const COLORS = ['#0083BE', '#F47920', '#16A34A', '#EF4444', '#64748B', '#F59E0B'];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-screen overflow-hidden flex flex-col"
        style={{ fontFamily: 'IBM Plex Sans' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <div className="text-base font-bold text-slate-900">Editor de Diagrama</div>
            <div className="text-xs text-slate-400 mt-0.5" style={{ fontFamily: 'IBM Plex Mono' }}>
              {editedProcess.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {['nodes', 'lanes', 'phases', 'meta'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              style={{
                borderBottomColor: activeTab === tab ? '#0083BE' : 'transparent',
                fontFamily: 'IBM Plex Sans'
              }}
            >
              {tab === 'nodes' ? `Nodos (${editedProcess.nodes?.length || 0})` :
               tab === 'lanes' ? `Actores (${editedProcess.lanes?.length || 0})` :
               tab === 'phases' ? `Fases (${editedProcess.phases?.length || 0})` :
               'Metadata'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'nodes' && (
            <div className="space-y-3">
              {editedProcess.nodes?.map(node => (
                <div key={node.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: node.color || '#0083BE' }}
                    />
                    <span className="text-xs font-medium text-slate-500" style={{ fontFamily: 'IBM Plex Mono' }}>
                      {node.id} · {node.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Etiqueta</label>
                      <input
                        type="text"
                        value={node.label || ''}
                        onChange={e => handleNodeChange(node.id, 'label', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Subetiqueta</label>
                      <input
                        type="text"
                        value={node.sublabel || ''}
                        onChange={e => handleNodeChange(node.id, 'sublabel', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                      <select
                        value={node.type}
                        onChange={e => handleNodeChange(node.id, 'type', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                      >
                        {NODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Color</label>
                      <div className="flex gap-1 flex-wrap">
                        {COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => handleNodeChange(node.id, 'color', c)}
                            className="w-5 h-5 rounded-full border-2 transition-all"
                            style={{
                              background: c,
                              borderColor: node.color === c ? '#0f172a' : 'transparent'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'lanes' && (
            <div className="space-y-3">
              {editedProcess.lanes?.map(lane => (
                <div key={lane.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-medium text-slate-500" style={{ fontFamily: 'IBM Plex Mono' }}>
                    {lane.id}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={lane.label || ''}
                        onChange={e => handleLaneChange(lane.id, 'label', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Área</label>
                      <input
                        type="text"
                        value={lane.sublabel || ''}
                        onChange={e => handleLaneChange(lane.id, 'sublabel', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Icono</label>
                      <input
                        type="text"
                        value={lane.icon || ''}
                        onChange={e => handleLaneChange(lane.id, 'icon', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                        placeholder="emoji"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'phases' && (
            <div className="space-y-3">
              {editedProcess.phases?.map(phase => (
                <div key={phase.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-medium text-slate-500" style={{ fontFamily: 'IBM Plex Mono' }}>
                    {phase.id}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Etiqueta</label>
                      <input
                        type="text"
                        value={phase.label || ''}
                        onChange={e => handlePhaseChange(phase.id, 'label', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Color</label>
                      <div className="flex gap-1">
                        {COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => handlePhaseChange(phase.id, 'color', c)}
                            className="w-5 h-5 rounded-full border-2 transition-all"
                            style={{
                              background: c,
                              borderColor: phase.color === c ? '#0f172a' : 'transparent'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'meta' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Título del proceso</label>
                <input
                  type="text"
                  value={editedProcess.title || ''}
                  onChange={e => setEditedProcess(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Subtítulo</label>
                <input
                  type="text"
                  value={editedProcess.subtitle || ''}
                  onChange={e => setEditedProcess(prev => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notas (una por línea)</label>
                <textarea
                  value={(editedProcess.notes || []).join('\n')}
                  onChange={e => setEditedProcess(prev => ({ ...prev, notes: e.target.value.split('\n').filter(Boolean) }))}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 resize-none"
                  style={{ fontFamily: 'IBM Plex Mono', fontSize: '11px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm text-white rounded-xl flex-1 hover:opacity-90 transition-opacity"
            style={{ background: '#0083BE' }}
          >
            Aplicar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
