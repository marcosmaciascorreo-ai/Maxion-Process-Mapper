import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useProcessAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  const extractProcess = useCallback(async (description, context = '') => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/extract-process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          context,
          conversationHistory
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar la solicitud');
      }

      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: description },
        { role: 'assistant', content: JSON.stringify(data.data) }
      ]);

      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversationHistory]);

  const refineProcess = useCallback(async (instruction, currentProcess) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/refine-process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          currentProcess,
          conversationHistory
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al refinar el proceso');
      }

      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: instruction },
        { role: 'assistant', content: JSON.stringify(data.data) }
      ]);

      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversationHistory]);

  const clearHistory = useCallback(() => {
    setConversationHistory([]);
    setError(null);
  }, []);

  return {
    loading,
    error,
    conversationHistory,
    extractProcess,
    refineProcess,
    clearHistory
  };
}
