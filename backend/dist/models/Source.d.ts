import mongoose, { Document } from 'mongoose';
export interface ISource extends Document {
    workspaceId: mongoose.Types.ObjectId;
    type: 'pdf' | 'text' | 'url';
    name: string;
    s3Key?: string;
    s3Bucket?: string;
    fileSize?: number;
    sourceUrl?: string;
    extractedTextPreview?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Source: mongoose.Model<ISource, {}, {}, {}, mongoose.Document<unknown, {}, ISource, {}, {}> & ISource & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Source;
//# sourceMappingURL=Source.d.ts.map