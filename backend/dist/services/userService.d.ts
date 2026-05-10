import { IUser, IHeatMapEntry, IQuizEntry } from '../types';
export interface HeatMapQuizData {
    heatMap: IHeatMapEntry[];
    quiz: IQuizEntry[];
}
export declare const getUserByEmail: (email: string) => Promise<IUser>;
export declare const updateUserHeatMap: (email: string, date: string) => Promise<void>;
export declare const updateUserQuiz: (email: string, title: string, totalScore: number, obtainedScore: number, date: string) => Promise<void>;
export declare const getUserHeatMapAndQuiz: (email: string) => Promise<HeatMapQuizData>;
//# sourceMappingURL=userService.d.ts.map