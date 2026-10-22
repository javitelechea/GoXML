import React, { useState } from 'react';
import './styles.css';
import { parseInputFile } from './utils/parser';
import { buildXml } from './utils/xmlBuilder';
import { normalizeEvents } from './utils/normalization';
import { decodeFileText } from './utils/encoding';
import { detectTimelineStart } from './utils/timeline';
import { applyFpsConversion, canConvertTagandviewFps } from './utils/fpsSync';

const INSPECTOR_PAGE_SIZE = 100;

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(2);
  const mm = m.toString().padStart(2, '0');
  const ss = parseFloat(s).toString().padStart(5, '0');
  return h > 0 ? `${h}:${mm}:${s.padStart(5, '0')}` : `${mm}:${s.padStart(5, '0')}`;
};

const parseTime = (timeStr) => {
  if (typeof timeStr === 'number') return timeStr;
  const parts = timeStr.trim().split(':').map(p => parseFloat(p) || 0);
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  return parts[0] || 0;
};

function App() {
  const [view, setView] = useState('main');
  const [instances, setInstances] = useState([]);
  const [fileType, setFileType] = useState("");
  const [targetStartTimeStr, setTargetStartTimeStr] = useState("00:00");
  const [currentStartTime, setCurrentStartTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [inspectorPage, setInspectorPage] = useState(0);
  const [fpsConverted, setFpsConverted] = useState(false);
  const [editorOrder, setEditorOrder] = useState([]);

  const handleFile = (event) => {
    const file = event.target.files ? event.target.files[0] : (event.dataTransfer ? event.dataTransfer.files[0] : null);
    if (!file) return;
    const isNacmac = /\.(nacmac|nac)$/i.test(file.name);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const raw = isNacmac ? e.target.result : decodeFileText(e.target.result);
        const { events, type } = await parseInputFile(raw, file.name);
        const normalized = normalizeEvents(events);
        setInstances(normalized);
        setFileType(type);
        setInspectorPage(0);
        setFpsConverted(false);

        const autoStart = detectTimelineStart(normalized);
        setCurrentStartTime(autoStart);
        setTargetStartTimeStr(formatTime(autoStart));
      } catch (err) { alert(err.message); }
      finally { setLoading(false); }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e);
  };

  const applyTagandviewFps = () => {
    if (!canConvertTagandviewFps(instances)) return;
    if (!window.confirm('¿Convertir este XML Tagandview de 25 fps a 30 fps? Solo usalo si el video no sincroniza.')) return;
    setInstances(normalizeEvents(applyFpsConversion(instances)));
    setFpsConverted(true);
  };

  const applyShift = () => {
    const targetSecs = parseTime(targetStartTimeStr);
    const offset = targetSecs - currentStartTime;
    const shifted = instances.map(inst => ({
      ...inst,
      start: Math.max(0, inst.start + offset),
      end: Math.max(0, inst.end + offset)
    }));
    setInstances(normalizeEvents(shifted));
    setCurrentStartTime(targetSecs);
  };

  const downloadXml = () => {
    try {
      const xmlContent = buildXml(instances);
      const blob = new Blob([xmlContent], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'converted.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Error al descargar: " + e.message);
    }
  };

  const deleteCategory = (codeToDelete) => {
    if (window.confirm(`¿Estás seguro de que querés eliminar TODA la categoría "${codeToDelete}"? Esto borrará todos sus eventos.`)) {
      setInstances(instances.filter(inst => inst.code !== codeToDelete));
    }
  };

  const updateTypeCode = (oldCode, newCode) => {
    setEditorOrder(order => order.map(c => c === oldCode ? newCode : c));
    const updated = instances.map(inst => inst.code === oldCode ? { ...inst, code: newCode } : inst);
    setInstances(updated);
  };

  const updateInstanceValue = (id, field, value) => {
    const updated = instances.map((inst) => {
      if (inst.id !== id) return inst;
      const next = { ...inst };
      if (field === 'start' || field === 'end') next[field] = parseTime(value);
      else next[field] = value;
      return next;
    });
    setInstances(normalizeEvents(updated));
  };

  const uniqueTypes = [...new Set(instances.map(inst => inst.code))].sort((a, b) => a.localeCompare(b));
  // El editor conserva el orden con el que se abrió, así las filas no saltan al renombrar
  const editorTypes = [...new Set([...editorOrder, ...uniqueTypes])].filter(c => uniqueTypes.includes(c));
  const sortedInstances = [...instances].sort((a, b) => a.start - b.start);
  const showTagandviewFps = canConvertTagandviewFps(instances) && !fpsConverted;

  if (view === 'editor') {
    return (
      <div className="container" style={{ maxWidth: '800px' }}>
        <header><h1>Editor</h1><p>Gestión masiva de nombres por tipo de evento</p></header>
        <div className="section" style={{ textAlign: 'left' }}>
          <div className="view-header">
            <button className="btn-nav" onClick={() => setView('main')}>← Volver</button>
            <span>{editorTypes.length} Categorías únicas</span>
          </div>
          <div className="table-container">
            <table>
                <thead><tr><th>Actual</th><th>Nuevo</th><th>Eventos</th><th style={{textAlign:'center'}}>Acción</th></tr></thead>
                <tbody>{editorTypes.map((code) => (
                  <tr key={code}>
                    <td>{code}</td>
                    <td><input className="manager-input" defaultValue={code} onBlur={e => updateTypeCode(code, e.target.value)} /></td>
                    <td><span className="badge">{instances.filter(i => i.code === code).length}</span></td>
                    <td style={{textAlign:'center'}}>
                      <button className="btn-danger" onClick={() => deleteCategory(code)} title="Eliminar categoría">🗑️</button>
                    </td>
                  </tr>
                ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'inspector') {
    const totalPages = Math.max(1, Math.ceil(sortedInstances.length / INSPECTOR_PAGE_SIZE));
    const pageStart = inspectorPage * INSPECTOR_PAGE_SIZE;
    const pageItems = sortedInstances.slice(pageStart, pageStart + INSPECTOR_PAGE_SIZE);

    return (
      <div className="container" style={{ maxWidth: '1200px' }}>
        <header><h1>Inspector</h1><p>Edición granular (Orden Cronológico)</p></header>
        <div className="section" style={{ textAlign: 'left' }}>
          <div className="view-header">
            <button className="btn-nav" onClick={() => setView('main')}>← Volver</button>
            <span>{instances.length} instancias · página {inspectorPage + 1} de {totalPages}</span>
          </div>
          {totalPages > 1 && (
            <div className="controls" style={{ marginBottom: '1rem' }}>
              <button className="btn-nav" disabled={inspectorPage === 0} onClick={() => setInspectorPage(p => p - 1)}>← Anterior</button>
              <button className="btn-nav" disabled={inspectorPage >= totalPages - 1} onClick={() => setInspectorPage(p => p + 1)}>Siguiente →</button>
            </div>
          )}
          <div className="table-container">
            <table>
              <thead><tr><th>ID</th><th>Código</th><th>Inicio</th><th>Fin</th></tr></thead>
              <tbody>
                {pageItems.map((inst) => (
                  <tr key={inst.id}>
                    <td style={{ color: '#64748b' }}>{inst.id}</td>
                    <td><input className="manager-input" value={inst.code} onChange={e => updateInstanceValue(inst.id, 'code', e.target.value)} /></td>
                    <td><input className="manager-input" value={formatTime(inst.start)} onChange={e => updateInstanceValue(inst.id, 'start', e.target.value)} /></td>
                    <td><input className="manager-input" value={formatTime(inst.end)} onChange={e => updateInstanceValue(inst.id, 'end', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header><h1><span>Go</span><span className="gradient-text">XML</span></h1><p>Convertir y editar cualquier archivo a XML</p></header>
      <div className="section">
        {!instances.length ? (
          <div 
            className="dropzone" 
            onClick={() => !loading && document.getElementById('f').click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={loading ? undefined : handleDrop}
            style={loading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
          >
            <input id="f" type="file" style={{ display: 'none' }} onChange={handleFile} accept=".SCTimeline,.json,.xml,.lgm,.nacmac,.nac" disabled={loading} />
            <p>{loading ? 'Procesando archivo…' : 'Sube tu archivo .xml, .SCTimeline, .lgm, .nacmac o .nac'}</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge">Detectado: {fileType}</span>
              {fpsConverted && <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>Convertido Tagandview 25→30 fps</span>}
            </div>
            <div className="controls">
              <div className="input-group">
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Inicio detectado:</label>
                <input type="text" readOnly value={formatTime(currentStartTime)} style={{ opacity: 0.7 }} />
              </div>
              <div className="input-group">
                <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nuevo inicio (mm:ss.ss):</label>
                <input type="text" value={targetStartTimeStr} onChange={e => setTargetStartTimeStr(e.target.value)} />
              </div>
              <button onClick={applyShift} className="btn-nav">Alinear tiempos</button>
              {showTagandviewFps && (
                <button onClick={applyTagandviewFps} className="btn-nav">Convertir Tagandview 25→30 fps</button>
              )}
            </div>
            <div className="controls" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => { setEditorOrder(uniqueTypes); setView('editor'); }} className="btn-admin">🛠 Editor</button>
              <button onClick={() => setView('inspector')} className="btn-inspector">🔍 Inspector</button>
              <button onClick={downloadXml} className="btn-primary">💾 Descargar XML</button>
            </div>
          </>
        )}
      </div>
      {instances.length > 0 && (
        <div className="section" style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#94a3b8' }}>Vista Previa (Cronológica)</h2>
          <div className="table-container">
            <table>
              <thead><tr><th>ID</th><th>Código</th><th>Inicio</th><th>Fin</th></tr></thead>
              <tbody>
                {sortedInstances.slice(0, 100).map((inst) => (
                  <tr key={inst.id}>
                    <td>{inst.id}</td>
                    <td><span className="badge">{inst.code}</span></td>
                    <td>{formatTime(inst.start)}</td>
                    <td>{formatTime(inst.end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {instances.length > 100 && <p style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem' }}>Mostrando primeras 100 de {instances.length} instancias...</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
