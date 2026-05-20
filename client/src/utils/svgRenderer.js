/**
 * SVG Renderer — font size is ALWAYS fixed.
 * Nodes grow to fit their text (handled by layoutEngine.js).
 */

import { computeLayout, LANE_LABEL_WIDTH, PHASE_BAR_HEIGHT } from './layoutEngine.js';

// ─── Color helpers ────────────────────────────────────────────────────────────

function darken(hex, amount = 0.15) {
  let r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
  r = Math.max(0, Math.floor(r*(1-amount))); g = Math.max(0, Math.floor(g*(1-amount))); b = Math.max(0, Math.floor(b*(1-amount)));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function lighten(hex, amount = 0.9) {
  let r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
  r = Math.min(255, Math.floor(r+(255-r)*amount)); g = Math.min(255, Math.floor(g+(255-g)*amount)); b = Math.min(255, Math.floor(b+(255-b)*amount));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

const MARKER_MAP = {
  '#0083BE':'ab','#F47920':'ao','#EF4444':'ar','#ef4444':'ar',
  '#16A34A':'ag','#16a34a':'ag','#94a3b8':'a0','#94A3B8':'a0',
};
function getMarker(c) { return MARKER_MAP[c] || 'a0'; }

function escapeXml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

// ─── Text wrap (pixel-width based, FIXED font) ───────────────────────────────

function wrapText(text, maxPxWidth, avgCharPx) {
  if (!text) return [''];
  const maxChars = Math.max(5, Math.floor(maxPxWidth / avgCharPx));
  const lines = [];
  for (const para of String(text).split(/\\n|\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let cur = '';
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (test.length <= maxChars) { cur = test; }
      else { if (cur) lines.push(cur); cur = word; }
    }
    if (cur) lines.push(cur);
  }
  return lines.length ? lines : [''];
}

// ─── Clip path definitions ────────────────────────────────────────────────────

function buildClipPaths(nodes) {
  return nodes.map(({ cx, cy, w, h, type, id }) => {
    const x = cx - w/2, y = cy - h/2;
    if (type === 'start' || type === 'end')
      return `<clipPath id="clip_${id}"><ellipse cx="${cx}" cy="${cy}" rx="${w/2}" ry="${h/2}"/></clipPath>`;
    if (type === 'decision' || type === 'milestone') {
      const arm = Math.min(w,h)/2;
      return `<clipPath id="clip_${id}"><polygon points="${cx},${cy-arm} ${cx+arm},${cy} ${cx},${cy+arm} ${cx-arm},${cy}"/></clipPath>`;
    }
    return `<clipPath id="clip_${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/></clipPath>`;
  }).join('\n    ');
}

// ─── Node renderers (fixed font, node already sized by layout) ───────────────

const LINE_H = 12; // must match layoutEngine.js

function renderEllipse(node) {
  const { cx, cy, w, h, label, sublabel, color, id } = node;
  const subColor = lighten(color, 0.6);

  // Wrap text to fit inside ellipse (usable width ≈ 72% of total width)
  const lines = label ? wrapText(label, w * 0.72, 5.6) : [];
  const totalTextH = lines.length * LINE_H;
  // Center the text block; shift up slightly if sublabel exists
  const textStartY = cy - totalTextH / 2 + LINE_H * 0.82 - (sublabel ? 5 : 0);

  const textLines = lines.map((line, i) =>
    `<text x="${cx}" y="${textStartY + i * LINE_H}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9.5" font-weight="700" fill="white">${escapeXml(line)}</text>`
  ).join('\n    ');

  return `
  <ellipse cx="${cx}" cy="${cy}" rx="${w/2}" ry="${h/2}" fill="${color}" stroke="${darken(color,0.15)}" stroke-width="1.5" filter="url(#sh)"/>
  <g clip-path="url(#clip_${id})">
    ${textLines}
    ${sublabel ? `<text x="${cx}" y="${textStartY + totalTextH + 2}" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="${subColor}">${escapeXml(sublabel)}</text>` : ''}
  </g>`;
}

function renderActivity(node, stepNum) {
  const { cx, cy, w, h, label, sublabel, color, type, id } = node;
  const x = cx - w/2, y = cy - h/2;
  const isSap     = type === 'sap';
  const fillColor = isSap ? lighten(color, 0.93) : '#ffffff';
  const textColor = darken(color, 0.2);

  // Fixed font — no shrinking
  const fontSize  = isSap ? 10 : 9.5;
  const charPx    = isSap ? 6.0 : 5.6;
  const textAreaW = w - 18;

  const topPad = isSap ? 16 : 10;
  const botPad = sublabel ? 18 : 10;
  const textAreaH = h - topPad - botPad;

  const lines = wrapText(label, textAreaW, charPx);
  const totalTextH = lines.length * LINE_H;
  // Center text block within available text area
  const textStartY = y + topPad + (textAreaH - totalTextH) / 2 + LINE_H * 0.8;

  let s = `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fillColor}" stroke="${color}" stroke-width="1.8" filter="url(#sh)"/>`;

  if (isSap) {
    const bw = 36, bh = 14;
    s += `
  <rect x="${x+w-bw-2}" y="${y-6}" width="${bw}" height="${bh}" rx="3" fill="${color}"/>
  <text x="${x+w-bw/2-2}" y="${y+4}" text-anchor="middle" dominant-baseline="middle" font-family="IBM Plex Mono" font-size="7.5" font-weight="700" fill="white">SAP</text>`;
  }

  s += `\n  <g clip-path="url(#clip_${id})">`;
  lines.forEach((line, i) => {
    s += `\n    <text x="${cx}" y="${textStartY + i*LINE_H}" text-anchor="middle" font-family="${isSap ? 'IBM Plex Mono' : 'IBM Plex Sans'}" font-size="${fontSize}" font-weight="${isSap ? 700 : 600}" fill="${textColor}">${escapeXml(line)}</text>`;
  });
  if (sublabel) {
    s += `\n    <text x="${cx}" y="${y+h-6}" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="${color}" opacity="0.85">${escapeXml(sublabel)}</text>`;
  }
  s += `\n  </g>`;

  if (stepNum !== undefined) {
    s += `\n  <circle cx="${x+10}" cy="${y-7}" r="8.5" fill="${color}" stroke="white" stroke-width="1.5"/><text x="${x+10}" y="${y-3}" text-anchor="middle" dominant-baseline="middle" font-family="IBM Plex Mono" font-size="8" font-weight="700" fill="white">${stepNum}</text>`;
  }
  return s;
}

function renderDecision(node) {
  const { cx, cy, w, h, label, sublabel, color, id } = node;
  const arm = Math.min(w,h)/2;
  // Fixed font — diamond sized to fit
  const textW  = arm * 1.35;
  const lines  = wrapText(label, textW, 5.2);
  const totalH = lines.length * LINE_H;
  const startY = cy - totalH/2 + LINE_H * 0.8;

  return `
  <polygon points="${cx},${cy-arm} ${cx+arm},${cy} ${cx},${cy+arm} ${cx-arm},${cy}" fill="#ffffff" stroke="${color}" stroke-width="1.8" filter="url(#sh)"/>
  <g clip-path="url(#clip_${id})">
    ${lines.map((line,i) => `<text x="${cx}" y="${startY+i*LINE_H}" text-anchor="middle" font-family="IBM Plex Sans" font-size="9" font-weight="700" fill="${darken(color,0.2)}">${escapeXml(line)}</text>`).join('\n    ')}
    ${sublabel ? `<text x="${cx}" y="${cy+arm-8}" text-anchor="middle" font-family="IBM Plex Mono" font-size="7" fill="${color}" opacity="0.8">${escapeXml(sublabel)}</text>` : ''}
  </g>`;
}

function renderDocument(node, stepNum) {
  const { cx, cy, w, h, label, sublabel, color, id } = node;
  const x = cx - w/2, y = cy - h/2;
  const waveY = y + h;
  const path = `M ${x+6} ${y} L ${x+w-6} ${y} Q ${x+w} ${y} ${x+w} ${y+6} L ${x+w} ${waveY-5} Q ${x+w*0.75} ${waveY+5} ${x+w/2} ${waveY-2} Q ${x+w*0.25} ${waveY-5} ${x} ${waveY} L ${x} ${y+6} Q ${x} ${y} ${x+6} ${y}`;

  const lines = wrapText(label, w-18, 5.6);
  const totalH = lines.length * LINE_H;
  const topPad = 10, botPad = sublabel ? 18 : 10;
  const textAreaH = h - topPad - botPad;
  const startY = y + topPad + (textAreaH - totalH)/2 + LINE_H*0.8;

  let s = `
  <path d="${path}" fill="#ffffff" stroke="${color}" stroke-width="1.5" filter="url(#sh)"/>
  <g clip-path="url(#clip_${id})">`;
  lines.forEach((line,i) => {
    s += `\n    <text x="${cx}" y="${startY+i*LINE_H}" text-anchor="middle" font-family="IBM Plex Sans" font-size="9.5" font-weight="600" fill="${darken(color,0.2)}">${escapeXml(line)}</text>`;
  });
  if (sublabel) s += `\n    <text x="${cx}" y="${y+h-6}" text-anchor="middle" font-family="IBM Plex Mono" font-size="7.5" fill="${color}" opacity="0.85">${escapeXml(sublabel)}</text>`;
  s += `\n  </g>`;
  if (stepNum !== undefined) {
    s += `\n  <circle cx="${x+10}" cy="${y-7}" r="8.5" fill="${color}" stroke="white" stroke-width="1.5"/><text x="${x+10}" y="${y-3}" text-anchor="middle" dominant-baseline="middle" font-family="IBM Plex Mono" font-size="8" font-weight="700" fill="white">${stepNum}</text>`;
  }
  return s;
}

function renderNode(node, stepNum) {
  switch (node.type) {
    case 'start': case 'end':    return renderEllipse(node);
    case 'activity': case 'sap': return renderActivity(node, stepNum);
    case 'decision': case 'milestone': return renderDecision(node);
    case 'document':             return renderDocument(node, stepNum);
    default:                     return renderActivity(node, stepNum);
  }
}

// ─── Edge helpers ─────────────────────────────────────────────────────────────

function offsetPath(pathStr, dx, dy) {
  return pathStr.replace(/([ML])\s*(-?\d+\.?\d*)\s*(-?\d+\.?\d*)/g,
    (_, cmd, x, y) => `${cmd} ${(parseFloat(x)+dx).toFixed(1)} ${(parseFloat(y)+dy).toFixed(1)}`
  );
}

function edgeLabelPos(pathStr) {
  const nums = pathStr.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (nums.length < 4) return null;
  const mid = Math.floor(nums.length/4)*2;
  return { x:(nums[mid]+(nums[mid+2]??nums[0]))/2, y:(nums[mid+1]+(nums[mid+3]??nums[1]))/2 };
}

// ─── Main SVG generator ───────────────────────────────────────────────────────

export function generateSVG(process) {
  const layout = computeLayout(process);
  if (!layout) return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="20" y="100" font-family="sans-serif" font-size="14">Sin datos</text></svg>';

  const { nodes, edges, lanes, phases, svgWidth, svgHeight } = layout;
  const LLW = LANE_LABEL_WIDTH, PHB = PHASE_BAR_HEIGHT;
  const W = svgWidth - LLW, H = svgHeight;
  const loopH  = edges.some(e => e.isLoop) ? 56 : 0;
  const totalH = H - PHB + loopH;

  const svgNodes = nodes.map(n => ({ ...n, cx: n.cx-LLW, cy: n.cy-PHB }));
  const clipPaths = buildClipPaths(svgNodes);

  const defs = `<defs>
    <marker id="a0" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#94a3b8"/></marker>
    <marker id="ab" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#0083BE"/></marker>
    <marker id="ao" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#F47920"/></marker>
    <marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#EF4444"/></marker>
    <marker id="ag" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#16A34A"/></marker>
    <filter id="sh"><feDropShadow dx="0" dy="1" stdDeviation="2.5" flood-color="#000" flood-opacity="0.08"/></filter>
    ${clipPaths}
  </defs>`;

  let laneBGs = '', phaseTints = '', phaseDividers = '', laneDividers = '';

  lanes.forEach((lane, i) => {
    const laneY = lane.top - PHB;
    const isExc = (lane.label||'').toUpperCase().includes('EXCEPCI');
    laneBGs += `<rect x="0" y="${laneY}" width="${W}" height="${lane.height}" fill="${isExc ? '#fff5f5' : (i%2===0 ? '#f8fafc' : '#ffffff')}"/>`;
    if (i > 0) laneDividers += `<line x1="0" y1="${laneY}" x2="${W}" y2="${laneY}" stroke="${isExc?'#fecaca':'#e2e8f0'}" stroke-width="1.2" ${isExc?'stroke-dasharray="6,3"':''}/>`;
  });

  phases.forEach((phase, idx) => {
    phaseTints += `<rect x="${phase.startX-LLW}" y="0" width="${phase.width}" height="${H}" fill="${idx%2===0?'#0083BE':'#F47920'}" opacity="0.025"/>`;
    if (idx > 0) phaseDividers += `<line x1="${phase.startX-LLW}" y1="0" x2="${phase.startX-LLW}" y2="${H}" stroke="#0083BE" stroke-width="1" stroke-dasharray="5,4" opacity="0.3"/>`;
  });

  const dx = -LLW, dy = -PHB;
  let edgeSvg = '';
  edges.forEach(edge => {
    if (!edge.path) return;
    const color = edge.color || '#94a3b8';
    const off   = offsetPath(edge.path, dx, dy);
    edgeSvg += `<path d="${off}" fill="none" stroke="${color}" stroke-width="1.5" ${edge.dashed?'stroke-dasharray="5,3"':''} marker-end="url(#${getMarker(color)})"/>`;

    if (edge.label) {
      const pos = edgeLabelPos(off);
      if (pos) {
        const bg = (color==='#EF4444'||color==='#ef4444') ? '#fff5f5' : '#eff8ff';
        edgeSvg += `<rect x="${pos.x-13}" y="${pos.y-9}" width="26" height="14" rx="3" fill="${bg}" stroke="${color}" stroke-width="0.8" opacity="0.95"/>`;
        edgeSvg += `<text x="${pos.x}" y="${pos.y+1}" text-anchor="middle" dominant-baseline="middle" font-family="IBM Plex Mono" font-size="8" font-weight="700" fill="${color}">${escapeXml(edge.label)}</text>`;
      }
    }
    if (edge.isLoop && edge.label) {
      const coords = off.match(/-?\d+\.?\d*/g)?.map(Number)||[];
      if (coords.length >= 4) {
        const loopY = Math.max(...coords.filter((_,i)=>i%2===1)) + 14;
        const loopX = (coords[0]+coords[coords.length-2])/2;
        edgeSvg += `<rect x="${loopX-90}" y="${loopY-8}" width="180" height="15" rx="3" fill="#fff5f5" stroke="#fecaca" stroke-width="1"/>`;
        edgeSvg += `<text x="${loopX}" y="${loopY+3}" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" fill="#EF4444">↺ ${escapeXml(edge.label)}</text>`;
      }
    }
  });

  let stepNum = 1;
  const stepMap = {};
  nodes.forEach(n => { if (n.type!=='start'&&n.type!=='end') stepMap[n.id]=stepNum++; });

  let nodeSvg = '';
  svgNodes.forEach(node => { nodeSvg += renderNode(node, stepMap[node.id]); });

  const watermark = `<text x="${W-12}" y="${totalH-6}" text-anchor="end" font-family="IBM Plex Mono" font-size="8" fill="#0083BE" opacity="0.3">MAXION WHEELS · ACTIVO FIJO</text>`;

  return `<svg viewBox="0 0 ${W} ${totalH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${totalH}px;display:block;">
  ${defs}${laneBGs}${phaseTints}${phaseDividers}${laneDividers}${edgeSvg}${nodeSvg}${watermark}
</svg>`;
}

// ─── Phase bar HTML ───────────────────────────────────────────────────────────

export function generatePhaseBar(layout) {
  const { phases } = layout;
  const LLW = LANE_LABEL_WIDTH;
  const bgs  = ['#eff8ff','#fff7ed','#f0fdf4','#fdf4ff'];
  const txts = ['#0083BE','#c2410c','#166534','#7e22ce'];
  let html = `<div style="display:flex;height:32px;"><div style="width:${LLW}px;min-width:${LLW}px;background:#f8fafc;border-right:1px solid #e2e8f0;flex-shrink:0;"></div>`;
  phases.forEach((p,idx) => {
    const sep = idx<phases.length-1?'border-right:1px solid #e2e8f0;':'';
    html += `<div style="flex:${p.width};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;background:${bgs[idx%bgs.length]};color:${txts[idx%txts.length]};${sep}padding:0 8px;text-align:center;overflow:hidden;">● ${escapeXml(p.label)}</div>`;
  });
  return html + '</div>';
}

// ─── Lane labels HTML ─────────────────────────────────────────────────────────

export function generateLaneLabels(layout) {
  const { lanes } = layout;
  const LLW = LANE_LABEL_WIDTH;
  let html = `<div style="width:${LLW}px;min-width:${LLW}px;flex-shrink:0;">`;
  lanes.forEach((lane, idx) => {
    const isExc = (lane.label||'').toUpperCase().includes('EXCEPCI');
    const bg = isExc ? '#fff5f5' : (idx%2===0 ? '#f8fafc' : '#fff');
    const bc = isExc ? '#fecaca' : '#e2e8f0';
    const lc = isExc ? '#ef4444' : '#0f172a';
    html += `<div style="height:${lane.height}px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;border-right:1px ${isExc?'dashed':'solid'} ${bc};border-top:1px solid ${bc};text-align:center;gap:5px;background:${bg};">`;
    html += `<div style="font-size:20px;line-height:1;">${escapeXml(lane.icon||'👤')}</div>`;
    html += `<div style="font-size:11px;font-weight:700;color:${lc};line-height:1.3;word-break:break-word;">${escapeXml(lane.label)}</div>`;
    if (lane.sublabel) html += `<div style="font-size:9px;color:#94a3b8;font-family:'IBM Plex Mono',monospace;">${escapeXml(lane.sublabel)}</div>`;
    html += '</div>';
  });
  return html + '</div>';
}

// ─── HTML export ──────────────────────────────────────────────────────────────

export function generateHTMLExport(process) {
  const layout = computeLayout(process);
  if (!layout) return '';
  const svgStr   = generateSVG(process);
  const phaseBar = generatePhaseBar(layout);
  const labels   = generateLaneLabels(layout);
  const notes    = (process.notes||[]).map(n=>`<div class="note">${escapeXml(n)}</div>`).join('\n');
  const date     = new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${escapeXml(process.title)} – Maxion Wheels</title>
<style>@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{background:#f0f4f8;font-family:'IBM Plex Sans',sans-serif;color:#0f172a;min-height:100vh;padding:28px 24px}.header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;gap:16px;flex-wrap:wrap}.header-left{display:flex;align-items:center;gap:14px}.mw-logo{background:#0083BE;width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:14px;color:white;flex-shrink:0;box-shadow:0 4px 14px #0083BE44}.header-text h1{font-size:20px;font-weight:700;color:#0f172a}.header-text p{font-size:11px;color:#0083BE;font-family:'IBM Plex Mono',monospace;margin-top:4px}.legend{display:flex;gap:14px;flex-wrap:wrap;align-items:center}.legend-item{display:flex;align-items:center;gap:6px;font-size:11px;color:#64748b;font-family:'IBM Plex Mono',monospace}.legend-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0}.zoom-bar{display:flex;gap:10px;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:10px 10px 0 0;padding:10px 18px;flex-wrap:wrap}.zbtn{background:#f8fafc;border:1px solid #cbd5e1;padding:5px 14px;border-radius:30px;font-size:13px;font-weight:600;cursor:pointer;font-family:'IBM Plex Mono',monospace;color:#334155}.zbtn:hover{background:#e2e8f0}.zreset{background:#eff8ff;border-color:#0083BE;color:#0083BE}.zlevel{margin-left:auto;font-size:12px;font-family:'IBM Plex Mono',monospace;background:#eff8ff;padding:4px 12px;border-radius:40px;color:#0083BE;border:1px solid #bfdbfe}.diagram-wrapper{overflow:auto;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.07)}.zoom-content{transform-origin:0 0;transition:transform .1s ease;width:fit-content}.notes-bar{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 18px;margin-top:14px;display:flex;gap:24px;flex-wrap:wrap}.note{font-size:11px;color:#64748b;font-family:'IBM Plex Mono',monospace}.footer{margin-top:18px;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;font-family:'IBM Plex Mono',monospace;padding:0 4px;flex-wrap:wrap;gap:8px}</style></head><body>
<div class="header"><div class="header-left"><div class="mw-logo">MW</div><div class="header-text"><h1>${escapeXml(process.title)}</h1><p>${escapeXml(process.subtitle||'MAXION WHEELS · ACTIVO FIJO')}</p></div></div><div class="legend"><div class="legend-item"><div class="legend-dot" style="background:#0083BE"></div>FLUJO</div><div class="legend-item"><div class="legend-dot" style="background:#F47920"></div>DECISIÓN</div><div class="legend-item"><div class="legend-dot" style="background:#16A34A"></div>SAP</div><div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>EXCEPCIÓN</div></div></div>
<div class="zoom-bar"><button class="zbtn" id="zIn">🔍+ Acercar</button><button class="zbtn" id="zOut">🔍− Alejar</button><button class="zbtn zreset" id="zReset">⟳ Restablecer</button><div class="zlevel" id="zLvl">100%</div></div>
<div class="diagram-wrapper"><div class="zoom-content" id="zc" style="min-width:${layout.svgWidth}px;">${phaseBar}<div style="display:flex;">${labels}<div style="flex:1;">${svgStr}</div></div></div></div>
${notes ? `<div class="notes-bar">${notes}</div>` : ''}
<div class="footer"><div>Maxion Wheels · ${escapeXml(process.title)}</div><div>${date}</div></div>
<script>(function(){const c=document.getElementById('zc'),l=document.getElementById('zLvl');let z=1;function a(){c.style.transform='scale('+z+')';l.innerText=Math.round(z*100)+'%';}document.getElementById('zIn').onclick=()=>{if(z<2.5){z=+(z+0.1).toFixed(1);a();}};document.getElementById('zOut').onclick=()=>{if(z>0.4){z=+(z-0.1).toFixed(1);a();}};document.getElementById('zReset').onclick=()=>{z=1;a();};a();})();</script>
</body></html>`;
}
