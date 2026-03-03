import { useEffect, useRef, type FC } from 'react';
import mermaid from 'mermaid';
import { HiSparkles } from 'react-icons/hi';

// ============================================================================
// Types
// ============================================================================

interface ResearchNotesProps {
  /** HTML content of the research notes */
  content: string;
  /** Optional CSS class */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Component for rendering rich AI-generated research notes.
 * Handles Mermaid diagrams, interactive elements, and styling.
 */
const ResearchNotes: FC<ResearchNotesProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      suppressErrorRendering: true,
      logLevel: 5, // fatal only
      themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#fff',
        primaryBorderColor: '#818cf8',
        lineColor: '#94a3b8',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        background: 'transparent',
        mainBkg: '#1e293b',
        nodeBorder: '#6366f1',
        clusterBkg: '#1e293b',
        clusterBorder: '#475569',
        titleColor: '#f1f5f9',
        edgeLabelBackground: '#1e293b',
      },
      flowchart: { curve: 'basis', padding: 20 },
    });
  }, []);

  useEffect(() => {
    const showFallback = (element: HTMLElement, rawCode: string) => {
      element.innerHTML = `
        <div class="bg-gray-100/80 p-5 rounded-xl border border-amber-500/30 shadow-lg">
          <div class="flex items-center gap-2 mb-3 text-amber-400">
            <span class="text-lg">📊</span>
            <span class="font-semibold text-sm">Diagram Code</span>
          </div>
          <pre class="text-gray-700 text-xs overflow-auto bg-gray-50/50 p-3 rounded-lg border border-gray-200 font-mono leading-relaxed max-h-64 whitespace-pre-wrap">${rawCode.substring(0, 800)}${rawCode.length > 800 ? '\n...' : ''}</pre>
        </div>
      `;
      element.setAttribute('data-processed', 'fallback');
    };

    const renderMermaidDiagrams = async () => {
      if (!containerRef.current) return;

      const mermaidElements = containerRef.current.querySelectorAll('.mermaid');
      
      for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i] as HTMLElement;
        
        // Skip if already processed
        if (element.getAttribute('data-processed')) continue;

        const rawCode = element.textContent?.trim() || '';
        
        // If no code, mark as empty
        if (!rawCode) {
          element.setAttribute('data-processed', 'empty');
          continue;
        }

        // Sanitize diagram code 
        let finalCode = rawCode;

        // 1. Remove "mermaid" prefix if AI included it
        const lines = finalCode.split('\n');
        if (lines[0].trim().toLowerCase() === 'mermaid') {
          finalCode = lines.slice(1).join('\n').trim();
        }

        // 2. Fix common shorthand/typo keywords
        const firstLine = finalCode.split('\n')[0].trim().toLowerCase();
        
        // sequence → sequenceDiagram
        if (firstLine === 'sequence' || firstLine.startsWith('sequence ') || 
            (firstLine.startsWith('sequence') && !firstLine.startsWith('sequencediagram'))) {
          const rest = finalCode.replace(/^sequence\s*/i, '').trim();
          finalCode = 'sequenceDiagram\n' + rest;
        }
        
        // flow → flowchart TD
        if (firstLine === 'flow' || (firstLine.startsWith('flow ') && !firstLine.startsWith('flowchart'))) {
          const rest = finalCode.replace(/^flow\s*/i, '').trim();
          finalCode = 'flowchart TD\n' + rest;
        }
        
        // class → classDiagram
        if (firstLine === 'class' || (firstLine.startsWith('class ') && !firstLine.startsWith('classdiagram'))) {
          const rest = finalCode.replace(/^class\s*/i, '').trim();
          finalCode = 'classDiagram\n' + rest;
        }
        
        // state → stateDiagram-v2
        if (firstLine === 'state' || (firstLine.startsWith('state ') && !firstLine.startsWith('statediagram'))) {
          const rest = finalCode.replace(/^state\s*/i, '').trim();
          finalCode = 'stateDiagram-v2\n' + rest;
        }

        // 3. Special handling for mindmaps
        if (finalCode.toLowerCase().startsWith('mindmap')) {
          // Clean up mindmap-specific issues
          const mmLines = finalCode.split('\n');
          const cleanLines: string[] = [];
          
          for (const line of mmLines) {
            let cleanLine = line;
            
            // Remove any markdown artifacts
            cleanLine = cleanLine.replace(/\*\*/g, '');
            cleanLine = cleanLine.replace(/`/g, '');
            
            // Fix common AI mistakes in labels
            if (!line.includes('root((') && !line.trim().match(/^mindmap$/i)) {
              // Remove any stray parentheses/brackets from non-root lines
              const indent = line.length - line.trimStart().length;
              let label = line.trim().replace(/[\[\]\(\)\{\}]/g, '');
              // Remove quotes
              label = label.replace(/['"]/g, '');
              if (label) {
                cleanLine = ' '.repeat(indent) + label;
              }
            }
            
            if (cleanLine.trim()) {
              cleanLines.push(cleanLine);
            }
          }
          
          finalCode = cleanLines.join('\n');
        }

        // 4. Auto-detect missing diagram type
        const validTypes = ['graph ', 'flowchart ', 'pie', 'sequencediagram', 'classdiagram', 
          'statediagram', 'erdiagram', 'gantt', 'journey', 'gitgraph', 'mindmap', 'timeline', 'xychart', 'block'];
        const hasValidType = validTypes.some(t => finalCode.toLowerCase().startsWith(t.toLowerCase()));
        
        if (!hasValidType) {
          // Check if it looks like a sequence diagram (has participant, ->>)
          if (finalCode.includes('participant') || finalCode.includes('->>' ) || finalCode.includes('-->>')) {
            finalCode = 'sequenceDiagram\n' + finalCode;
          } else if (finalCode.includes('-->') || finalCode.includes('---') || finalCode.includes('==>')) {
            finalCode = 'flowchart TD\n' + finalCode;
          } else {
            // Can't determine type, show fallback
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
            
            // Make SVG responsive
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

      // Final pass: ensure no empty .mermaid boxes remain
      const allMermaid = containerRef.current.querySelectorAll('.mermaid');
      allMermaid.forEach((el, idx) => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl.getAttribute('data-processed') || htmlEl.innerHTML.trim() === '') {
          const code = htmlEl.textContent?.trim() || `[Diagram ${idx + 1}]`;
          showFallback(htmlEl, code);
        }
      });
    };

    // Delay to ensure DOM is ready
    const timer = setTimeout(renderMermaidDiagrams, 150);
    return () => clearTimeout(timer);
  }, [content]);

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
          <HiSparkles className="text-4xl text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Research Notes Yet</h3>
        <p className="text-gray-400 text-sm">
          Click "Assist AI" to generate comprehensive research content.
        </p>
      </div>
    );
  }

  return (
    <div className={`research-notes-container ${className}`}>
      {/* Custom Styles for Research Notes */}
      <style>{`
        .research-notes-container {
          color: #e2e8f0;
          font-size: 1rem;
          line-height: 1.75;
        }
        
        .research-notes-container article {
          max-width: 100%;
        }
        
        .research-notes-container h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 1rem;
          border-bottom: 2px solid rgba(99, 102, 241, 0.3);
          padding-bottom: 0.75rem;
        }
        
        .research-notes-container h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #a5b4fc;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .research-notes-container h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #c4b5fd;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .research-notes-container p {
          margin-bottom: 1rem;
          color: #cbd5e1;
        }
        
        .research-notes-container ul, 
        .research-notes-container ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        
        .research-notes-container li {
          margin-bottom: 0.5rem;
          color: #cbd5e1;
        }
        
        .research-notes-container strong {
          color: #fff;
          font-weight: 600;
        }
        
        .research-notes-container code {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        
        .research-notes-container pre {
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          margin-bottom: 1rem;
        }
        
        .research-notes-container table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-bottom: 1.25rem;
          font-size: 0.9375rem;
          border-radius: 0.75rem;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .research-notes-container th {
          background: rgba(99, 102, 241, 0.15);
          color: #fff;
          font-weight: 600;
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .research-notes-container td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
          vertical-align: top;
        }
        
        .research-notes-container tr:last-child td {
          border-bottom: none;
        }
        
        .research-notes-container tr:nth-child(even) {
          background: rgba(255, 255, 255, 0.03);
        }
        
        /* Interactive Quiz Elements */
        .research-notes-container details {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        
        .research-notes-container summary {
          cursor: pointer;
          font-weight: 600;
          color: #a5b4fc;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .research-notes-container details[open] summary {
          margin-bottom: 0.75rem;
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
          padding-bottom: 0.75rem;
        }
        
        /* Mermaid Diagram Container */
        .research-notes-container .mermaid {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }
        
        /* Research Sections */
        .research-notes-container section {
          margin-bottom: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .research-notes-container .research-header {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 1rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        
        .research-notes-container .executive-summary {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0.75rem;
          padding: 1rem;
          margin-top: 1rem;
        }
        
        .research-notes-container .key-insights ul {
          display: grid;
          gap: 0.5rem;
          list-style: none;
          padding: 0;
        }
        
        .research-notes-container .key-insights li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 0.5rem;
        }
        
        .research-notes-container .key-insights li::before {
          content: "✓";
          color: #22c55e;
          font-weight: bold;
        }
        
        .research-notes-container .research-footer {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-top: 1.5rem;
        }
        
        /* Synthesis Sections */
        .research-notes-container .fit-together,
        .research-notes-container .why-matters,
        .research-notes-container .quick-summary {
          border-left: 4px solid #6366f1;
          background: linear-gradient(to right, rgba(99, 102, 241, 0.1), transparent);
          padding: 1.25rem !important;
          margin-bottom: 1.5rem;
          border-radius: 0 1rem 1rem 0;
        }
        
        .research-notes-container .why-matters {
          border-left-color: #f59e0b;
          background: linear-gradient(to right, rgba(245, 158, 11, 0.1), transparent);
        }
        
        .research-notes-container .quick-summary {
          border-left-color: #22c55e;
          background: linear-gradient(to right, rgba(34, 197, 94, 0.1), transparent);
        }

        /* Suppress Mermaid global error UI that appends to body */
        #mermaid-error-svg, 
        .mermaid-error,
        [id^="dmermaid-"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          width: 0 !important;
          position: absolute !important;
          pointer-events: none !important;
        }
      `}</style>
      
      {/* Render the HTML content */}
      <div 
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    </div>
  );
};

export default ResearchNotes;
