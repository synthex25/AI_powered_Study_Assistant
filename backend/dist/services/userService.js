"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserHeatMapAndQuiz = exports.updateUserQuiz = exports.updateUserHeatMap = exports.getUserByEmail = void 0;
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = require("../errors/AppError");
const logger_1 = __importDefault(require("../utils/logger"));
const getUserByEmail = async (email) => {
    const user = await User_1.default.findOne({ email });
    if (!user) {
        throw new AppError_1.NotFoundError('User not found');
    }
    return user;
};
exports.getUserByEmail = getUserByEmail;
const updateUserHeatMap = async (email, date) => {
    const user = await (0, exports.getUserByEmail)(email);
    logger_1.default.debug(`[HeatMap] Updating for user: ${email}, date: ${date}`);
    logger_1.default.debug(`[HeatMap] Current heatMap entries: ${JSON.stringify(user.heatMap)}`);
    const existingEntry = user.heatMap.find((item) => item.date === date);
    if (!existingEntry) {
        logger_1.default.debug(`[HeatMap] No existing entry for ${date}, creating new entry with value 1`);
        user.heatMap.push({ date, value: 1 });
    }
    else {
        logger_1.default.debug(`[HeatMap] Found existing entry for ${date} with value ${existingEntry.value}, incrementing to ${existingEntry.value + 1}`);
        existingEntry.value += 1;
    }
    // Explicitly mark as modified for Mongoose to detect changes inside the array
    user.markModified('heatMap');
    await user.save();
    logger_1.default.info(`[HeatMap] Successfully updated for user: ${email}, date: ${date}, new value: ${existingEntry ? existingEntry.value : 1}`);
};
exports.updateUserHeatMap = updateUserHeatMap;
const updateUserQuiz = async (email, title, totalScore, obtainedScore, date) => {
    const user = await (0, exports.getUserByEmail)(email);
    const existingQuiz = user.quiz.find((item) => item.name === title);
    if (!existingQuiz) {
        user.quiz.push({ name: title, totalScore, obtainedScore, date });
    }
    else {
        existingQuiz.totalScore = totalScore;
        existingQuiz.obtainedScore = obtainedScore;
    }
    // Explicitly mark as modified
    user.markModified('quiz');
    await user.save();
    logger_1.default.debug(`Quiz updated for user: ${email}, quiz: ${title}`);
};
exports.updateUserQuiz = updateUserQuiz;
const getUserHeatMapAndQuiz = async (email) => {
    const user = await (0, exports.getUserByEmail)(email);
    return {
        heatMap: user.heatMap,
        quiz: user.quiz,
    };
};
exports.getUserHeatMapAndQuiz = getUserHeatMapAndQuiz;
//# sourceMappingURL=userService.js.map