const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'supersecret';

// Minimal app mock for testing routes in isolation
let mockUsers = [];

const bcrypt = require('bcryptjs');
const app = express();
app.use(express.json());

// Simulate register
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Missing fields' });
  if (!/\S+@\S+\.\S+/.test(email))
    return res.status(400).json({ error: 'Valid email required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (mockUsers.find(u => u.email === email))
    return res.status(400).json({ error: 'Email already in use' });
  const hashed = await bcrypt.hash(password, 10);
  const user = { id: mockUsers.length + 1, name, email, password: hashed };
  mockUsers.push(user);
  const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, name: user.name });
});

// Simulate login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Missing fields' });
  const user = mockUsers.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, name: user.name });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => { mockUsers = []; });

describe('POST /register', () => {
  test('creates account and returns token', async () => {
    const res = await request(app).post('/register')
      .send({ name: 'Tanishka', email: 'tanishka@test.com', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.name).toBe('Tanishka');
  });

  test('rejects duplicate email', async () => {
    await request(app).post('/register')
      .send({ name: 'Tanishka', email: 'tanishka@test.com', password: 'secret123' });
    const res = await request(app).post('/register')
      .send({ name: 'Tanishka', email: 'tanishka@test.com', password: 'secret123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email already in use');
  });

  test('rejects short password', async () => {
    const res = await request(app).post('/register')
      .send({ name: 'Tanishka', email: 'tanishka@test.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  test('rejects invalid email', async () => {
    const res = await request(app).post('/register')
      .send({ name: 'Tanishka', email: 'notanemail', password: 'secret123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });
});

describe('POST /login', () => {
  beforeEach(async () => {
    await request(app).post('/register')
      .send({ name: 'Tanishka', email: 'tanishka@test.com', password: 'secret123' });
  });

  test('returns token on valid credentials', async () => {
    const res = await request(app).post('/login')
      .send({ email: 'tanishka@test.com', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/login')
      .send({ email: 'tanishka@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('rejects unknown email', async () => {
    const res = await request(app).post('/login')
      .send({ email: 'nobody@test.com', password: 'secret123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });
});