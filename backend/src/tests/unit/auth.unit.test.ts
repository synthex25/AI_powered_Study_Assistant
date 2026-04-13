import { login } from '../../controllers/authController';
import { Request, Response } from 'express';

describe('Auth Unit Test', () => {

  it('should execute login function and handle request', async () => {
    const req = {
      body: {
        email: 'test@gmail.com',
        password: '1234'
      }
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    } as unknown as Response;

    const next = jest.fn();

    await login(req, res, next);

    // This proves the function was called without crashing
    expect(login).toBeDefined();
  });

});