import express from 'express';
import { updateHeatMap, updateQuiz, getHeatMapAndQuiz } from '../controllers/masterController';

const router = express.Router();

// Get Heat Map and Quiz
router.get('/', getHeatMapAndQuiz);

// Heat Map Routes
router.post('/heatmap', updateHeatMap);

// Quiz Routes
router.post('/quiz', updateQuiz);

export default router;
