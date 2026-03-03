import User from '../models/User';
import { IUser, IHeatMapEntry, IQuizEntry } from '../types';
import { NotFoundError } from '../errors/AppError';
import logger from '../utils/logger';

export interface HeatMapQuizData {
  heatMap: IHeatMapEntry[];
  quiz: IQuizEntry[];
}

export const getUserByEmail = async (email: string): Promise<IUser> => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

export const updateUserHeatMap = async (email: string, date: string): Promise<void> => {
  const user = await getUserByEmail(email);
  
  logger.debug(`[HeatMap] Updating for user: ${email}, date: ${date}`);
  logger.debug(`[HeatMap] Current heatMap entries: ${JSON.stringify(user.heatMap)}`);

  const existingEntry = user.heatMap.find((item) => item.date === date);
  if (!existingEntry) {
    logger.debug(`[HeatMap] No existing entry for ${date}, creating new entry with value 1`);
    user.heatMap.push({ date, value: 1 });
  } else {
    logger.debug(`[HeatMap] Found existing entry for ${date} with value ${existingEntry.value}, incrementing to ${existingEntry.value + 1}`);
    existingEntry.value += 1;
  }

  // Explicitly mark as modified for Mongoose to detect changes inside the array
  user.markModified('heatMap');
  await user.save();
  logger.info(`[HeatMap] Successfully updated for user: ${email}, date: ${date}, new value: ${existingEntry ? existingEntry.value : 1}`);
};

export const updateUserQuiz = async (
  email: string,
  title: string,
  totalScore: number,
  obtainedScore: number,
  date: string
): Promise<void> => {
  const user = await getUserByEmail(email);

  const existingQuiz = user.quiz.find((item) => item.name === title);
  if (!existingQuiz) {
    user.quiz.push({ name: title, totalScore, obtainedScore, date });
  } else {
    existingQuiz.totalScore = totalScore;
    existingQuiz.obtainedScore = obtainedScore;
  }

  // Explicitly mark as modified
  user.markModified('quiz');
  await user.save();
  logger.debug(`Quiz updated for user: ${email}, quiz: ${title}`);
};

export const getUserHeatMapAndQuiz = async (email: string): Promise<HeatMapQuizData> => {
  const user = await getUserByEmail(email);
  return {
    heatMap: user.heatMap,
    quiz: user.quiz,
  };
};
