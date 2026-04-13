import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());

// Dummy APIs
app.post('/test', (_req, res) => {
  res.status(200).json({ message: 'Success' });
});

app.post('/login', (req, res) => {
  if (req.body.password === '1234') {
    return res.status(400).json({ error: 'Invalid password' });
  }
  res.status(200).json({ message: 'Login success' });
});

app.post('/workspace', (req, res) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'No token' });
  }
  res.status(201).json({ message: 'Workspace created' });
});

describe('API Testing (Unit + Integration)', () => {

  beforeAll(() => {
    console.log('🚀 Starting API Testing...');
  });

  it('should return success response', async () => {
    const res = await request(app).post('/test');
    expect(res.statusCode).toBe(200);
  });

  it('should fail for invalid input', async () => {
    const res = await request(app).post('/login').send({
      email: 'test@gmail.com',
      password: '1234'
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return unauthorized without token', async () => {
    const res = await request(app).post('/workspace').send({
      name: 'Test'
    });

    expect(res.statusCode).toBe(401);
  });

  it('should create workspace with token', async () => {
    const res = await request(app)
      .post('/workspace')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Test Workspace' });

    expect(res.statusCode).toBe(201);
  });

  afterAll(() => {
    console.log('✅ API Testing Completed Successfully');
  });

});