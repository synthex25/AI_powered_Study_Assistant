import mongoose, { Document, Types } from 'mongoose';
export interface IChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}
export interface IChatSession extends Document {
    userId: Types.ObjectId;
    title: string;
    documentIds: string[];
    messages: IChatMessage[];
    outputLanguage: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IChatSession, {}, {}, {}, mongoose.Document<unknown, {}, IChatSession, {}, {}> & IChatSession & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ChatSession.d.ts.map