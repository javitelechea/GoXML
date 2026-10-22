import React, { useState } from 'react';
import { buildXml } from '../utils/xmlBuilder';
import { normalizeEvents } from '../utils/normalization';

const RULES_KEY = 'goxml.renameRules';

// Nombres de la plantilla de SimpleReplayPro; se usan hasta que se guarden reglas propias
const DEFAULT_RULES = {
  '25 YARD DEF': 'Defensa', '25 YARD OFE': 'Ataque',
  'AREA DEF': 'Área EC', 'AREA OFE': 'Área',
  'CCD': 'CC AT', 'CCO': 'CC DEF',
  'Contraataque': 'Contragolpe', 'Transicion DEF': 'Contragolpe EC',
  'Salidas': 'Salida', 'Bloqueos': 'Bloqueo',
  'Perd': 'Pérdida', 'Rec': 'Recuperación',
};

const loadRules = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(RULES_KEY));
    if (saved && typeof saved === 'object') return saved;
  } catch { /* sin reglas guardadas */ }
  return DEFAULT_RULES;
};

const downloadText = (text, name) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const BatchEditor = ({ files, onBack }) => {
  // Orden fijo desde que se abre: las filas no saltan al escribir
  const [codes] = useState(() =>
    [...new Set(files.flatMap(f => f.events.map(e => e.code)))].sort((a, b) => a.localeCompare(b))
  );
  const [names, setNames] = useState(() => {
    const rules = loadRules();
    return Object.fromEntries(codes.map(c => [c, rules[c] ?? c]));
  });
  const [removed, setRemoved] = useState({});
  const [saved, setSaved] = useState(false);

  const convert = (f) => normalizeEvents(
    f.events
      .filter(e => !removed[e.code])
      .map(e => ({ ...e, code: (names[e.code] || '').trim() || e.code }))
  );

  const downloadOne = (f) => {
    downloadText(buildXml(convert(f)), f.name.replace(/\.[^.]+$/, '') + '.xml');
  };

  const downloadAll = () => {
    files.forEach((f, i) => setTimeout(() => downloadOne(f), i * 400));
  };

  const saveRules = () => {
    const rules = Object.fromEntries(codes.filter(c => names[c] && names[c] !== c).map(c => [c, names[c]]));
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify({ ...loadRules(), ...rules }));
      setSaved(true);
    } catch { alert('No se pudieron guardar las reglas en este navegador.'); }
  };

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <header><h1>Editor en lote</h1><p>Los cambios se aplican a los {files.length} archivos a la vez</p></header>
      <div className="section" style={{ textAlign: 'left' }}>
        <div className="view-header">
          <button className="btn-nav" onClick={onBack}>← Volver</button>
          <span>{codes.length} categorías · {files.length} archivos</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Actual</th><th>Nuevo</th>
                {files.map((f, i) => <th key={i} title={f.name}>Archivo {i + 1}</th>)}
                <th style={{ textAlign: 'center' }}>Quitar</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(code => (
                <tr key={code} style={removed[code] ? { opacity: 0.4 } : undefined}>
                  <td>{code}</td>
                  <td>
                    <input
                      className="manager-input"
                      value={names[code]}
                      onChange={e => { setNames({ ...names, [code]: e.target.value }); setSaved(false); }}
                    />
                  </td>
                  {files.map((f, i) => (
                    <td key={i}><span className="badge">{f.events.filter(e => e.code === code).length}</span></td>
                  ))}
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!removed[code]}
                      onChange={e => setRemoved({ ...removed, [code]: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          {files.map((f, i) => <div key={i}>Archivo {i + 1}: {f.name} ({f.events.length} eventos)</div>)}
        </div>
        <div className="controls" style={{ marginTop: '1.5rem' }}>
          <button onClick={saveRules} className="btn-nav">{saved ? '✓ Reglas guardadas' : 'Guardar nombres para la próxima'}</button>
          <button onClick={downloadAll} className="btn-primary">💾 Descargar los {files.length} XML</button>
        </div>
        <div className="controls" style={{ marginTop: '0.5rem' }}>
          {files.map((f, i) => (
            <button key={i} onClick={() => downloadOne(f)} className="btn-nav">XML {i + 1}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BatchEditor;
