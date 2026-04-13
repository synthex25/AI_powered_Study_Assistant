import api from '../config/axios';
import type { HeatMapEntry, QuizEntry } from '../types';

interface HeatMapQuizResponse {
  heatMap: HeatMapEntry[];
  quiz: QuizEntry[];
}

interface UpdateHeatMapParams {
  date: string;
}

interface UpdateQuizParams {
  title: string;
  totalScore: number;
  obtainedScore: number;
  date: string;
}

/**
 * Master data service for heatmap and quiz API calls
 */
export const masterService = {
  /**
   * Get user's heatmap and quiz data
   */
  getHeatMapAndQuiz: async (): Promise<HeatMapQuizResponse> => {
    const response = await api.get<{ success: boolean; data: HeatMapQuizResponse }>('/master');
    return response.data.data;
  },

  /**
   * Update user's heatmap with a new entry
   */
  updateHeatMap: async (params: UpdateHeatMapParams): Promise<void> => {
    await api.post('/master/heatmap', params);
  },

  /**
   * Update or create a quiz entry
   */
  updateQuiz: async (params: UpdateQuizParams): Promise<void> => {
    await api.post('/master/quiz', params);
  },
};
