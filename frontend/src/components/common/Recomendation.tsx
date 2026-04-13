import type { FC } from 'react';
import { motion } from 'framer-motion';
import { Video, Globe, ExternalLink, Sparkles, BookOpen, Youtube, Search, ArrowRight } from 'lucide-react';
import EmptyState from './EmptyState';

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

const RecommendationContent: FC<{ html: string }> = ({ html }) => (
  <div
    className="recommendation-content"
    dangerouslySetInnerHTML={{ __html: html }}
    style={{
      color: '#1e3a8a',
      fontSize: '0.95rem',
      lineHeight: '1.7',
    }}
  />
);

const Recommendation: FC<RecommendationProps> = ({
  youtubeData = [],
  webData = [],
  recommendations,
}) => {
  const hasNoData = youtubeData.length === 0 && webData.length === 0 && !recommendations;

  if (hasNoData) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={<Sparkles size={48} className="text-blue-600" />}
          title="No Recommendations Yet"
          description="Upload your content and click Assist AI to get personalized study recommendations."
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <style>{`
        .recommendation-content {
          color: #1e3a8a;
        }
        .recommendation-content h4 {
          color: #1e3a8a;
          font-size: 1rem;
          font-weight: 600;
          margin-top: 1.75rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #bfdbfe;
        }
        .recommendation-content h4:first-child {
          margin-top: 0;
        }
        .recommendation-content ul,
        .recommendation-content ol {
          list-style: none;
          padding-left: 0;
          margin: 0.75rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .recommendation-content li {
          color: #1e3a8a;
          padding: 0.75rem 1rem;
          padding-left: 2rem;
          position: relative;
          font-size: 0.9rem;
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 0.75rem;
          transition: all 0.2s ease;
        }
        .recommendation-content li:hover {
          background: #eff6ff;
          border-color: #bfdbfe;
          transform: translateX(4px);
        }
        .recommendation-content ul li::before {
          content: "→";
          color: #2563eb;
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
          color: #ffffff;
          font-weight: 600;
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: #2563eb;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
        }
        .recommendation-content p {
          color: #1d4ed8;
          margin: 0.75rem 0;
          font-size: 0.9rem;
        }
        .recommendation-content code {
          background: #eff6ff;
          color: #1d4ed8;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-family: 'Fira Code', 'JetBrains Mono', monospace;
          border: 1px solid #bfdbfe;
          margin: 0.1rem;
          display: inline-block;
        }
        .recommendation-content strong {
          color: #1e3a8a;
          font-weight: 600;
        }
      `}</style>

      {recommendations && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2 mb-4">
            <Sparkles size={22} className="text-blue-600" />
            Study Recommendations
          </h3>
          <RecommendationContent html={recommendations} />
        </motion.section>
      )}

      {youtubeData.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2 mb-4">
            <Youtube size={22} className="text-blue-600" />
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
                className="flex items-center gap-4 p-4 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Video className="text-blue-600" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-blue-900 font-medium block">{video.title}</span>
                  {video.description && (
                    <span className="text-blue-800 text-sm">{video.description}</span>
                  )}
                </div>
                <ArrowRight className="text-blue-500 group-hover:text-blue-700 transition-colors flex-shrink-0" size={18} />
              </motion.a>
            ))}
          </div>
        </motion.section>
      )}

      {webData.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm"
        >
          <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2 mb-4">
            <Globe size={22} className="text-blue-600" />
            Learning Resources
          </h3>
          <div className="grid gap-3">
            {webData.map((site, index) => {
              const getIcon = () => {
                if (site.url.includes('wikipedia')) return <BookOpen className="text-blue-600" size={22} />;
                if (site.url.includes('khan')) return <BookOpen className="text-blue-500" size={22} />;
                if (site.url.includes('coursera')) return <BookOpen className="text-blue-500" size={22} />;
                if (site.url.includes('stackoverflow')) return <Search className="text-blue-600" size={22} />;
                if (site.url.includes('medium')) return <BookOpen className="text-blue-500" size={22} />;
                if (site.url.includes('scholar.google')) return <Search className="text-blue-600" size={22} />;
                if (site.url.includes('developer.mozilla')) return <Globe className="text-blue-500" size={22} />;
                return <Search className="text-blue-600" size={22} />;
              };

              return (
                <motion.a
                  key={`web-${index}`}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.01, x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-4 p-4 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    {getIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-blue-900 font-medium block">{site.title}</span>
                    {site.description && (
                      <span className="text-blue-800 text-sm">{site.description}</span>
                    )}
                  </div>
                  <ExternalLink className="text-blue-500 group-hover:text-blue-700 transition-colors flex-shrink-0" size={18} />
                </motion.a>
              );
            })}
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border border-blue-200 rounded-2xl p-6 shadow-sm"
      >
        <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2 mb-3">
          <BookOpen size={22} className="text-blue-600" />
          Continue Learning
        </h3>
        <p className="text-blue-800 mb-4 text-sm">
          Ready to test your knowledge? Try these interactive features:
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors">
            Review Key Terms
          </div>
          <div className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors">
            Take the Quiz
          </div>
          <div className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors">
            Ask AI Tutor
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default Recommendation;
