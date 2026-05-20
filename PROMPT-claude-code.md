# PROMPT PARA CLAUDE CODE
## App: Maxion Process Mapper — AI-Powered Swimlane Generator

---

## CONTEXTO Y OBJETIVO

Construye una aplicación web full-stack llamada **Maxion Process Mapper** que permita
a un analista de Activo Fijo describir un proceso administrativo en lenguaje natural
(español o inglés) y que la IA lo convierta automáticamente en un diagrama de flujo
tipo swimlane exportable, usando los colores corporativos de Maxion Wheels.

La IA que impulsa la extracción de procesos es **OpenAI GPT-4o**.

---

## STACK TÉCNICO

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express (API REST)
- **IA:** OpenAI API (`gpt-4o`) — structured outputs con JSON mode
- **Diagramas:** SVG generado dinámicamente en el frontend (sin librerías externas de diagramas)
- **Exportación:** html2canvas o similar para PNG; opción de descarga HTML
- **Almacenamiento:** localStorage para guardar procesos del usuario (sin base de datos)

---

## COLORES Y ESTILO (Maxion Brand)

```js
const MAXION_COLORS = {
  primary:    '#0083BE',  // Azul Maxion
  orange:     '#F47920',  // Naranja Maxion
  white:      '#FFFFFF',
  gray100:    '#F8FAFC',
  gray200:    '#E2E8F0',
  gray500:    '#64748B',
  gray900:    '#0F172A',

  // Colores estándar de proceso (SVG semántico)
  success:    '#16A34A',  // Verde — SAP / completado
  decision:   '#F47920',  // Naranja — rombos de decisión
  error:      '#EF4444',  // Rojo — excepciones / NO paths
  warning:    '#F59E0B',  // Ámbar — advertencias
  info:       '#0083BE',  // Azul — flujo principal
};
```

---

## ARQUITECTURA DE LA APP

```
/
├── client/                  # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel.jsx        # Conversación con la IA
│   │   │   ├── DiagramCanvas.jsx    # SVG swimlane renderizado
│   │   │   ├── LaneEditor.jsx       # Edición manual de carriles
│   │   │   ├── ExportMenu.jsx       # PNG / HTML / PDF
│   │   │   ├── ProcessLibrary.jsx   # Procesos guardados
│   │   │   └── Toolbar.jsx          # Zoom, undo, config
│   │   ├── hooks/
│   │   │   ├── useProcessAI.js      # Llama al backend y recibe JSON
│   │   │   └── useDiagram.js        # Estado y transformaciones del diagrama
│   │   ├── utils/
│   │   │   ├── svgRenderer.js       # Genera SVG desde el JSON del proceso
│   │   │   └── layoutEngine.js      # Calcula coordenadas x/y de nodos
│   │   └── App.jsx
│
├── server/                  # Express
│   ├── routes/
│   │   └── process.js       # POST /api/extract-process
│   ├── services/
│   │   └── openai.js        # Lógica de prompt + llamada a GPT-4o
│   └── index.js
│
├── .env                     # OPENAI_API_KEY
└── package.json
```

---

## FLUJO PRINCIPAL DE LA APP

```
Usuario escribe descripción del proceso en el chat
        ↓
Frontend → POST /api/extract-process { description, context }
        ↓
Backend → GPT-4o con system prompt estructurado
        ↓
GPT-4o devuelve JSON con el proceso estructurado
        ↓
Frontend renderiza SVG swimlane automáticamente
        ↓
Usuario puede: editar nodos, agregar pasos, exportar
```

---

## SCHEMA JSON DEL PROCESO (output de GPT-4o)

GPT-4o debe devolver **SOLO** este JSON (usa JSON mode):

```json
{
  "title": "Nombre del proceso",
  "subtitle": "Área / Sistema / Periodicidad",
  "phases": [
    {
      "id": "fase1",
      "label": "FASE 1 — APERTURA",
      "color": "#0083BE"
    }
  ],
  "lanes": [
    {
      "id": "lane_analista",
      "label": "Analista AF",
      "sublabel": "Activo Fijo",
      "icon": "📊"
    }
  ],
  "nodes": [
    {
      "id": "n1",
      "type": "start",
      "label": "INICIO",
      "sublabel": "Mensual",
      "laneId": "lane_analista",
      "phaseId": "fase1",
      "color": "#0083BE"
    },
    {
      "id": "n2",
      "type": "activity",
      "label": "Genera reporte mensual de CIPs",
      "sublabel": "en SAP",
      "laneId": "lane_analista",
      "phaseId": "fase1",
      "color": "#0083BE",
      "badge": null
    },
    {
      "id": "n3",
      "type": "decision",
      "label": "¿Facturas completas?",
      "sublabel": "Saldo = 0",
      "laneId": "lane_analista",
      "phaseId": "fase1",
      "color": "#F47920"
    },
    {
      "id": "n4",
      "type": "sap",
      "label": "KO88",
      "sublabel": "Traspaso CIP → AF",
      "laneId": "lane_analista",
      "phaseId": "fase2",
      "color": "#16A34A",
      "badge": "SAP"
    },
    {
      "id": "n5",
      "type": "end",
      "label": "FIN",
      "sublabel": "Proceso completado",
      "laneId": "lane_analista",
      "phaseId": "fase2",
      "color": "#0083BE"
    }
  ],
  "edges": [
    {
      "from": "n1",
      "to": "n2",
      "label": null,
      "style": "solid",
      "color": "#0083BE"
    },
    {
      "from": "n3",
      "to": "n1",
      "label": "NO",
      "style": "dashed",
      "color": "#EF4444",
      "loop": true
    },
    {
      "from": "n3",
      "to": "n4",
      "label": "SÍ",
      "style": "solid",
      "color": "#16A34A"
    }
  ],
  "notes": [
    "⏱️ Periodicidad: Mensual",
    "📄 Documento: CAPEX Request"
  ]
}
```

**Tipos de nodo:**
| type       | Forma SVG          | Uso                        |
|------------|--------------------|----------------------------|
| `start`    | Elipse rellena     | Inicio del proceso         |
| `end`      | Elipse rellena     | Fin del proceso            |
| `activity` | Rectángulo         | Tarea manual               |
| `sap`      | Rectángulo + badge | Transacción en SAP         |
| `decision` | Rombo              | Punto de decisión (Sí/No)  |
| `document` | Rectángulo + wave  | Documento / formulario     |
| `milestone`| Rombo redondeado   | Hito importante            |

---

## SYSTEM PROMPT PARA GPT-4o (backend/services/openai.js)

```js
const SYSTEM_PROMPT = `
Eres un experto en mapeo de procesos administrativos y financieros para Maxion Wheels,
empresa manufacturera de llantas. Tu tarea es analizar descripciones de procesos en
español o inglés y convertirlas en un JSON estructurado que represente un diagrama
de flujo tipo swimlane.

REGLAS ESTRICTAS:
1. Responde SOLO con el JSON. Sin texto adicional, sin markdown, sin comentarios.
2. Identifica automáticamente: actores (lanes), fases (phases), pasos (nodes) y conexiones (edges).
3. Detecta decisiones (Sí/No), rutas de excepción, y loops de retorno.
4. Usa colores Maxion: #0083BE (azul) para flujo principal, #F47920 (naranja) para decisiones,
   #16A34A (verde) para SAP/éxito, #EF4444 (rojo) para excepciones.
5. El número de lanes debe reflejar exactamente los actores mencionados.
6. Los edges con loop:true se renderizan como flechas curvas de retorno.
7. Si el proceso menciona SAP, usa type:"sap" con el nombre de la transacción como label.
8. Extrae notas al pie relevantes (periodicidad, documentos, sistemas usados).
9. El schema de salida es exactamente el especificado. No agregues campos extra.

CONTEXTO DE MAXION WHEELS:
- Procesos comunes: CIP, Capitalización, Depreciación (AFAB), Baja de Activos, CAPEX
- Sistemas: SAP (transacciones: AFAB, KO8G, KO88, AS01, ABAVN, etc.)
- Áreas: Analista AF, Requisitor, Finanzas, Contabilidad, Controller, FP&A, Gerente de Planta
`;
```

---

## FUNCIONALIDADES REQUERIDAS

### 1. Chat con la IA (panel izquierdo)
- Input de texto multilínea para describir el proceso
- La IA hace preguntas de clarificación si la descripción es incompleta
- Historial de conversación visible
- Botón "Generar Diagrama"
- Opción de iterar: "Agrega un paso de aprobación antes del paso 3"

### 2. Canvas del Diagrama (panel derecho)
- Renderizado SVG en tiempo real al recibir el JSON
- Swimlanes con labels en columna izquierda
- Phase bar horizontal en la parte superior
- Nodos con step numbers (círculos numerados)
- Flechas con routing inteligente (evitar solapamiento)
- Zoom in/out con botones y scroll
- Pan (arrastrar el canvas)

### 3. Edición Manual
- Click en un nodo para editar su texto
- Drag & drop para reordenar nodos dentro de un lane
- Botón para agregar nodo antes/después de uno existente
- Botón para agregar un nuevo lane

### 4. Biblioteca de Procesos
- Lista de procesos guardados (localStorage)
- Iconos: CIP, Capitalización, Depreciación, Baja de Activos, CAPEX
- Cargar proceso existente para editar
- Duplicar proceso

### 5. Exportación
- **PNG** — alta resolución (2x) para incluir en reportes
- **HTML** — archivo autocontenido como los generados en esta sesión
- **Copiar SVG** — para pegar en PowerPoint / Word

---

## LAYOUT ENGINE (utils/layoutEngine.js)

El layout engine debe:
1. Agrupar nodos por `laneId` y `phaseId`
2. Calcular posición X según el orden en la fase (izquierda a derecha)
3. Calcular posición Y según el lane (centro del carril)
4. Detectar edges `loop:true` y calcular path curvo por arriba o por abajo
5. Detectar edges cross-lane y usar línea punteada con routing en L
6. Espaciado mínimo entre nodos: 140px horizontal, lane height: 140px

```js
// Ejemplo de output del layout engine:
{
  nodes: [
    { id: 'n1', x: 55,  y: 70,  width: 88,  height: 44 },
    { id: 'n2', x: 230, y: 70,  width: 130, height: 50 },
  ],
  edges: [
    { from: 'n1', to: 'n2', path: 'M 99 70 L 165 70', color: '#0083BE' },
    { from: 'n3', to: 'n1', path: 'M 200 44 L 200 20 L 55 20 L 55 47', color: '#EF4444', dashed: true }
  ],
  svgWidth: 1400,
  svgHeight: 420
}
```

---

## VARIABLES DE ENTORNO (.env)

```
OPENAI_API_KEY=sk-...
PORT=3001
VITE_API_URL=http://localhost:3001
```

---

## COMANDOS PARA INICIAR

```bash
# Instalar todo
npm install

# Desarrollo (frontend + backend concurrentes)
npm run dev

# Solo backend
npm run server

# Build producción
npm run build
```

---

## CRITERIOS DE ACEPTACIÓN

- [ ] El usuario describe un proceso y el diagrama se genera en < 5 segundos
- [ ] Los colores Maxion se aplican correctamente en todos los nodos
- [ ] Los swimlanes reflejan exactamente los actores del proceso descrito
- [ ] Los loops de retorno (caminos NO) se renderizan como flechas curvas visibles
- [ ] El export PNG tiene resolución suficiente para impresión A4
- [ ] Los procesos se guardan y se pueden recargar desde localStorage
- [ ] La app funciona en Chrome, Firefox y Safari modernos
- [ ] El diagrama es legible en pantallas de 1280px de ancho mínimo

---

## PROCESOS PRECARGADOS (demo)

Incluye 3 procesos de ejemplo listos para mostrar:
1. **CIP — Construcción en Progreso** (el proceso mapeado en esta sesión)
2. **Capitalización de Activo Fijo** (CIP → AF con KO8G y KO88)
3. **Depreciación Mensual AFAB**

Cárgalos desde un archivo `src/data/sampleProcesses.js` con el JSON ya estructurado.

---

*Prompt generado durante sesión de mapeo de procesos Maxion Wheels · Activo Fijo*
