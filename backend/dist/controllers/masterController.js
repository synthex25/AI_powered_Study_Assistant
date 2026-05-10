"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeatMapAndQuiz = exports.updateQuiz = exports.updateHeatMap = void 0;
const userService = __importStar(require("../services/userService"));
const apiResponse_1 = require("../utils/apiResponse");
const errorHandler_1 = require("../middleware/errorHandler");
exports.updateHeatMap = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { date } = req.body;
    const email = req.user?.email;
    if (!email) {
        (0, apiResponse_1.sendUnauthorized)(res);
        return;
    }
    await userService.updateUserHeatMap(email, date);
    (0, apiResponse_1.sendSuccess)(res, null, 'Heat map updated successfully');
});
exports.updateQuiz = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { title, totalScore, obtainedScore, date } = req.body;
    const email = req.user?.email;
    if (!email) {
        (0, apiResponse_1.sendUnauthorized)(res);
        return;
    }
    await userService.updateUserQuiz(email, title, totalScore, obtainedScore, date);
    (0, apiResponse_1.sendSuccess)(res, null, 'Quiz updated successfully');
});
exports.getHeatMapAndQuiz = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const email = req.user?.email;
    if (!email) {
        (0, apiResponse_1.sendUnauthorized)(res);
        return;
    }
    const data = await userService.getUserHeatMapAndQuiz(email);
    (0, apiResponse_1.sendSuccess)(res, data);
});
//# sourceMappingURL=masterController.js.map