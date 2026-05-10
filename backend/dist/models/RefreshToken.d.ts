import mongoose, { Document, Types } from 'mongoose';
export interface IRefreshToken extends Document {
    token: string;
    userId: Types.ObjectId;
    expiresAt: Date;
    createdAt: Date;
    isRevoked: boolean;
}
declare const _default: mongoose.Model<IRefreshToken, {}, {}, {}, mongoose.Document<unknown, {}, IRefreshToken, {}, {}> & IRefreshToken & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=RefreshToken.d.ts.map