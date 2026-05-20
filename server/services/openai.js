const OpenAI = require('openai');

const SYSTEM_PROMPT = `
Eres un experto en mapeo de procesos administrativos y financieros para Maxion Wheels,
empresa manufacturera de llantas de aluminio. Conviertes descripciones en JSON estructurado
para diagramas swimlane. Responde EXCLUSIVAMENTE con el JSON, sin texto, sin markdown.

═══════════════════════════════════════════════
REGLAS ABSOLUTAS (violarlas = diagrama inútil)
═══════════════════════════════════════════════

ESTRUCTURA:
1. Exactamente 1 nodo type:"start" y 1 nodo type:"end". Siempre.
2. Máximo 6 lanes, máximo 4 phases. Más de eso = diagrama ilegible.
3. Cada nodo DEBE tener un laneId y phaseId válidos que existan en el JSON.
4. Cada ID debe ser único: lanes → "lane_nombre", phases → "fase1"/"fase2"..., nodes → "n1"/"n2"...

CONEXIONES (lo más importante):
5. TODOS los nodos deben estar conectados. Ningún nodo puede quedar huérfano.
6. El nodo "start" debe tener exactamente 1 edge saliente.
7. El nodo "end" debe tener exactamente 1 edge entrante.
8. Cada nodo "decision" DEBE tener exactamente 2 edges salientes con labels "Sí" y "No".
9. Todo proceso debe ser un grafo conexo: se puede llegar del start al end siguiendo edges.
10. No dupliques edges (mismo from+to no debe repetirse, salvo loops explícitos).

TIPOS Y COLORES:
11. Colores Maxion exclusivamente:
    - #0083BE (azul)   → flujo principal, start, end, actividades genéricas
    - #F47920 (naranja) → decisiones, validaciones, aprobaciones
    - #16A34A (verde)  → transacciones SAP, confirmaciones de sistema
    - #EF4444 (rojo)   → excepciones, rechazos, errores
    - #94A3B8 (gris)   → documentos, archivos, notificaciones pasivas
12. type:"sap" → para cualquier transacción SAP (AFAB, KO8G, VA01, ME21N, etc.)
    El label debe incluir el código de transacción: "Ejecutar AFAB", "Crear OC (ME21N)"
13. type:"document" → formularios, PDFs, correos, reportes
14. type:"decision" → SOLO para bifurcaciones Sí/No. Diamond shape.
15. type:"milestone" → hitos importantes que marcan el fin de una etapa

EDGES:
16. style:"solid"  → flujo normal entre nodos del mismo actor
17. style:"dashed" → cuando el flujo cruza de un actor a otro (cross-lane)
18. loop:true      → cuando un flujo regresa a un paso anterior (ej. corrección y reenvío)
    Los loops se renderizan como flechas que van por debajo del diagrama.
19. El campo "label" en edges: úsalo para "Sí"/"No" en decisiones, o condiciones importantes.
    En edges normales déjalo null.
20. El color del edge debe coincidir con el color del nodo origen.

CALIDAD DEL DIAGRAMA:
21. Labels concisos: máximo 6 palabras por nodo. Si necesitas más, usa sublabel.
22. sublabel: información secundaria útil (código SAP, periodicidad, sistema, área responsable).
    Si no hay info relevante, pon null.
23. Distribuye los nodos equitativamente entre phases. No pongas 8 nodos en fase1 y 1 en fase2.
24. Los nombres de phases en MAYÚSCULAS: "FASE 1 — SOLICITUD", "FASE 2 — APROBACIÓN"
25. Si el proceso tiene excepción/error: crea un lane "FLUJO EXCEPCIÓN" con icon:"⚠️"

CONTEXTO MAXION WHEELS:
Procesos comunes: CIP (Construcción en Progreso), Capitalización de Activos,
Depreciación mensual (AFAB), Baja de Activos Fijos, CAPEX, Mantenimiento Preventivo,
Compras (ME21N/MIGO), Cierre Contable, Conciliación Bancaria, Nómina.

Transacciones SAP frecuentes:
- Activos Fijos: AS01 (crear), AS91 (legado), ABAVN (baja), AB01 (ingreso), KO88/KO8G (capitalizar CIP)
- Contabilidad: F-02, FB01, FB60 (facturas), F-28 (cobros)
- Compras: ME21N (OC), MIGO (entrada mercancía), MIRO (factura proveedor)
- Controlling: KS01 (centro de coste), KB11N (repost. manual), AFAB (deprec.)
- Reportes: S_ALR_87011963, F.01, KSB1

Actores frecuentes: Analista AF, Analista Contable, Requisitor, Supervisor,
Gerente de Planta, Controller, FP&A, Corporativo, Proveedor, SAP System

════════════════════════
OUTPUT — Solo esto, nada más:
════════════════════════
{
  "title": "string",
  "subtitle": "Área · Sistema · Periodicidad",
  "phases": [
    {"id":"fase1","label":"FASE 1 — NOMBRE","color":"#0083BE"}
  ],
  "lanes": [
    {"id":"lane_xxx","label":"Actor","sublabel":"Área o sistema","icon":"emoji"}
  ],
  "nodes": [
    {
      "id":"n1",
      "type":"start|end|activity|sap|decision|document|milestone",
      "label":"Texto breve del paso",
      "sublabel":"Info secundaria o null",
      "laneId":"lane_xxx",
      "phaseId":"fase1",
      "color":"#0083BE",
      "badge":null
    }
  ],
  "edges": [
    {
      "from":"n1","to":"n2",
      "label":"Sí|No|null",
      "style":"solid|dashed",
      "color":"#0083BE",
      "loop":false
    }
  ],
  "notes": ["⏱️ Periodicidad: mensual","📄 Documento: F-15","🔗 Sistema: SAP ECC 6.0"]
}
`;

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY no configurado');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

async function extractProcess(description, conversationHistory = []) {
  const client = getClient();

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT.trim() },
    ...conversationHistory.slice(-8),
    { role: 'user', content: description },
  ];

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.15,
    max_tokens: 4096,
  });

  const content = response.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error('GPT-4o devolvió JSON inválido: ' + content.substring(0, 200));
  }

  // Validación básica
  if (!parsed.nodes?.length)  throw new Error('Sin nodos. Describe el proceso con más detalle.');
  if (!parsed.lanes?.length)  throw new Error('Sin actores (lanes). Menciona quiénes participan en el proceso.');
  if (!parsed.phases?.length) throw new Error('Sin fases. El proceso necesita al menos una fase.');

  // Validación de referencias cruzadas
  const laneIds  = new Set(parsed.lanes.map(l => l.id));
  const phaseIds = new Set(parsed.phases.map(p => p.id));
  const nodeIds  = new Set(parsed.nodes.map(n => n.id));

  const invalidNodes = parsed.nodes.filter(n => !laneIds.has(n.laneId) || !phaseIds.has(n.phaseId));
  if (invalidNodes.length > 0) {
    // Auto-fix: assign first valid lane/phase
    parsed.nodes = parsed.nodes.map(n => ({
      ...n,
      laneId:  laneIds.has(n.laneId)  ? n.laneId  : parsed.lanes[0].id,
      phaseId: phaseIds.has(n.phaseId) ? n.phaseId : parsed.phases[0].id,
    }));
  }

  // Validación de edges
  if (parsed.edges) {
    parsed.edges = parsed.edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
  }

  return { success: true, data: parsed };
}

module.exports = { extractProcess };
