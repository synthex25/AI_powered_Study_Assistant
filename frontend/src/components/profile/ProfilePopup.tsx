import { useState, useEffect, type FC, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiCalendar, FiAward, FiFileText, FiActivity } from 'react-icons/fi';
import CalendarHeatmap from 'react-calendar-heatmap';
import ReactTooltip from 'react-tooltip';
import { message } from 'antd';
import 'react-calendar-heatmap/dist/styles.css';
import './heat.css';

import { useAppSelector } from '../../hooks';
import { masterService } from '../../services';
import type { HeatMapEntry, QuizEntry } from '../../types';

interface ProfilePopupProps {
  onClose: () => void;
}

interface HeatmapValue {
  date: Date;
  count: number;
}

const getColorClass = (value: HeatmapValue | null): string => {
  if (!value) return 'color-empty';
  if (value.count < 2) return 'color-scale-1';
  if (value.count < 4) return 'color-scale-2';
  if (value.count < 6) return 'color-scale-3';
  if (value.count < 8) return 'color-scale-4';
  return 'color-scale-5';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ProfilePopup: FC<ProfilePopupProps> = ({ onClose }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [quizData, setQuizData] = useState<QuizEntry[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatMapEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const user = useAppSelector((state) => state.persisted.user.user);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await masterService.getHeatMapAndQuiz();
        setQuizData(response.quiz || []);
        setHeatmapData(response.heatMap || []);
      } catch (error) {
        message.error('Failed to fetch profile data');
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchData();
    }
  }, [user?._id]);

  useEffect(() => {
    ReactTooltip.rebuild();
  }, [heatmapData, selectedYear]);

  const stats = useMemo(() => {
    const totalDocs = heatmapData.reduce((sum, entry) => sum + entry.value, 0);
    const totalQuizzes = quizData.length;
    const avgScore = totalQuizzes > 0
      ? Math.round(
          quizData.reduce((sum, q) => sum + (q.obtainedScore / q.totalScore) * 100, 0) / totalQuizzes,
        )
      : 0;

    const lastActivity = heatmapData.length > 0
      ? [...heatmapData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date
      : null;

    return { totalDocs, totalQuizzes, avgScore, lastActivity };
  }, [heatmapData, quizData]);

  const uniqueYears = useMemo(() => {
    const years = [...new Set(heatmapData.map((d) => new Date(d.date).getFullYear()))];
    if (years.length === 0) years.push(new Date().getFullYear());
    return years.sort((a, b) => b - a);
  }, [heatmapData]);

  const filteredHeatmapData: HeatmapValue[] = useMemo(() => {
    return heatmapData
      .filter((d) => new Date(d.date).getFullYear() === selectedYear)
      .map(({ date, value }) => ({ date: new Date(date), count: value }));
  }, [heatmapData, selectedYear]);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#eff6ff]/80"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-white/40" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-blue-200 shadow-sm"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-full transition-all z-10 border border-transparent hover:border-blue-200"
        >
          <FiX size={20} />
        </button>

        <div className="relative p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-blue-100 p-[3px] border border-blue-200">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl font-bold text-blue-900">
                    {initials}
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-blue-900">
              {user?.name || 'User'}
            </h2>
            <p className="text-blue-700 text-sm mt-1">{user?.email}</p>

            {user?.createdAt && (
              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200">
                <FiCalendar className="text-blue-600 text-xs" />
                <span className="text-xs text-blue-800">
                  Member since {formatDate(user.createdAt)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard
              icon={<FiFileText />}
              label="Documents"
              value={stats.totalDocs}
              loading={loading}
            />
            <StatCard
              icon={<FiAward />}
              label="Quizzes"
              value={stats.totalQuizzes}
              loading={loading}
            />
            <StatCard
              icon={<FiActivity />}
              label="Avg Score"
              value={`${stats.avgScore}%`}
              loading={loading}
            />
            <StatCard
              icon={<FiCalendar />}
              label="Last Active"
              value={stats.lastActivity ? formatDate(stats.lastActivity) : 'N/A'}
              loading={loading}
              small
            />
          </div>

          {quizData.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <FiAward className="text-blue-600" />
                Quiz Performance
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {quizData.slice(0, 5).map((quiz, idx) => (
                  <QuizScoreRow key={`${quiz.name}-${idx}`} quiz={quiz} />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                <FiActivity className="text-blue-600" />
                Activity Heatmap
              </h3>
              <div className="flex gap-1">
                {uniqueYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-3 py-1 text-xs rounded-full transition-all border ${
                      selectedYear === year
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
              {loading ? (
                <div className="h-32 flex items-center justify-center text-blue-700">
                  Loading...
                </div>
              ) : filteredHeatmapData.length > 0 ? (
                <>
                  <CalendarHeatmap
                    startDate={new Date(selectedYear, 0, 1)}
                    endDate={new Date(selectedYear, 11, 31)}
                    values={filteredHeatmapData}
                    classForValue={(value) => getColorClass(value as HeatmapValue | null)}
                    showWeekdayLabels={false}
                    tooltipDataAttrs={(value) => {
                      const heatmapValue = value as HeatmapValue | null;
                      if (!heatmapValue?.date) return { 'data-tip': '' };
                      return {
                        'data-tip': `${heatmapValue.date.toDateString()}: ${heatmapValue.count} documents`,
                      };
                    }}
                  />
                  <ReactTooltip effect="solid" />

                  <div className="flex items-center justify-end gap-2 mt-3">
                    <span className="text-xs text-blue-700">Less</span>
                    <div className="flex gap-1">
                      {['color-empty', 'color-scale-1', 'color-scale-2', 'color-scale-3', 'color-scale-4', 'color-scale-5'].map((cls) => (
                        <div key={cls} className={`w-3 h-3 rounded-sm ${cls}`} />
                      ))}
                    </div>
                    <span className="text-xs text-blue-700">More</span>
                  </div>
                </>
              ) : (
                <div className="h-32 flex items-center justify-center text-blue-700">
                  No activity data for {selectedYear}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  loading?: boolean;
  small?: boolean;
}

const StatCard: FC<StatCardProps> = ({ icon, label, value, loading, small }) => (
  <div className="relative bg-white rounded-xl p-4 border border-blue-200 overflow-hidden group hover:border-blue-300 transition-all shadow-sm">
    <div className="text-xl mb-2 text-blue-600">{icon}</div>
    {loading ? (
      <div className="h-6 w-16 bg-blue-100 rounded animate-pulse" />
    ) : (
      <div className={`font-bold text-blue-900 ${small ? 'text-xs' : 'text-xl'}`}>{value}</div>
    )}
    <div className="text-xs text-blue-700 mt-1">{label}</div>
  </div>
);

interface QuizScoreRowProps {
  quiz: QuizEntry;
}

const QuizScoreRow: FC<QuizScoreRowProps> = ({ quiz }) => {
  const percentage = Math.round((quiz.obtainedScore / quiz.totalScore) * 100);

  return (
    <div className="flex items-center gap-4 bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-blue-900 truncate">{quiz.name}</p>
        <p className="text-xs text-blue-700">{quiz.date}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-20 h-2 bg-blue-50 rounded-full overflow-hidden border border-blue-200">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-blue-900 w-12 text-right">
          {quiz.obtainedScore}/{quiz.totalScore}
        </span>
      </div>
    </div>
  );
};

export default ProfilePopup;
