import { useState, useCallback, useEffect, useRef } from 'react';
import { SAMPLE_PROCESSES } from '../data/sampleProcesses.js';

const STORAGE_KEY = 'maxion_processes_v2'; // v2 = fresh start, clears old default
const MAX_HISTORY = 30;

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveToStorage(processes) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(processes)); }
  catch (e) { console.warn('localStorage write failed:', e); }
}

function getProcessIcon(name = '') {
  const l = name.toLowerCase();
  if (l.includes('cip'))      return '🏗️';
  if (l.includes('capitaliz')) return '🏭';
  if (l.includes('depreci'))  return '📉';
  if (l.includes('baja'))     return '🗑️';
  if (l.includes('capex'))    return '💰';
  if (l.includes('manten'))   return '🔧';
  if (l.includes('compra'))   return '🛒';
  return '📋';
}

export function useDiagram() {
  const [currentProcess, setCurrentProcess] = useState(null); // always starts empty
  const [savedProcesses, setSavedProcesses] = useState([]);
  const [zoom,           setZoom]           = useState(1.0);
  const [history,        setHistory]        = useState([]);
  const historyIdxRef                       = useRef(-1);
  const [historyIdx,     setHistoryIdx]     = useState(-1);

  useEffect(() => { historyIdxRef.current = historyIdx; }, [historyIdx]);

  // Load saved processes (never auto-loads currentProcess)
  useEffect(() => {
    const stored = loadFromStorage();
    setSavedProcesses(stored.length === 0
      ? SAMPLE_PROCESSES.map(p => ({ ...p, builtin: true }))
      : stored
    );
  }, []);

  useEffect(() => {
    if (savedProcesses.length > 0) saveToStorage(savedProcesses);
  }, [savedProcesses]);

  // ── Core process setter (pushes to history) ──────────────────────────────

  const setProcess = useCallback((process) => {
    setCurrentProcess(process);
    setHistory(prev => {
      const idx   = historyIdxRef.current;
      const trimmed = prev.slice(0, idx + 1);
      const next  = [...trimmed, process].slice(-MAX_HISTORY);
      setHistoryIdx(next.length - 1);
      return next;
    });
  }, []);

  // ── Undo / Redo ───────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    setHistory(prev => {
      const idx = historyIdxRef.current;
      if (idx <= 0) return prev;
      const newIdx = idx - 1;
      setHistoryIdx(newIdx);
      setCurrentProcess(prev[newIdx]);
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      const idx = historyIdxRef.current;
      if (idx >= prev.length - 1) return prev;
      const newIdx = idx + 1;
      setHistoryIdx(newIdx);
      setCurrentProcess(prev[newIdx]);
      return prev;
    });
  }, []);

  // ── CRUD operations on current process ───────────────────────────────────

  const updateNode = useCallback((nodeId, updates) => {
    setCurrentProcess(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n),
      };
      setProcess(updated);
      return updated;
    });
  }, [setProcess]);

  const deleteNode = useCallback((nodeId) => {
    setCurrentProcess(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        nodes: prev.nodes.filter(n => n.id !== nodeId),
        edges: prev.edges.filter(e => e.from !== nodeId && e.to !== nodeId),
      };
      setProcess(updated);
      return updated;
    });
  }, [setProcess]);

  /**
   * Add a new activity node after `afterNodeId` in the same lane/phase.
   * Also inserts an edge from afterNode → newNode.
   * If afterNode has a single outgoing solid edge, it gets re-routed through new node.
   */
  const addNode = useCallback((afterNodeId) => {
    setCurrentProcess(prev => {
      if (!prev) return prev;
      const afterNode = prev.nodes.find(n => n.id === afterNodeId);
      if (!afterNode) return prev;

      const newId = `n_${Date.now()}`;
      const newNode = {
        id:       newId,
        type:     'activity',
        label:    'Nuevo paso',
        sublabel: null,
        laneId:   afterNode.laneId,
        phaseId:  afterNode.phaseId,
        color:    afterNode.color || '#0083BE',
        badge:    null,
      };

      // Find existing solid outgoing edges from afterNode (exclude loops)
      const outgoing = prev.edges.filter(
        e => e.from === afterNodeId && !e.loop && e.style !== 'dashed'
      );

      let updatedEdges = [...prev.edges];

      if (outgoing.length === 1) {
        // Reroute: afterNode → newNode → originalTarget
        const originalEdge = outgoing[0];
        updatedEdges = updatedEdges.filter(e => e !== originalEdge);
        updatedEdges.push(
          { from: afterNodeId, to: newId,              label: null, style: 'solid', color: afterNode.color || '#0083BE' },
          { from: newId,       to: originalEdge.to,    label: null, style: 'solid', color: afterNode.color || '#0083BE' },
        );
      } else {
        // Just add an edge without rerouting
        updatedEdges.push(
          { from: afterNodeId, to: newId, label: null, style: 'solid', color: afterNode.color || '#0083BE' }
        );
      }

      // Insert new node right after afterNode in nodes array
      const nodesCopy = [...prev.nodes];
      const afterIdx  = nodesCopy.findIndex(n => n.id === afterNodeId);
      nodesCopy.splice(afterIdx + 1, 0, newNode);

      const updated = { ...prev, nodes: nodesCopy, edges: updatedEdges };
      setProcess(updated);
      return updated;
    });
  }, [setProcess]);

  // ── Process library ───────────────────────────────────────────────────────

  const saveProcess = useCallback((process, name = null) => {
    const id       = process.id || `process_${Date.now()}`;
    const saveName = name || process.title || 'Proceso sin nombre';
    const saved    = {
      id, name: saveName,
      icon:        getProcessIcon(saveName),
      description: process.subtitle || '',
      data:        { ...process, id },
      savedAt:     new Date().toISOString(),
      builtin:     false,
    };
    setSavedProcesses(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx >= 0) { const u = [...prev]; u[idx] = saved; return u; }
      return [...prev, saved];
    });
    return saved;
  }, []);

  const loadProcess = useCallback((savedProcess) => {
    setProcess(savedProcess.data);
  }, [setProcess]);

  const deleteProcess = useCallback((id) => {
    setSavedProcesses(prev => prev.filter(p => p.id !== id));
  }, []);

  const duplicateProcess = useCallback((savedProcess) => {
    const newId = `process_${Date.now()}`;
    const dup   = {
      ...savedProcess, id: newId,
      name:    `${savedProcess.name} (copia)`,
      savedAt: new Date().toISOString(),
      builtin: false,
      data:    { ...savedProcess.data, id: newId },
    };
    setSavedProcesses(prev => [...prev, dup]);
    return dup;
  }, []);

  // ── Zoom ──────────────────────────────────────────────────────────────────

  const zoomIn    = useCallback(() => setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(1))), []);
  const zoomOut   = useCallback(() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(1))), []);
  const zoomReset = useCallback(() => setZoom(1.0), []);

  return {
    currentProcess, setProcess,
    savedProcesses, saveProcess, loadProcess, deleteProcess, duplicateProcess,
    zoom, zoomIn, zoomOut, zoomReset, setZoom,
    undo, redo,
    canUndo: historyIdx > 0,
    canRedo: historyIdx < history.length - 1,
    updateNode, deleteNode, addNode,
  };
}
