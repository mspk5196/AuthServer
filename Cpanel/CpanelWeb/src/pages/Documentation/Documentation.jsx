import React from 'react';
import docsContent from './docs.md?raw';
import './Documentation.css';

const Documentation = () => {
  return (
    <div className="documentation-page">
      <header className="doc-header">
        <div>
          <p className="eyebrow">Developer Hub</p>
          <h1>Documentation</h1>
          <p className="subtitle">Live view of the contents from docs.md</p>
        </div>
        <div className="doc-actions">
          <a className="outline-btn" href="/docs.md" target="_blank" rel="noreferrer">
            Open docs.md
          </a>
        </div>
      </header>

      <div className="doc-content">
        <pre className="doc-markdown">{docsContent}</pre>
      </div>
    </div>
  );
};

export default Documentation;
