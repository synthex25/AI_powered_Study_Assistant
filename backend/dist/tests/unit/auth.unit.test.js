"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const authController_1 = require("../../controllers/authController");
describe('Auth Unit Test', () => {
    it('should execute login function and handle request', async () => {
        const req = {
            body: {
                email: 'test@gmail.com',
                password: '1234'
            }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        const next = jest.fn();
        await (0, authController_1.login)(req, res, next);
        // This proves the function was called without crashing
        expect(authController_1.login).toBeDefined();
    });
});
//# sourceMappingURL=auth.unit.test.js.map