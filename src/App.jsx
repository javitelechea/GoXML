import React, { useState } from 'react';
import './styles.css';
import { parseInputFile } from './utils/parser';
import { buildXml } from './utils/xmlBuilder';
import { normalizeEvents } from './utils/normalization';

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

  const handleFile = (event) => {
    const file = event.target.files ? event.target.files[0] : (event.dataTransfer ? event.dataTransfer.files[0] : null);
    if (!file) return;
    const isBinary = file.name.toLowerCase().endsWith('.nacmac');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const { events, type } = await parseInputFile(e.target.result, file.name);
        const normalized = normalizeEvents(events);
        setInstances(normalized);
        setFileType(type);

        const autoStart = normalized.find(i =>
          i.code.toLowerCase().includes('start period')
        )?.start || (normalized.length > 0 ? Math.min(...normalized.map(i => i.start)) : 0);

        setCurrentStartTime(autoStart);
        setTargetStartTimeStr(formatTime(autoStart));
      } catch (err) { alert(err.message); }
    };
    
    if (isBinary) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e);
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
    const xmlContent = buildXml(instances);
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted.xml';
    a.click();
  };

  const updateTypeCode = (oldCode, newCode) => {
    const updated = instances.map(inst => inst.code === oldCode ? { ...inst, code: newCode } : inst);
    setInstances(updated);
  };

  const updateInstanceValue = (idx, field, value) => {
    const updated = [...instances];
    if (field === 'start' || field === 'end') updated[idx][field] = parseTime(value);
    else updated[idx][field] = value;
    setInstances(normalizeEvents(updated));
  };

  const uniqueTypes = [...new Set(instances.map(inst => inst.code))].sort((a, b) => a.localeCompare(b));
  const sortedInstances = [...instances].sort((a, b) => a.start - b.start);

  if (view === 'editor') {
    return (
      <div className="container" style={{ maxWidth: '800px' }}>
        <header><h1>Editor</h1><p>Gestión masiva de nombres por tipo de evento</p></header>
        <div className="section" style={{ textAlign: 'left' }}>
          <div className="view-header">
            <button className="btn-nav" onClick={() => setView('main')}>← Volver</button>
            <span>{uniqueTypes.length} Categorías únicas</span>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Tipo Actual</th><th>Nuevo Nombre</th><th>Eventos</th></tr></thead>
              <tbody>
                {uniqueTypes.map((code, idx) => (
                  <tr key={idx}>
                    <td>{code}</td>
                    <td><input className="manager-input" defaultValue={code} onBlur={e => updateTypeCode(code, e.target.value)} /></td>
                    <td><span className="badge">{instances.filter(i => i.code === code).length}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'inspector') {
    return (
      <div className="container" style={{ maxWidth: '1200px' }}>
        <header><h1>Inspector</h1><p>Edición granular (Orden Cronológico)</p></header>
        <div className="section" style={{ textAlign: 'left' }}>
          <div className="view-header">
            <button className="btn-nav" onClick={() => setView('main')}>← Volver</button>
            <span>{instances.length} Instancias totales</span>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>ID</th><th>Código</th><th>Inicio</th><th>Fin</th></tr></thead>
              <tbody>
                {sortedInstances.map((inst, idx) => (
                  <tr key={inst.id}>
                    <td style={{ color: '#64748b' }}>{inst.id}</td>
                    <td><input className="manager-input" value={inst.code} onChange={e => updateInstanceValue(idx, 'code', e.target.value)} /></td>
                    <td><input className="manager-input" value={formatTime(inst.start)} onChange={e => updateInstanceValue(idx, 'start', e.target.value)} /></td>
                    <td><input className="manager-input" value={formatTime(inst.end)} onChange={e => updateInstanceValue(idx, 'end', e.target.value)} /></td>
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
      <header><h1><span>Go</span><span className="gradient-text">XML</span></h1><p>Cargador y Convertidor de Eventos</p></header>
      <div className="section">
        {!instances.length ? (
          <div 
            className="dropzone" 
            onClick={() => document.getElementById('f').click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
          >
            <input id="f" type="file" style={{ display: 'none' }} onChange={handleFile} accept=".SCTimeline,.json,.xml,.lgm,.nacmac" />
            <p>Sube tu archivo .SCTimeline, .lgm o .nacmac</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}><span className="badge">Detectado: {fileType}</span></div>
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
            </div>
            <div className="controls" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => setView('editor')} className="btn-admin">🛠 Editor</button>
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
