const express = require('express');
const router = express.Router();
const { extractProcess } = require('../services/openai');

// POST /api/extract-process
router.post('/extract-process', async (req, res) => {
  try {
    const { description, context, conversationHistory } = req.body;

    if (!description || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'La descripción del proceso es muy corta. Por favor, proporciona más detalles.'
      });
    }

    const fullDescription = context
      ? `CONTEXTO ADICIONAL: ${context}\n\nDESCRIPCIÓN DEL PROCESO:\n${description}`
      : description;

    const result = await extractProcess(fullDescription, conversationHistory || []);

    return res.json(result);
  } catch (error) {
    console.error('Error extracting process:', error);

    if (error.message.includes('OPENAI_API_KEY')) {
      return res.status(500).json({
        success: false,
        error: 'API key de OpenAI no configurada. Agrega OPENAI_API_KEY en el archivo .env'
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Límite de solicitudes de OpenAI alcanzado. Intenta de nuevo en unos segundos.'
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

// POST /api/refine-process
router.post('/refine-process', async (req, res) => {
  try {
    const { instruction, currentProcess, conversationHistory } = req.body;

    if (!instruction || !currentProcess) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere instrucción y proceso actual'
      });
    }

    const description = `
El proceso actual tiene este JSON:
${JSON.stringify(currentProcess, null, 2)}

Instrucción de modificación: ${instruction}

Devuelve el JSON completo modificado según la instrucción.
`;

    const result = await extractProcess(description, conversationHistory || []);
    return res.json(result);
  } catch (error) {
    console.error('Error refining process:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
});

module.exports = router;
