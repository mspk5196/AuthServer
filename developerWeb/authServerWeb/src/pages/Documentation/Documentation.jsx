import React, { useState, useEffect } from 'react';
import docsContent from './docs.md?raw';
import './Documentation.css';

const Documentation = () => {
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Parse markdown into sections
    const parsedSections = parseMarkdown(docsContent);
    setSections(parsedSections);
    if (parsedSections.length > 0) {
      setActiveSection(parsedSections[0].id);
    }
  }, []);

  const parseMarkdown = (markdown) => {
    const lines = markdown.split('\n');
    const sections = [];
    let currentSection = null;
    let currentContent = [];
    let inCodeBlock = false;
    let codeLanguage = '';

    lines.forEach((line, index) => {
      // Detect code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.replace('```', '').trim();
          currentContent.push({ type: 'code-start', language: codeLanguage });
        } else {
          inCodeBlock = false;
          currentContent.push({ type: 'code-end' });
        }
        return;
      }

      if (inCodeBlock) {
        currentContent.push({ type: 'code', content: line });
        return;
      }

      // Detect headings
      const h1Match = line.match(/^# (.+)$/);
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);

      if (h2Match) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent;
          sections.push(currentSection);
        }

        // Start new section
        const title = h2Match[1];
        currentSection = {
          id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title,
          level: 2,
          content: []
        };
        currentContent = [];
      } else if (h3Match) {
        const title = h3Match[1];
        currentContent.push({ type: 'h3', content: title });
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        currentContent.push({ type: 'li', content: line.substring(2) });
      } else if (line.startsWith('#### ')) {
        currentContent.push({ type: 'h4', content: line.substring(5) });
      } else if (line.trim() === '') {
        currentContent.push({ type: 'br' });
      } else if (line.startsWith('| ')) {
        currentContent.push({ type: 'table-row', content: line });
      } else {
        currentContent.push({ type: 'p', content: line });
      }
    });

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent;
      sections.push(currentSection);
    }

    return sections;
  };

  const renderContent = (content) => {
    let inCodeBlock = false;
    let codeLines = [];
    let codeLanguage = '';
    let inList = false;
    let listItems = [];
    let inTable = false;
    let tableRows = [];

    const elements = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="doc-list">
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineCode(item) }} />
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeLines.length > 0) {
        elements.push(
          <CodeBlock
            key={`code-${elements.length}`}
            code={codeLines.join('\n')}
            language={codeLanguage}
          />
        );
        codeLines = [];
        codeLanguage = '';
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`table-${elements.length}`} className="doc-table">
            <table>
              <tbody>
                {tableRows.map((row, i) => {
                  const cells = row.split('|').filter(c => c.trim());
                  return (
                    <tr key={i} className={i === 0 ? 'table-header' : ''}>
                      {cells.map((cell, j) => {
                        const Tag = i === 0 ? 'th' : 'td';
                        return <Tag key={j}>{cell.trim()}</Tag>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
    };

    content.forEach((item, index) => {
      if (item.type === 'code-start') {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLanguage = item.language;
      } else if (item.type === 'code-end') {
        inCodeBlock = false;
        flushCodeBlock();
      } else if (item.type === 'code' && inCodeBlock) {
        codeLines.push(item.content);
      } else if (item.type === 'h3') {
        flushList();
        flushCodeBlock();
        flushTable();
        elements.push(<h3 key={index} className="doc-h3">{item.content}</h3>);
      } else if (item.type === 'h4') {
        flushList();
        flushCodeBlock();
        flushTable();
        elements.push(<h4 key={index} className="doc-h4">{item.content}</h4>);
      } else if (item.type === 'li') {
        flushCodeBlock();
        flushTable();
        inList = true;
        listItems.push(item.content);
      } else if (item.type === 'table-row') {
        flushList();
        flushCodeBlock();
        inTable = true;
        if (!item.content.includes('---')) {
          tableRows.push(item.content);
        }
      } else if (item.type === 'p' && item.content.trim()) {
        flushList();
        flushCodeBlock();
        flushTable();
        elements.push(
          <p key={index} className="doc-p" dangerouslySetInnerHTML={{ __html: formatInlineCode(item.content) }} />
        );
      } else if (item.type === 'br') {
        if (inList) {
          flushList();
          inList = false;
        }
        if (inTable) {
          flushTable();
          inTable = false;
        }
      }
    });

    flushList();
    flushCodeBlock();
    flushTable();

    return elements;
  };

  const formatInlineCode = (text) => {
    // Format inline code blocks
    return text
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  };

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="documentation-page">
      <aside className="doc-sidebar">
        <div className="sidebar-header">
          <h2>Documentation</h2>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <nav className="doc-nav">
          {filteredSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveSection(section.id);
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {section.title}
            </a>
          ))}
        </nav>
      </aside>

      <main className="doc-main">
        <header className="doc-header">
          <div>
            <p className="eyebrow">Developer Hub</p>
            <h1>Auth Server Documentation</h1>
            <p className="subtitle">Complete guide to implementing authentication with @mspkapps/auth-client</p>
          </div>
        </header>

        <div className="doc-content">
          {filteredSections.map((section) => (
            <section key={section.id} id={section.id} className="doc-section">
              <h2 className="section-title">{section.title}</h2>
              <div className="section-content">
                {renderContent(section.content)}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-language">{language || 'code'}</span>
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      <pre>
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

export default Documentation;
