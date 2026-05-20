export const SAMPLE_PROCESSES = [
  {
    id: 'cip-construccion-progreso',
    name: 'CIP — Construcción en Progreso',
    icon: '🏗️',
    description: 'Proceso de gestión de órdenes CIP en SAP desde apertura hasta traspaso a Activo Fijo',
    data: {
      title: 'CIP — Construcción en Progreso',
      subtitle: 'MAXION WHEELS · ACTIVO FIJO · PROCESO MENSUAL',
      phases: [
        { id: 'fase1', label: 'FASE 1 — APERTURA', color: '#0083BE' },
        { id: 'fase2', label: 'FASE 2 — SEGUIMIENTO', color: '#F47920' },
        { id: 'fase3', label: 'FASE 3 — CIERRE', color: '#16A34A' }
      ],
      lanes: [
        { id: 'lane_requisitor', label: 'Requisitor', sublabel: 'Área Usuaria', icon: '👤' },
        { id: 'lane_analista', label: 'Analista AF', sublabel: 'Activo Fijo', icon: '📊' },
        { id: 'lane_finanzas', label: 'Controller', sublabel: 'Finanzas', icon: '💼' }
      ],
      nodes: [
        {
          id: 'n1', type: 'start', label: 'INICIO', sublabel: 'Solicitud CAPEX',
          laneId: 'lane_requisitor', phaseId: 'fase1', color: '#0083BE'
        },
        {
          id: 'n2', type: 'document', label: 'CAPEX Request', sublabel: 'Formulario aprobado',
          laneId: 'lane_requisitor', phaseId: 'fase1', color: '#0083BE', badge: null
        },
        {
          id: 'n3', type: 'sap', label: 'KO01', sublabel: 'Apertura Orden CIP',
          laneId: 'lane_analista', phaseId: 'fase1', color: '#16A34A', badge: 'SAP'
        },
        {
          id: 'n4', type: 'decision', label: '¿Facturas\ncompletas?', sublabel: 'Saldo = 0',
          laneId: 'lane_analista', phaseId: 'fase2', color: '#F47920'
        },
        {
          id: 'n5', type: 'activity', label: 'Recopila facturas', sublabel: 'Proveedores',
          laneId: 'lane_requisitor', phaseId: 'fase2', color: '#0083BE', badge: null
        },
        {
          id: 'n6', type: 'sap', label: 'KO88', sublabel: 'Traspaso CIP → AF',
          laneId: 'lane_analista', phaseId: 'fase3', color: '#16A34A', badge: 'SAP'
        },
        {
          id: 'n7', type: 'sap', label: 'AS01', sublabel: 'Creación Activo Fijo',
          laneId: 'lane_analista', phaseId: 'fase3', color: '#16A34A', badge: 'SAP'
        },
        {
          id: 'n8', type: 'activity', label: 'Valida capitalización', sublabel: 'Balance sheet',
          laneId: 'lane_finanzas', phaseId: 'fase3', color: '#0083BE', badge: null
        },
        {
          id: 'n9', type: 'end', label: 'FIN', sublabel: 'CIP capitalizado',
          laneId: 'lane_analista', phaseId: 'fase3', color: '#0083BE'
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: null, style: 'solid', color: '#0083BE' },
        { from: 'n2', to: 'n3', label: null, style: 'dashed', color: '#94a3b8' },
        { from: 'n3', to: 'n4', label: null, style: 'solid', color: '#0083BE' },
        { from: 'n4', to: 'n5', label: 'NO', style: 'dashed', color: '#EF4444' },
        { from: 'n5', to: 'n4', label: null, style: 'dashed', color: '#94a3b8', loop: true },
        { from: 'n4', to: 'n6', label: 'SÍ', style: 'solid', color: '#16A34A' },
        { from: 'n6', to: 'n7', label: null, style: 'solid', color: '#16A34A' },
        { from: 'n7', to: 'n8', label: null, style: 'dashed', color: '#94a3b8' },
        { from: 'n8', to: 'n9', label: null, style: 'solid', color: '#0083BE' }
      ],
      notes: [
        '⏱️ Periodicidad: Mensual (cierre contable)',
        '📄 Documentos: CAPEX Request, Facturas de proveedor',
        '🖥️ Sistema: SAP — Transacciones KO01, KO88, AS01',
        '👥 Actores: Requisitor, Analista AF, Controller'
      ]
    }
  },

  {
    id: 'capitalizacion-activo-fijo',
    name: 'Capitalización de Activo Fijo',
    icon: '🏭',
    description: 'Proceso de capitalización de activos desde orden de inversión hasta creación en SAP',
    data: {
      title: 'Capitalización de Activo Fijo',
      subtitle: 'MAXION WHEELS · ACTIVO FIJO · KO8G / KO88',
      phases: [
        { id: 'fase1', label: 'FASE 1 — PREPARACIÓN', color: '#0083BE' },
        { id: 'fase2', label: 'FASE 2 — CAPITALIZACIÓN', color: '#16A34A' }
      ],
      lanes: [
        { id: 'lane_analista', label: 'Analista AF', sublabel: 'Activo Fijo', icon: '📊' },
        { id: 'lane_contabilidad', label: 'Contabilidad', sublabel: 'Finanzas', icon: '📉' },
        { id: 'lane_excepcion', label: 'FLUJO EXCEPCIÓN', sublabel: 'Error detectado', icon: '⚠️' }
      ],
      nodes: [
        {
          id: 'n1', type: 'start', label: 'INICIO', sublabel: 'Fin de mes',
          laneId: 'lane_analista', phaseId: 'fase1', color: '#0083BE'
        },
        {
          id: 'n2', type: 'activity', label: 'Revisa órdenes CIP', sublabel: 'Reporte de saldos',
          laneId: 'lane_analista', phaseId: 'fase1', color: '#0083BE', badge: null
        },
        {
          id: 'n3', type: 'decision', label: '¿Listo para\ncapitalizar?', sublabel: 'Doc. completa',
          laneId: 'lane_analista', phaseId: 'fase1', color: '#F47920'
        },
        {
          id: 'n4', type: 'activity', label: 'Solicita documentos\nfaltantes', sublabel: 'Al requisitor',
          laneId: 'lane_analista', phaseId: 'fase1', color: '#EF4444', badge: null
        },
        {
          id: 'n5', type: 'sap', label: 'KO8G', sublabel: 'Liquidación masiva',
          laneId: 'lane_analista', phaseId: 'fase2', color: '#16A34A', badge: 'SAP'
        },
        {
          id: 'n6', type: 'sap', label: 'KO88', sublabel: 'Traspaso individual',
          laneId: 'lane_analista', phaseId: 'fase2', color: '#16A34A', badge: 'SAP'
        },
        {
          id: 'n7', type: 'activity', label: 'Valida asientos', sublabel: 'Libro mayor',
          laneId: 'lane_contabilidad', phaseId: 'fase2', color: '#F47920', badge: null
        },
        {
          id: 'n8', type: 'decision', label: '¿Asientos\ncorrectos?', sublabel: 'Revisión',
          laneId: 'lane_contabilidad', phaseId: 'fase2', color: '#F47920'
        },
        {
          id: 'n9', type: 'activity', label: 'Solicita corrección', sublabel: 'A Analista AF',
          laneId: 'lane_excepcion', phaseId: 'fase2', color: '#EF4444', badge: null
        },
        {
          id: 'n10', type: 'end', label: 'FIN', sublabel: 'AF capitalizado',
          laneId: 'lane_analista', phaseId: 'fase2', color: '#0083BE'
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: null, style: 'solid', color: '#0083BE' },
        { from: 'n2', to: 'n3', label: null, style: 'solid', color: '#0083BE' },
        { from: 'n3', to: 'n4', label: 'NO', style: 'dashed', color: '#EF4444' },
        { from: 'n4', to: 'n3', label: null, style: 'dashed', color: '#EF4444', loop: true },
        { from: 'n3', to: 'n5', label: 'SÍ', style: 'solid', color: '#16A34A' },
        { from: 'n5', to: 'n6', label: null, style: 'solid', color: '#16A34A' },
        { from: 'n6', to: 'n7', label: null, style: 'dashed', color: '#94a3b8' },
        { from: 'n7', to: 'n8', label: null, style: 'solid', color: '#F47920' },
        { from: 'n8', to: 'n9', label: 'NO', style: 'dashed', color: '#EF4444' },
        { from: 'n9', to: 'n5', label: null, style: 'dashed', color: '#EF4444', loop: true },
        { from: 'n8', to: 'n10', label: 'SÍ', style: 'solid', color: '#16A34A' }
      ],
      notes: [
        '⏱️ Periodicidad: Mensual (último día hábil)',
        '🖥️ Sistema: SAP — KO8G (masiva), KO88 (individual)',
        '📄 Documento: Reporte de saldos CIP',
        '✅ Resultado: Activo capitalizado en balance'
      ]
    }
  },

  {
    id: 'depreciacion-mensual-afab',
    name: 'Depreciación Mensual AFAB',
    icon: '📉',
    description: 'Proceso mensual de ejecución de depreciación de activos fijos mediante AFAB en SAP',
    data: {
      title: 'Proceso: Depreciación de Activo Fijo (AFAB)',
      subtitle: 'MAXION WHEELS · ACTIVO FIJO · PROCESO MENSUAL · CONFIDENCIAL · V1.0',
      phases: [
        { id: 'fase1', label: 'FASE 1 — CIERRE DE CAPITALIZACIONES Y EJECUCIÓN DE DEPRECIACIÓN', color: '#0083BE' },
        { id: 'fase2', label: 'FASE 2 — VALIDACIÓN Y CIERRE', color: '#F47920' }
      ],
      lanes: [
        { id: 'lane_requisitor', label: 'Requisitor', sublabel: 'Área Usuaria', icon: '👤' },
        { id: 'lane_analista', label: 'Analista AF', sublabel: 'Activo Fijo', icon: '📊' },
        { id: 'lane_contabilidad', label: 'Contabilidad', sublabel: 'Finanzas', icon: '📉' },
        { id: 'lane_excepcion', label: 'FLUJO EXCEPCIÓN', sublabel: 'Error detectado', icon: '⚠️' }
      ],
      nodes: [
        {
          id: 'n1', type: 'start', label: 'INICIO', sublabel: 'Mensual',
          laneId: 'lane_requisitor', phaseId: 'fase1', color: '#0083BE'
        },
        {
          id: 'n2', type: 'activity', label: 'Envía mensaje por chat:', sublabel: '"No más capitalizaciones este mes"',
          laneId: 'lane_requisitor', phaseId: 'fase1', color: '#0083BE', badge: null
        },
        {
          id: 'n3', type: 'sap', label: 'AFAB', sublabel: 'Ejecuta depreciación del período',
          laneId: 'lane_analista', phaseId: 'fase1', color: '#16A34A', badge: 'SAP'
        },
        {
          id: 'n4', type: 'activity', label: 'Valida asientos y montos depreciados', sublabel: 'Reporte SAP (solo revisión)',
          laneId: 'lane_contabilidad', phaseId: 'fase2', color: '#F47920', badge: null
        },
        {
          id: 'n5', type: 'decision', label: '¿Correcto?', sublabel: 'Validación OK',
          laneId: 'lane_contabilidad', phaseId: 'fase2', color: '#F47920'
        },
        {
          id: 'n6', type: 'activity', label: 'Solicita apoyo a corporativo', sublabel: null,
          laneId: 'lane_excepcion', phaseId: 'fase2', color: '#EF4444', badge: null
        },
        {
          id: 'n7', type: 'activity', label: 'Se corrige el error', sublabel: null,
          laneId: 'lane_excepcion', phaseId: 'fase2', color: '#EF4444', badge: null
        },
        {
          id: 'n8', type: 'end', label: 'FIN', sublabel: 'Depreciación OK',
          laneId: 'lane_contabilidad', phaseId: 'fase2', color: '#0083BE'
        }
      ],
      edges: [
        { from: 'n1', to: 'n2', label: null, style: 'solid', color: '#0083BE' },
        { from: 'n2', to: 'n3', label: null, style: 'dashed', color: '#94a3b8' },
        { from: 'n3', to: 'n4', label: null, style: 'dashed', color: '#94a3b8' },
        { from: 'n4', to: 'n5', label: null, style: 'solid', color: '#F47920' },
        { from: 'n5', to: 'n8', label: 'SÍ', style: 'solid', color: '#16A34A' },
        { from: 'n5', to: 'n6', label: 'NO', style: 'dashed', color: '#EF4444' },
        { from: 'n6', to: 'n7', label: null, style: 'solid', color: '#EF4444' },
        { from: 'n7', to: 'n3', label: 'Regresa a ejecutar AFAB', style: 'dashed', color: '#EF4444', loop: true }
      ],
      notes: [
        '⏱️ Periodicidad: Mensual (cierre contable)',
        '💬 Comunicación: Chat informal Requisitor → Analista AF',
        '📄 Reporte SAP: Solo para revisión, no se archiva formalmente',
        '⚠️ Excepción: Se activa solo cuando Contabilidad detecta errores'
      ]
    }
  }
];

export default SAMPLE_PROCESSES;
