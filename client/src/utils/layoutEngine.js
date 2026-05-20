/**
 * Layout Engine — calculates x/y positions for all nodes in the swimlane diagram.
 * Node sizes are dynamic: the box grows to fit the text, not the other way around.
 */

export const LANE_LABEL_WIDTH = 158;
export const PHASE_BAR_HEIGHT = 32;
export const DEFAULT_LANE_HEIGHT = 150;
export const EXCEPTION_LANE_HEIGHT = 120;

const NODE_H_SPACING  = 180;   // min horizontal gap between node centers
const PHASE_MIN_WIDTH = 260;
const SVG_PADDING_RIGHT = 60;

// Fixed font metrics (IBM Plex Sans 9.5px ≈ 5.6px/char, Mono 10px ≈ 6.0px/char)
const ACTIVITY_FONT_PX  = 5.6;
const SAP_FONT_PX       = 6.0;
const DECISION_FONT_PX  = 5.2;
const LINE_H            = 12;   // px per text line

// ─── Text wrapping (char-budget estimate) ────────────────────────────────────

function countLines(text, maxPxWidth, avgCharPx) {
  if (!text) return 1;
  const maxChars = Math.max(5, Math.floor(maxPxWidth / avgCharPx));
  let lines = 0;
  for (const para of String(text).split(/\\n|\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { lines++; continue; }
    let cur = '';
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (test.length <= maxChars) { cur = test; }
      else { if (cur) lines++; cur = word; }
    }
    if (cur) lines++;
  }
  return Math.max(1, lines);
}

// ─── Dynamic node dimensions ─────────────────────────────────────────────────

function calcNodeDims(node) {
  // User can override dimensions via customW / customH
  if (node.customW && node.customH) return { w: node.customW, h: node.customH };
  if (node.customW) {
    // only width is custom — still auto-calc height using the custom width
  }
  const { type, label = '', sublabel } = node;

  if (type === 'start' || type === 'end') {
    const charPx = 5.6;
    const minW = 96, minH = 46;
    // Usable text width inside ellipse ≈ 72% of total width (chord at center)
    let w = minW;
    let lines = countLines(label, w * 0.72, charPx);
    // Widen if text needs more than 2 lines
    while (lines > 2 && w < 200) {
      w += 16;
      lines = countLines(label, w * 0.72, charPx);
    }
    // Height: usable vertical ≈ 65% of total height
    const h = Math.max(minH, Math.ceil(lines * LINE_H / 0.65) + 8);
    return { w, h };
  }

  if (type === 'decision' || type === 'milestone') {
    // Diamond: arm = half-size. Grow arm until text fits inside usable chord.
    // At arm=50 the usable text width ≈ arm*1.35 = 67px
    let arm = 52;
    const maxArm = 90;
    while (arm < maxArm) {
      const textW = arm * 1.35;
      const lines = countLines(label, textW, DECISION_FONT_PX);
      // Fit constraint: lines * LINE_H < arm * 1.4  (vertical chord at center)
      if (lines * LINE_H <= arm * 1.3) break;
      arm += 6;
    }
    return { w: arm * 2, h: arm * 2 };
  }

  // activity, sap, document
  const isSap  = type === 'sap';
  const charPx = isSap ? SAP_FONT_PX : ACTIVITY_FONT_PX;

  // Fixed width; let height grow
  const fixedW   = 155;
  const textAreaW = fixedW - 18;
  const lines     = countLines(label, textAreaW, charPx);

  const topPad = isSap ? 16 : 10;
  const botPad = sublabel ? 18 : 10;
  const neededH = topPad + botPad + lines * LINE_H;
  const minH    = 54;

  return { w: fixedW, h: Math.max(minH, neededH) };
}

function isExceptionLane(label = '') {
  const u = label.toUpperCase();
  return u.includes('EXCEPCI') || u.includes('EXCEPTION');
}

// ─── Main layout computation ──────────────────────────────────────────────────

export function computeLayout(process) {
  if (!process || !process.nodes || !process.lanes || !process.phases) return null;

  const { phases, lanes, nodes, edges } = process;

  // ── Lane heights — grow to fit the tallest node in that lane ──────────────
  const laneHeights = lanes.map(lane => {
    if (isExceptionLane(lane.label)) return EXCEPTION_LANE_HEIGHT;
    const laneNodes = nodes.filter(n => n.laneId === lane.id);
    const maxNodeH  = laneNodes.length
      ? Math.max(...laneNodes.map(n => calcNodeDims(n).h))
      : 0;
    return Math.max(DEFAULT_LANE_HEIGHT, maxNodeH + 50); // 25px padding top+bottom
  });

  // ── Lane Y positions ──────────────────────────────────────────────────────
  const laneYMap = {};
  let y = PHASE_BAR_HEIGHT;
  lanes.forEach((lane, i) => {
    laneYMap[lane.id] = { top: y, center: y + laneHeights[i] / 2, height: laneHeights[i] };
    y += laneHeights[i];
  });
  const totalSvgHeight = y;

  // ── Group nodes by phase ──────────────────────────────────────────────────
  const phaseNodeMap = {};
  phases.forEach(p => { phaseNodeMap[p.id] = []; });
  nodes.forEach(node => {
    if (phaseNodeMap[node.phaseId]) phaseNodeMap[node.phaseId].push(node.id);
  });

  // ── Node positions ────────────────────────────────────────────────────────
  const nodePositions = {};
  let cursorX = LANE_LABEL_WIDTH;
  const phaseXMap = {};

  phases.forEach(phase => {
    const phaseStart   = cursorX;
    const nodesInPhase = phaseNodeMap[phase.id] || [];

    // Group by lane
    const byLane = {};
    lanes.forEach(l => { byLane[l.id] = []; });
    nodesInPhase.forEach(nid => {
      const node = nodes.find(n => n.id === nid);
      if (node && byLane[node.laneId] !== undefined) byLane[node.laneId].push(nid);
    });

    // Phase width = widest lane determines spacing
    const maxLaneNodes = Math.max(...lanes.map(l => byLane[l.id].length), 1);

    // Per-lane: use actual node widths + spacing
    let phaseWidth = PHASE_MIN_WIDTH;
    lanes.forEach(lane => {
      const laneNodeIds = byLane[lane.id];
      if (!laneNodeIds.length) return;
      const totalW = laneNodeIds.reduce((sum, nid) => {
        const node = nodes.find(n => n.id === nid);
        return sum + (node ? calcNodeDims(node).w : 155);
      }, 0);
      const spacingW = (laneNodeIds.length - 1) * (NODE_H_SPACING - 155) + 60;
      phaseWidth = Math.max(phaseWidth, totalW + spacingW);
    });

    phaseXMap[phase.id] = { startX: phaseStart, width: phaseWidth };

    // Assign positions for each node, centered within phase
    lanes.forEach(lane => {
      const laneNodeIds = byLane[lane.id];
      const laneInfo    = laneYMap[lane.id];
      const count       = laneNodeIds.length;

      laneNodeIds.forEach((nid, idx) => {
        const node = nodes.find(n => n.id === nid);
        const dims = calcNodeDims(node);

        // Distribute evenly
        const totalSpan  = (count - 1) * NODE_H_SPACING;
        const startOffset = (phaseWidth - totalSpan) / 2;
        const nodeX = phaseStart + startOffset + idx * NODE_H_SPACING;
        const nodeY = laneInfo.center;

        nodePositions[nid] = { cx: nodeX, cy: nodeY, x: nodeX, y: nodeY, ...dims };
      });
    });

    cursorX += phaseWidth;
  });

  const totalSvgWidth = cursorX + SVG_PADDING_RIGHT;

  // ── Edge paths ────────────────────────────────────────────────────────────
  const computedEdges = (edges || []).map(edge => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode   = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return { ...edge, path: '', dashed: false };

    const fPos = nodePositions[edge.from];
    const tPos = nodePositions[edge.to];
    if (!fPos || !tPos) return { ...edge, path: '', dashed: false };

    const dashed      = edge.style === 'dashed';
    const isCrossLane = fromNode.laneId !== toNode.laneId;
    const isLoop      = edge.loop === true;
    let path = '';

    if (isLoop) {
      const loopY = totalSvgHeight + 26;
      let fromX, fromY;
      if (fromNode.type === 'decision') { fromX = fPos.cx; fromY = fPos.cy + fPos.h / 2; }
      else { fromX = fPos.cx + fPos.w / 2; fromY = fPos.cy; }
      let toX, toY;
      if (toNode.type === 'decision')  { toX = tPos.cx - tPos.w / 2; toY = tPos.cy; }
      else { toX = tPos.cx - tPos.w / 2; toY = tPos.cy; }
      path = `M ${fromX} ${fromY} L ${fromX} ${loopY} L ${toX - 22} ${loopY} L ${toX - 22} ${toY} L ${toX} ${toY}`;

    } else if (isCrossLane) {
      const goingDown = fPos.cy < tPos.cy;
      const fromX = fPos.cx;
      const fromY = goingDown ? fPos.cy + fPos.h / 2 : fPos.cy - fPos.h / 2;
      const toX   = tPos.cx;
      const toY   = goingDown ? tPos.cy - tPos.h / 2 : tPos.cy + tPos.h / 2;
      const midY  = (fromY + toY) / 2;
      path = Math.abs(fromX - toX) < 10
        ? `M ${fromX} ${fromY} L ${toX} ${toY}`
        : `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`;

    } else {
      const goingRight = tPos.cx >= fPos.cx;
      const fromX = fromNode.type === 'decision'
        ? (goingRight ? fPos.cx + fPos.w / 2 : fPos.cx - fPos.w / 2)
        : (goingRight ? fPos.cx + fPos.w / 2 : fPos.cx - fPos.w / 2);
      const fromY = fPos.cy;
      const toX   = toNode.type === 'decision'
        ? (goingRight ? tPos.cx - tPos.w / 2 : tPos.cx + tPos.w / 2)
        : (goingRight ? tPos.cx - tPos.w / 2 : tPos.cx + tPos.w / 2);
      const toY   = tPos.cy;
      path = Math.abs(fromY - toY) < 5
        ? `M ${fromX} ${fromY} L ${toX} ${toY}`
        : `M ${fromX} ${fromY} L ${(fromX+toX)/2} ${fromY} L ${(fromX+toX)/2} ${toY} L ${toX} ${toY}`;
    }

    return { ...edge, path, dashed, isLoop, isCrossLane };
  });

  // ── Positioned nodes array ────────────────────────────────────────────────
  const positionedNodes = nodes.map(node => ({
    ...node,
    ...nodePositions[node.id],
    dims: calcNodeDims(node),
  }));

  return {
    nodes: positionedNodes,
    edges: computedEdges,
    lanes: lanes.map((lane, i) => ({ ...lane, ...laneYMap[lane.id], height: laneHeights[i] })),
    phases: phases.map(phase => ({ ...phase, ...phaseXMap[phase.id] })),
    svgWidth:  totalSvgWidth,
    svgHeight: totalSvgHeight,
    laneYMap,
    phaseXMap,
    LANE_LABEL_WIDTH,
    PHASE_BAR_HEIGHT,
  };
}
