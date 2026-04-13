import { useEffect, useRef, type FC } from 'react';
import mermaid from 'mermaid';
import { HiSparkles } from 'react-icons/hi';

interface ResearchNotesProps {
  content: string;
  className?: string;
}

const ResearchNotes: FC<ResearchNotesProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      suppressErrorRendering: true,
      logLevel: 5,
      themeVariables: {
        primaryColor: '#eff6ff',
        primaryTextColor: '#1e3a8a',
        primaryBorderColor: '#bfdbfe',
        lineColor: '#1d4ed8',
        secondaryColor: '#ffffff',
        tertiaryColor: '#eff6ff',
        background: 'transparent',
        mainBkg: '#ffffff',
        nodeBorder: '#bfdbfe',
        clusterBkg: '#ffffff',
        clusterBorder: '#bfdbfe',
        titleColor: '#1e3a8a',
        edgeLabelBackground: '#eff6ff',
      },
      flowchart: { curve: 'basis', padding: 20 },
    });
  }, []);

  useEffect(() => {
    const showFallback = (element: HTMLElement, rawCode: string) => {
      element.innerHTML = `
        <div class="bg-white p-5 rounded-xl border border-blue-200 shadow-sm">
          <div class="flex items-center gap-2 mb-3 text-blue-700 font-semibold text-sm">
            Diagram Code
          </div>
          <pre class="text-blue-900 text-xs overflow-auto bg-blue-50 p-3 rounded-lg border border-blue-200 font-mono leading-relaxed max-h-64 whitespace-pre-wrap">${rawCode.substring(0, 800)}${rawCode.length > 800 ? '\n...' : ''}</pre>
        </div>
      `;
      element.setAttribute('data-processed', 'fallback');
    };

    const renderMermaidDiagrams = async () => {
      if (!containerRef.current) return;

      const mermaidElements = containerRef.current.querySelectorAll('.mermaid');
      for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i] as HTMLElement;
        if (element.getAttribute('data-processed')) continue;

        const rawCode = element.textContent?.trim() || '';
        if (!rawCode) {
          element.setAttribute('data-processed', 'empty');
          continue;
        }

        let finalCode = rawCode;
        const lines = finalCode.split('\n');
        if (lines[0].trim().toLowerCase() === 'mermaid') {
          finalCode = lines.slice(1).join('\n').trim();
        }

        const firstLine = finalCode.split('\n')[0].trim().toLowerCase();
        if (firstLine === 'sequence' || firstLine.startsWith('sequence ')) {
          finalCode = 'sequenceDiagram\n' + finalCode.replace(/^sequence\s*/i, '').trim();
        }
        if (firstLine === 'flow' || firstLine.startsWith('flow ')) {
          finalCode = 'flowchart TD\n' + finalCode.replace(/^flow\s*/i, '').trim();
        }
        if (firstLine === 'class' || firstLine.startsWith('class ')) {
          finalCode = 'classDiagram\n' + finalCode.replace(/^class\s*/i, '').trim();
        }
        if (firstLine === 'state' || firstLine.startsWith('state ')) {
          finalCode = 'stateDiagram-v2\n' + finalCode.replace(/^state\s*/i, '').trim();
        }

        if (finalCode.toLowerCase().startsWith('mindmap')) {
          const mmLines = finalCode.split('\n');
          finalCode = mmLines
            .map((line) => line.replace(/\*\*/g, '').replace(/`/g, ''))
            .map((line) => {
              if (line.trim().match(/^mindmap$/i)) return line;
              const indent = line.length - line.trimStart().length;
              const label = line.trim().replace(/[\[\]\(\)\{\}]/g, '').replace(/['"]/g, '');
              return label ? ' '.repeat(indent) + label : '';
            })
            .filter(Boolean)
            .join('\n');
        }

        const validTypes = ['graph ', 'flowchart ', 'pie', 'sequencediagram', 'classdiagram', 'statediagram', 'erdiagram', 'gantt', 'journey', 'gitgraph', 'mindmap', 'timeline', 'xychart', 'block'];
        const hasValidType = validTypes.some((t) => finalCode.toLowerCase().startsWith(t));
        if (!hasValidType) {
          if (finalCode.includes('participant') || finalCode.includes('->>') || finalCode.includes('-->>')) {
            finalCode = 'sequenceDiagram\n' + finalCode;
          } else if (finalCode.includes('-->') || finalCode.includes('---') || finalCode.includes('==>')) {
            finalCode = 'flowchart TD\n' + finalCode;
          } else {
            showFallback(element, rawCode);
            continue;
          }
        }

        try {
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${i}`;
          const { svg } = await mermaid.render(id, finalCode);
          if (svg && svg.includes('<svg')) {
            element.innerHTML = svg;
            element.setAttribute('data-processed', 'true');
            const svgElement = element.querySelector('svg');
            if (svgElement) {
              svgElement.style.maxWidth = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.display = 'block';
              svgElement.style.margin = '0 auto';
            }
          } else {
            throw new Error('Invalid SVG output');
          }
        } catch (error) {
          console.error('[ResearchNotes] Mermaid render failed:', error, '\nCode:', finalCode.substring(0, 200));
          showFallback(element, rawCode);
        }
      }

      const allMermaid = containerRef.current.querySelectorAll('.mermaid');
      allMermaid.forEach((el, idx) => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl.getAttribute('data-processed') || htmlEl.innerHTML.trim() === '') {
          showFallback(htmlEl, htmlEl.textContent?.trim() || `[Diagram ${idx + 1}]`);
        }
      });
    };

    const timer = setTimeout(renderMermaidDiagrams, 150);
    return () => clearTimeout(timer);
  }, [content]);

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-blue-50 border border-blue-200">
          <HiSparkles className="text-4xl text-blue-600" />
        </div>
        <h3 className="text-xl font-bold mb-2 text-blue-900">No Research Notes Yet</h3>
        <p className="text-sm text-blue-800">
          Click "Generate Content" to produce comprehensive study notes.
        </p>
      </div>
    );
  }

  return (
    <div className={`research-notes-container ${className}`}>
      <style>{`
        .research-notes-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          color: #1e3a8a;
          font-size: 0.95rem;
          line-height: 1.8;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        }
        .research-notes-container > section,
        .research-notes-container > article,
        .research-notes-container > div:not(.mermaid) {
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          padding: 1.5rem 1.75rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .research-notes-container > section:hover,
        .research-notes-container > article:hover,
        .research-notes-container > div:not(.mermaid):hover {
          border-color: #bfdbfe;
          box-shadow: 0 2px 12px rgba(37,99,235,0.06);
        }
        .research-notes-container h1,
        .research-notes-container h2,
        .research-notes-container h3,
        .research-notes-container h4,
        .research-notes-container h5,
        .research-notes-container h6 {
          color: #1e3a8a;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.78rem;
        }
        .research-notes-container p {
          margin: 0 0 0.85rem;
          color: #1e3a8a;
          line-height: 1.8;
        }
        .research-notes-container ul,
        .research-notes-container ol {
          padding-left: 1.35rem;
          margin: 0 0 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .research-notes-container li {
          color: #1e3a8a;
          line-height: 1.7;
        }
        .research-notes-container ul li::marker,
        .research-notes-container ol li::marker {
          color: #2563eb;
        }
        .research-notes-container strong {
          color: #1e3a8a;
          font-weight: 700;
        }
        .research-notes-container em {
          color: #1d4ed8;
          font-style: italic;
        }
        .research-notes-container code {
          background: #eff6ff;
          color: #1d4ed8;
          padding: 0.15rem 0.45rem;
          border-radius: 6px;
          font-size: 0.85em;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          border: 1px solid #bfdbfe;
        }
        .research-notes-container pre {
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 1.25rem;
          overflow-x: auto;
          margin: 0.75rem 0;
          color: #1e3a8a;
        }
        .research-notes-container pre code {
          background: none;
          border: none;
          padding: 0;
          color: #1e3a8a;
          font-size: 0.85rem;
        }
        .research-notes-container table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.75rem 0;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #bfdbfe;
        }
        .research-notes-container th {
          background: #eff6ff;
          color: #1e3a8a;
          font-weight: 700;
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          border-bottom: 1px solid #bfdbfe;
        }
        .research-notes-container td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #dbeafe;
          color: #1e3a8a;
          vertical-align: top;
        }
        .research-notes-container tr:hover td {
          background: #eff6ff;
        }
        .research-notes-container blockquote {
          border-left: 3px solid #2563eb;
          background: #eff6ff;
          padding: 0.85rem 1.25rem;
          border-radius: 0 10px 10px 0;
          margin: 0.75rem 0;
          color: #1e3a8a;
          font-style: italic;
        }
        .research-notes-container details {
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          margin: 0.5rem 0;
        }
        .research-notes-container summary {
          cursor: pointer;
          font-weight: 700;
          color: #1e3a8a;
          list-style: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .research-notes-container summary::before {
          content: '▶';
          font-size: 0.65em;
          color: #2563eb;
          transition: transform 0.2s ease;
        }
        .research-notes-container details[open] summary::before {
          transform: rotate(90deg);
        }
        .research-notes-container .mermaid {
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 14px;
          padding: 1.5rem;
          margin: 0.5rem 0;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow-x: auto;
        }
        .research-notes-container .mermaid svg {
          max-width: 100%;
          height: auto;
        }
        .research-notes-container .research-header,
        .research-notes-container .research-footer,
        .research-notes-container .executive-summary,
        .research-notes-container .fit-together,
        .research-notes-container .why-matters,
        .research-notes-container .quick-summary {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          color: #1e3a8a;
        }
        .research-notes-container .key-insights ul {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0.75rem;
          list-style: none;
          padding: 0;
        }
        .research-notes-container .key-insights li {
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          color: #1e3a8a;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .research-notes-container .fit-together,
        .research-notes-container .why-matters,
        .research-notes-container .quick-summary {
          border-left: 4px solid #2563eb;
        }
        .research-notes-container .why-matters {
          border-left-color: #1d4ed8;
        }
        .research-notes-container .quick-summary {
          border-left-color: #60a5fa;
        }
        #mermaid-error-svg, .mermaid-error, [id^="dmermaid-"] {
          display: none !important;
          height: 0 !important;
          width: 0 !important;
          position: absolute !important;
          pointer-events: none !important;
        }
      `}</style>

      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

export default ResearchNotes;
