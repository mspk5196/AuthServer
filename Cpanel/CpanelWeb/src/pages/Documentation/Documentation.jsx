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
        if (currentSection && (currentContent.length > 0 || currentSection.title !== 'Introduction')) {
          currentSection.content = currentContent;
          parsedSections.push(currentSection);
        }

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
        elements.push(<hr key={index} className="my-8 border-slate-200" />);
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
            className="my-3.5 text-slate-600 text-sm sm:text-base leading-relaxed"
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
    section.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* Top Header Banner */}
      <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-50 via-white to-indigo-50/30 border border-indigo-100/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Developer Documentation
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Auth Server Integration Guide
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              Complete SDK references, REST API endpoints, JWT token lifecycle, and client-side setup for <code className="text-indigo-600 font-mono font-semibold bg-indigo-50/80 px-1 py-0.5 rounded">@mspkapps/auth-client</code>.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documentation topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition-all shadow-2xs text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Sticky Table of Contents Sidebar */}
        <aside className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sticky top-6 max-h-[80vh] overflow-y-auto hidden lg:block">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Table of Contents</span>
          </div>

          <nav className="space-y-1">
            {filteredSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSection(section.id);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl font-semibold transition-all ${
                  activeSection === section.id
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{section.title}</span>
                {activeSection === section.id && (
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                )}
              </a>
            ))}
          </nav>
        </aside>

        {/* Documentation Content Body */}
        <main className="lg:col-span-3 space-y-10">
          {filteredSections.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
              <p className="text-slate-500 text-sm font-medium">No documentation found matching "{searchTerm}".</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 scroll-mt-6"
              >
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                  <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {section.title}
                  </h2>
                </div>

                <div className="mt-4">
                  {renderContent(section.content)}
                </div>
              </section>
            ))
          )}
        </main>
      </div>
    </div>
  );
};

// Reusable CodeBlock component with copy functionality
const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 text-slate-200 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>{language || 'bash'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-slate-300">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default Documentation;
