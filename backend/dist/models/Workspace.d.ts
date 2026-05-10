import mongoose, { Document } from 'mongoose';
interface Flashcard {
    front: string;
    back: string;
}
interface Quiz {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
}
interface GeneratedContent {
    title?: string;
    summary?: string;
    notes?: string;
    flashcards?: Flashcard[];
    quizzes?: Quiz[];
    keyConcepts?: string[];
    recommendations?: string;
    generatedAt?: Date;
}
export interface IWorkspace extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    sources: mongoose.Types.ObjectId[];
    generatedContent?: GeneratedContent;
    isProcessing: boolean;
    language: string;
    lastProcessedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Workspace: mongoose.Model<IWorkspace, {}, {}, {}, mongoose.Document<unknown, {}, IWorkspace, {}, {}> & IWorkspace & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Workspace;
//# sourceMappingURL=Workspace.d.ts.map