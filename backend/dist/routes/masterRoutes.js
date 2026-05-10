"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const masterController_1 = require("../controllers/masterController");
const router = express_1.default.Router();
// Get Heat Map and Quiz
router.get('/', masterController_1.getHeatMapAndQuiz);
// Heat Map Routes
router.post('/heatmap', masterController_1.updateHeatMap);
// Quiz Routes
router.post('/quiz', masterController_1.updateQuiz);
exports.default = router;
//# sourceMappingURL=masterRoutes.js.map