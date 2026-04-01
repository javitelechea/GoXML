import React from 'react';

const XmlPreview = ({ xml }) => {
  const downloadXml = () => {
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted_timeline.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="xml-preview">
      <div className="preview-header">
        <h2>XML Preview</h2>
        <button className="download-btn" onClick={downloadXml}>
          Download XML
        </button>
      </div>
      <pre>
        <code>{xml}</code>
      </pre>
    </div>
  );
};

export default XmlPreview;
