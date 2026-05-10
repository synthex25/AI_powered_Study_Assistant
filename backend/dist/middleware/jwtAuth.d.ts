import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
declare const verifyToken: (req: AuthRequest, res: Response, next: NextFunction) => void;
export default verifyToken;
//# sourceMappingURL=jwtAuth.d.ts.map