import type { FC } from 'react';
import { motion } from 'framer-motion';
import { Video, Globe, ExternalLink, Sparkles, BookOpen, Youtube, Search, ArrowRight } from 'lucide-react';
import EmptyState from './EmptyState';

// ============================================================================
// Types
// ============================================================================

interface VideoRecommendation {
  url: string;
  title: string;
  description?: string;
}

interface WebRecommendation {
  url: string;
  title: string;
  description?: string;
}

interface RecommendationProps {
  youtubeData?: VideoRecommendation[];
  webData?: WebRecommendation[];
  recommendations?: string;
}

// ============================================================================
// Styled HTML Content Component
// ============================================================================

const RecommendationContent: FC<{ html: string }> = ({ html }) => {
  return (
    <div 
      className="recommendation-content"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        color: '#e2e8f0',
        fontSize: '0.95rem',
        lineHeight: '1.7',
      }}
    />
  );
};

// ============================================================================
// Main Component
// ============================================================================

const Recommendation: FC<RecommendationProps> = ({ 
  youtubeData = [], 
  webData = [],
  recommendations
}) => {
  const hasNoData = youtubeData.length === 0 && webData.length === 0 && !recommendations;

  if (hasNoData) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={<Sparkles size={48} className="text-indigo-400" />}
          title="No Recommendations Yet"
          description="Upload your content and click Assist AI to get personalized study recommendations."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Inline styles for HTML content */}
      <style>{`
        .recommendation-content {
          color: #e2e8f0;
        }
        .recommendation-content h4 {
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          margin-top: 1.75rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
        }
        .recommendation-content h4:first-child {
          margin-top: 0;
        }
        .recommendation-content ul, .recommendation-content ol {
          list-style: none;
          padding-left: 0;
          margin: 0.75rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .recommendation-content li {
          color: #cbd5e1;
          padding: 0.75rem 1rem;
          padding-left: 2rem;
          position: relative;
          font-size: 0.9rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 0.75rem;
          transition: all 0.2s ease;
        }
        .recommendation-content li:hover {
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.2);
          transform: translateX(4px);
        }
        .recommendation-content ul li::before {
          content: "→";
          color: #818cf8;
          font-weight: bold;
          position: absolute;
          left: 0.75rem;
        }
        .recommendation-content ol {
          counter-reset: item;
        }
        .recommendation-content ol li {
          counter-increment: item;
          padding-left: 2.5rem;
        }
        .recommendation-content ol li::before {
          content: counter(item);
          color: #fff;
          font-weight: 600;
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
        }
        .recommendation-content p {
          color: #94a3b8;
          margin: 0.75rem 0;
          font-size: 0.9rem;
        }
        .recommendation-content code {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
          color: #a5b4fc;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-family: 'Fira Code', 'JetBrains Mono', monospace;
          border: 1px solid rgba(99, 102, 241, 0.2);
          margin: 0.1rem;
          display: inline-block;
        }
        .recommendation-content strong {
          color: #f1f5f9;
          font-weight: 600;
        }
        .recommendations-content {
          background: rgba(15, 23, 42, 0.4);
          border-radius: 1rem;
          padding: 1.25rem;
        }
      `}</style>

      {/* AI Study Recommendations */}
      {recommendations && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-600/10 via-purple-600/10 to-indigo-600/5 border border-indigo-500/30 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Sparkles size={22} className="text-indigo-400" />
            Study Recommendations
          </h3>
          <RecommendationContent html={recommendations} />
        </motion.section>
      )}

      {/* YouTube Resources */}
      {youtubeData.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-600/10 to-orange-600/10 border border-red-500/30 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Youtube size={22} className="text-red-400" />
            Video Resources
          </h3>
          <div className="grid gap-3">
            {youtubeData.map((video, index) => (
              <motion.a
                key={`youtube-${index}`}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.01, x: 4 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:border-red-500/30 transition-all group"
              >
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Video className="text-red-400" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium block">{video.title}</span>
                  {video.description && (
                    <span className="text-gray-400 text-sm">{video.description}</span>
                  )}
                </div>
                <ArrowRight className="text-gray-500 group-hover:text-red-400 transition-colors flex-shrink-0" size={18} />
              </motion.a>
            ))}
          </div>
        </motion.section>
      )}

      {/* Website Resources */}
      {webData.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-2xl p-6"
        >
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Globe size={22} className="text-blue-400" />
            Learning Resources
          </h3>
          <div className="grid gap-3">
            {webData.map((site, index) => {
              // Determine icon based on URL
              const getIcon = () => {
                if (site.url.includes('wikipedia')) return <BookOpen className="text-blue-400" size={22} />;
                if (site.url.includes('khan')) return <BookOpen className="text-green-400" size={22} />;
                if (site.url.includes('coursera')) return <BookOpen className="text-blue-300" size={22} />;
                if (site.url.includes('stackoverflow')) return <Search className="text-orange-400" size={22} />;
                if (site.url.includes('medium')) return <BookOpen className="text-gray-300" size={22} />;
                if (site.url.includes('scholar.google')) return <Search className="text-purple-400" size={22} />;
                if (site.url.includes('developer.mozilla')) return <Globe className="text-orange-300" size={22} />;
                return <Search className="text-blue-400" size={22} />;
              };
              
              return (
                <motion.a
                  key={`web-${index}`}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.01, x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    {getIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium block">{site.title}</span>
                    {site.description && (
                      <span className="text-gray-400 text-sm">{site.description}</span>
                    )}
                  </div>
                  <ExternalLink className="text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0" size={18} />
                </motion.a>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* Quick Actions */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/30 rounded-2xl p-6"
      >
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-3">
          <BookOpen size={22} className="text-emerald-400" />
          Continue Learning
        </h3>
        <p className="text-gray-400 mb-4 text-sm">
          Ready to test your knowledge? Try these interactive features:
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-medium cursor-pointer hover:bg-emerald-500/25 transition-colors">
            📚 Review Key Terms
          </div>
          <div className="px-4 py-2.5 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-medium cursor-pointer hover:bg-purple-500/25 transition-colors">
            🧠 Take the Quiz
          </div>
          <div className="px-4 py-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-300 text-sm font-medium cursor-pointer hover:bg-indigo-500/25 transition-colors">
            💬 Ask AI Tutor
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default Recommendation;
