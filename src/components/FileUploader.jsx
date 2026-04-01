import React, { useCallback } from 'react';
import { parseSCTimeline } from '../utils/parser';
import { buildSportscodeXml } from '../utils/xmlBuilder';

const FileUploader = ({ onDataParsed, onXmlGenerated }) => {
  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const parsed = parseSCTimeline(content);
        const xml = buildSportscodeXml(parsed);
        
        onDataParsed(parsed);
        onXmlGenerated(xml);
      } catch (err) {
        alert(err.message);
      }
    };
    reader.readAsText(file);
  }, [onDataParsed, onXmlGenerated]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const event = { target: { files: [file] } };
      handleFileChange(event);
    }
  }, [handleFileChange]);

  return (
    <div 
      className="dropzone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => document.getElementById('fileInput').click()}
    >
      <input 
        type="file" 
        id="fileInput" 
        style={{ display: 'none' }} 
        onChange={handleFileChange}
        accept=".SCTimeline,.json"
      />
      <div className="upload-content">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="upload-icon">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <p>Drag and drop your <strong>.SCTimeline</strong> file here</p>
        <span>or click to browse</span>
      </div>
    </div>
  );
};

export default FileUploader;
