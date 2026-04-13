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
      theme: 'default',
      themeVariables: {
        primaryColor: '#eff6ff',
        primaryTextColor: '#1e3a8a',
        primaryBorderColor: '#bfdbfe',
        lineColor: '#1d4ed8',
        secondaryColor: '#ffffff',
        tertiaryColor: '#eff6ff',
        background: '#ffffff',
        mainBkg: '#ffffff',
        nodeBorder: '#bfdbfe',
        clusterBkg: '#ffffff',
        clusterBorder: '#bfdbfe',
        titleColor: '#1e3a8a',
        edgeLabelBackground: '#eff6ff',
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
              <p class="text-blue-700 text-sm mb-2">Diagram Preview</p>
              <pre class="text-blue-900 text-xs bg-blue-50 p-3 rounded-lg overflow-auto border border-blue-200">${chart}</pre>
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
      className={`mermaid-container p-4 bg-white rounded-xl border border-blue-200 overflow-auto shadow-sm ${className}`}
    />
  );
};

export default MermaidDiagram;
