import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Copy, 
  Check, 
  Terminal, 
  ChevronRight, 
  Code2,
  FileCode,
  Layers,
  Sparkles
} from 'lucide-react';
import docsContent from './docs.md?raw';

const Documentation = () => {
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (docsContent) {
      const parsedSections = parseMarkdown(docsContent);
      setSections(parsedSections);
      if (parsedSections.length > 0) {
        setActiveSection(parsedSections[0].id);
      }
    }
  }, []);

  const parseMarkdown = (markdown) => {
    if (!markdown) return [];
    // Normalize line endings to avoid Windows CRLF parsing issues
    const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    const parsedSections = [];
    let currentSection = {
      id: 'introduction',
      title: 'Introduction',
      level: 1,
      content: [],
    };
    let currentContent = [];
    let inCodeBlock = false;
    let codeLanguage = '';

    lines.forEach((line) => {
      // Detect code block fences
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
      const h2Match = line.match(/^## (.+)$/);
      const h3Match = line.match(/^### (.+)$/);

      if (h2Match) {
        // Save previous section if it has content
        if (currentSection && (currentContent.length > 0 || currentSection.title !== 'Introduction')) {
          currentSection.content = currentContent;
          parsedSections.push(currentSection);
        }

        // Start new section
        const title = h2Match[1].trim();
        currentSection = {
          id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          title,
          level: 2,
          content: [],
        };
        currentContent = [];
      } else if (h3Match) {
        const title = h3Match[1].trim();
        currentContent.push({ type: 'h3', content: title });
      } else if (line.startsWith('#### ')) {
        currentContent.push({ type: 'h4', content: line.substring(5).trim() });
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        currentContent.push({ type: 'li', content: line.substring(2).trim() });
      } else if (line.trim() === '---') {
        currentContent.push({ type: 'hr' });
      } else if (line.trim() === '') {
        currentContent.push({ type: 'br' });
      } else if (line.trim().startsWith('|')) {
        currentContent.push({ type: 'table-row', content: line.trim() });
      } else if (line.startsWith('# ')) {
        currentContent.push({ type: 'h1', content: line.substring(2).trim() });
      } else {
        currentContent.push({ type: 'p', content: line });
      }
    });

    // Save trailing section
    if (currentSection) {
      currentSection.content = currentContent;
      parsedSections.push(currentSection);
    }

    return parsedSections.filter((s) => s.content.length > 0);
  };

  const formatInlineText = (text) => {
    if (!text) return '';
    return text
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline font-semibold transition-colors">$1</a>'
      )
      .replace(
        /`([^`]+)`/g,
        '<code class="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs rounded border border-indigo-200 font-bold">$1</code>'
      )
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="text-slate-800 italic">$1</em>');
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
          <ul key={`list-${elements.length}`} className="space-y-2 my-4 pl-5 list-disc text-slate-700 text-sm font-medium">
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineText(item) }} />
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
          <div key={`table-${elements.length}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-sm text-slate-700">
              <tbody>
                {tableRows.map((row, i) => {
                  const cells = row.split('|').filter((c) => c.trim());
                  const isHeader = i === 0;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-slate-100 ${
                        isHeader ? 'bg-slate-50 text-xs uppercase font-bold text-slate-600' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {cells.map((cell, j) => {
                        const Tag = isHeader ? 'th' : 'td';
                        return (
                          <Tag key={j} className="px-4 py-3">
                            <span dangerouslySetInnerHTML={{ __html: formatInlineText(cell.trim()) }} />
                          </Tag>
                        );
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
      } else if (item.type === 'h1') {
        flushList();
        flushCodeBlock();
        flushTable();
        elements.push(
          <h1 key={index} className="text-2xl sm:text-3xl font-black text-slate-900 mt-6 mb-3">
            {item.content}
          </h1>
        );
      } else if (item.type === 'h3') {
        flushList();
        flushCodeBlock();
        flushTable();
        elements.push(
          <h3 key={index} className="text-lg font-bold text-slate-900 mt-8 mb-3 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-indigo-600" />
            <span dangerouslySetInnerHTML={{ __html: formatInlineText(item.content) }} />
          </h3>
        );
      } else if (item.type === 'h4') {
        flushList();
        flushCodeBlock();
        flushTable();
        elements.push(
          <h4 key={index} className="text-base font-bold text-slate-800 mt-6 mb-2">
            <span dangerouslySetInnerHTML={{ __html: formatInlineText(item.content) }} />
          </h4>
        );
      } else if (item.type === 'li') {
        flushCodeBlock();
        flushTable();
        inList = true;
        listItems.push(item.content);
      } else if (item.type === 'hr') {
        flushList();
        flushCodeBlock();
        flushTable();
        elements.push(<hr key={index} className="border-t border-slate-200 my-8" />);
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
          <p
            key={index}
            className="text-sm leading-relaxed text-slate-700 my-3 font-normal"
            dangerouslySetInnerHTML={{ __html: formatInlineText(item.content) }}
          />
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

  const filteredSections = sections.filter((section) =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.some((c) => (c.content || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Sidebar Navigation */}
      <aside className="lg:w-72 flex-shrink-0">
        <div className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 px-2 text-slate-900 font-bold text-base">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Table of Contents</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            />
          </div>

          <nav className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredSections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveSection(section.id);
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'rotate-90 text-indigo-600' : 'text-slate-400'}`} />
                  <span className="truncate">{section.title}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Documentation Body */}
      <main className="flex-1 min-w-0 space-y-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs">
          {/* Header Banner */}
          <div className="border-b border-slate-100 pb-6 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-3">
              <Code2 className="w-3.5 h-3.5" />
              Developer Reference
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Auth Server SDK &amp; API Documentation
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-2 font-medium">
              Complete guide to integrating authentication, sessions, and user management with <code className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono text-xs border border-indigo-200 font-bold">@mspkapps/auth-client</code>.
            </p>
          </div>

          {/* Rendered Sections */}
          <div className="space-y-12">
            {filteredSections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  <FileCode className="w-6 h-6 text-indigo-600" />
                  {section.title}
                </h2>
                <div>{renderContent(section.content)}</div>
              </section>
            ))}
          </div>
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
    <div className="my-5 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            {language || 'bash'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="font-mono text-xs leading-relaxed text-slate-200">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default Documentation;
