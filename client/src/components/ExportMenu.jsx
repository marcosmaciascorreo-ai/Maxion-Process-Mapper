import React, { useState, useRef, useEffect } from 'react';
import { generateHTMLExport, generateSVG } from '../utils/svgRenderer.js';

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function hideOverlays() {
  const els = document.querySelectorAll('[data-node-overlay]');
  els.forEach(el => { el.style.visibility = 'hidden'; });
  return els;
}
function showOverlays(els) {
  els.forEach(el => { el.style.visibility = ''; });
}

async function logoToBase64() {
  try {
    const res = await fetch('/maxion-logo.png');
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export default function ExportMenu({ process, diagramCanvasId = 'diagram-canvas' }) {
  const [open,      setOpen]      = useState(false);
  const [exporting, setExporting] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── PDF profesional ─────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!process) return;
    setExporting('pdf');
    const overlays = hideOverlays();
    try {
      const [html2canvasMod, jsPDFMod] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const html2canvas = html2canvasMod.default;
      const { jsPDF }   = jsPDFMod;

      // Capture only the white diagram card (not the grid background)
      const cardEl = document.getElementById('diagram-card-inner') || document.getElementById(diagramCanvasId);
      if (!cardEl) throw new Error('Elemento del diagrama no encontrado');

      const canvas = await html2canvas(cardEl, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgW = canvas.width  / 3;   // logical px
      const imgH = canvas.height / 3;

      // A4 landscape
      const pageW = 297, pageH = 210;   // mm
      const HEADER_H = 26, FOOTER_H = 11, MARGIN = 8;
      const contentW = pageW - MARGIN * 2;
      const contentH = pageH - HEADER_H - FOOTER_H - MARGIN;

      // Scale image to fit content area
      const scale  = Math.min(contentW / imgW, contentH / imgH);
      const scaledW = imgW * scale;
      const scaledH = imgH * scale;
      const imgX   = (pageW - scaledW) / 2;
      const imgY   = HEADER_H + MARGIN / 2 + (contentH - scaledH) / 2;

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const dateStr = new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' });

      // ── Header band ──────────────────────────────────────────────────────────
      pdf.setFillColor(0, 131, 190);
      pdf.rect(0, 0, pageW, HEADER_H, 'F');

      // Logo
      const logoBase64 = await logoToBase64();
      if (logoBase64) {
        // Logo has white bg — draw a rounded white pill behind it
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(MARGIN, 3, 44, 20, 2, 2, 'F');
        pdf.addImage(logoBase64, 'PNG', MARGIN + 1, 3.5, 42, 19);
      }

      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text(process.title || 'Proceso', pageW / 2, 12, { align: 'center' });

      // Subtitle
      if (process.subtitle) {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(190, 225, 245);
        pdf.text(process.subtitle, pageW / 2, 19, { align: 'center' });
      }

      // Date top-right
      pdf.setFontSize(7.5);
      pdf.setTextColor(200, 235, 255);
      pdf.text(dateStr, pageW - MARGIN, 12, { align: 'right' });

      // Stats (nodes / lanes)
      const statsY = process.subtitle ? 23 : 21;
      pdf.setFontSize(7);
      pdf.setTextColor(160, 210, 240);
      const stats = `${process.nodes?.length || 0} nodos · ${process.lanes?.length || 0} actores · ${process.phases?.length || 0} fases`;
      pdf.text(stats, pageW - MARGIN, statsY, { align: 'right' });

      // ── Diagram image ────────────────────────────────────────────────────────
      pdf.addImage(imgData, 'PNG', imgX, imgY, scaledW, scaledH);

      // Thin border around diagram
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.25);
      pdf.rect(imgX, imgY, scaledW, scaledH);

      // ── Footer ───────────────────────────────────────────────────────────────
      const footerY = pageH - FOOTER_H + 2;
      pdf.setLineWidth(0.3);
      pdf.setDrawColor(200, 210, 220);
      pdf.line(MARGIN, footerY, pageW - MARGIN, footerY);

      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(148, 163, 184);
      pdf.text('Maxion Process Mapper  ·  Maxion Wheels', MARGIN, footerY + 4.5);
      pdf.text(`Generado el ${dateStr}`, pageW - MARGIN, footerY + 4.5, { align: 'right' });

      // ── Save ─────────────────────────────────────────────────────────────────
      const filename = `${(process.title || 'proceso')
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}.pdf`;
      pdf.save(filename);

    } catch (e) {
      alert('Error al exportar PDF: ' + e.message);
    } finally {
      showOverlays(overlays);
      setExporting(null);
      setOpen(false);
    }
  };

  // ── PNG ─────────────────────────────────────────────────────────────────────
  const handleExportPNG = async () => {
    if (!process) return;
    setExporting('png');
    const overlays = hideOverlays();
    try {
      const html2canvas = (await import('html2canvas')).default;
      const cardEl = document.getElementById('diagram-card-inner') || document.getElementById(diagramCanvasId);
      if (!cardEl) throw new Error('Canvas element not found');
      const canvas = await html2canvas(cardEl, { scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false });
      const filename = `${(process.title||'proceso').toLowerCase().replace(/\s+/g,'-')}.png`;
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (e) { alert('Error al exportar PNG: ' + e.message); }
    finally { showOverlays(overlays); setExporting(null); setOpen(false); }
  };

  // ── HTML ────────────────────────────────────────────────────────────────────
  const handleExportHTML = () => {
    if (!process) return;
    setExporting('html');
    try {
      const html = generateHTMLExport(process);
      const filename = `${(process.title||'proceso').toLowerCase().replace(/\s+/g,'-')}.html`;
      downloadFile(html, filename, 'text/html;charset=utf-8');
    } catch (e) { alert('Error al exportar HTML: ' + e.message); }
    finally { setExporting(null); setOpen(false); }
  };

  // ── Copy SVG ────────────────────────────────────────────────────────────────
  const handleCopySVG = () => {
    if (!process) return;
    try {
      const svgStr = generateSVG(process);
      navigator.clipboard.writeText(svgStr)
        .then(() => alert('SVG copiado al portapapeles'))
        .catch(() => alert('No se pudo copiar el SVG'));
    } catch (e) { alert('Error: ' + e.message); }
    setOpen(false);
  };

  if (!process) {
    return (
      <button disabled style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600, fontFamily:'IBM Plex Sans', background:'#f8fafc', color:'#cbd5e1', border:'1px solid #e2e8f0', cursor:'not-allowed' }}>
        ↓ Exportar
      </button>
    );
  }

  const menuItem = (icon, title, subtitle, onClick, key) => (
    <button key={key} onClick={onClick} disabled={!!exporting}
      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'none', border:'none', cursor: exporting ? 'not-allowed' : 'pointer', textAlign:'left', transition:'background 0.12s', opacity: exporting ? 0.5 : 1 }}
      onMouseEnter={e => { if(!exporting) e.currentTarget.style.background='#f8fafc'; }}
      onMouseLeave={e => { e.currentTarget.style.background='none'; }}
    >
      <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#0f172a', fontFamily:'IBM Plex Sans' }}>{title}</div>
        <div style={{ fontSize:10, color:'#94a3b8', fontFamily:'IBM Plex Mono' }}>{subtitle}</div>
      </div>
      {exporting === key && (
        <div style={{ marginLeft:'auto', width:14, height:14, border:'2px solid #e2e8f0', borderTopColor:'#0083BE', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }}/>
      )}
    </button>
  );

  return (
    <div style={{ position:'relative' }} ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'IBM Plex Sans', background:'#0083BE', color:'#fff', border:'none', transition:'all 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background='#006fa0'}
        onMouseLeave={e => e.currentTarget.style.background='#0083BE'}
      >
        ↓ Exportar ▾
      </button>

      {open && (
        <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', width:220, background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', boxShadow:'0 8px 28px rgba(0,0,0,0.12)', zIndex:200, overflow:'hidden' }}>
          <div style={{ padding:'8px 12px 6px', borderBottom:'1px solid #f1f5f9' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', fontFamily:'IBM Plex Mono', letterSpacing:'0.06em' }}>EXPORTAR DIAGRAMA</div>
          </div>
          {menuItem('📄', 'PDF',       'A4 landscape · logo Maxion', handleExportPDF,  'pdf')}
          {menuItem('🖼️', 'PNG',       'Alta resolución (3×)',        handleExportPNG,  'png')}
          {menuItem('🌐', 'HTML',      'Archivo autocontenido',       handleExportHTML, 'html')}
          <div style={{ height:1, background:'#f1f5f9', margin:'2px 0' }}/>
          {menuItem('📋', 'Copiar SVG','Para PowerPoint / Word',      handleCopySVG,    'svg')}
        </div>
      )}
    </div>
  );
}
