import { useEffect, useRef, type FC } from 'react';
import mermaid from 'mermaid';

// ============================================================================
// Types
// ============================================================================

interface MermaidDiagramProps {
  /** The Mermaid diagram definition string */
  chart: string;
  /** Optional CSS class name */
  className?: string;
  /** Optional unique ID for the diagram */
  id?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Component for rendering Mermaid diagrams from AI-generated content.
 * Supports flowcharts, mindmaps, sequence diagrams, and more.
 */
const MermaidDiagram: FC<MermaidDiagramProps> = ({ 
  chart, 
  className = '', 
  id 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    // Initialize mermaid with theme settings
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#fff',
        primaryBorderColor: '#818cf8',
        lineColor: '#94a3b8',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        background: '#0f172a',
        mainBkg: '#1e293b',
        nodeBorder: '#6366f1',
        clusterBkg: '#1e293b',
        clusterBorder: '#475569',
        titleColor: '#f1f5f9',
        edgeLabelBackground: '#1e293b',
      },
      flowchart: {
        curve: 'basis',
        padding: 20,
      },
      mindmap: {
        padding: 20,
      },
    });
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !chart.trim()) return;

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';
        
        // Validate and clean the chart definition
        let cleanChart = chart.trim();
        
        // Remove any markdown code block markers if present
        if (cleanChart.startsWith('```')) {
          cleanChart = cleanChart
            .replace(/^```(?:mermaid)?/m, '')
            .replace(/```$/m, '')
            .trim();
        }

        // Render the diagram
        const { svg } = await mermaid.render(diagramId, cleanChart);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          
          // Make SVG responsive
          const svgElement = containerRef.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
          }
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        // Show fallback with the raw diagram code
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="mermaid-error">
              <p class="text-amber-400 text-sm mb-2">⚠️ Diagram Preview</p>
              <pre class="text-gray-700 text-xs bg-gray-50/50 p-3 rounded-lg overflow-auto">${chart}</pre>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [chart, diagramId]);

  if (!chart.trim()) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={`mermaid-container p-4 bg-white/50 rounded-xl border border-gray-200 overflow-auto ${className}`}
    />
  );
};

export default MermaidDiagram;
