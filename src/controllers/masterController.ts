import { Response } from 'express';
import * as userService from '../services/userService';
import { sendSuccess, sendUnauthorized } from '../utils/apiResponse';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest, UpdateHeatMapBody, UpdateQuizBody } from '../types';

export const updateHeatMap = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { date } = req.body as UpdateHeatMapBody;
    const email = req.user?.email;

    if (!email) {
      sendUnauthorized(res);
      return;
    }

    await userService.updateUserHeatMap(email, date);
    sendSuccess(res, null, 'Heat map updated successfully');
  }
);

export const updateQuiz = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { title, totalScore, obtainedScore, date } = req.body as UpdateQuizBody;
    const email = req.user?.email;

    if (!email) {
      sendUnauthorized(res);
      return;
    }

    await userService.updateUserQuiz(email, title, totalScore, obtainedScore, date);
    sendSuccess(res, null, 'Quiz updated successfully');
  }
);

export const getHeatMapAndQuiz = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const email = req.user?.email;

    if (!email) {
      sendUnauthorized(res);
      return;
    }

    const data = await userService.getUserHeatMapAndQuiz(email);
    sendSuccess(res, data);
  }
);
