require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('./db');
const Document = require('./models/Document');
const Version = require('./models/Version');
const User = require('./models/User');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

sequelize.sync({ alter: true })
  .then(() => console.log('PostgreSQL connected and tables synced'))
  .catch(err => console.error('Database error:', err));

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });
    const user = await User.create({ name, email, password });
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, name: user.name });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, name: user.name });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Docs ─────────────────────────────────────────────────────────────────────
app.get('/docs', requireAuth, async (req, res) => {
  try {
    const docs = await Document.findAll({
      where: { ownerId: req.user.id },
      attributes: ['id', 'title', 'version', 'updatedAt'],
      order: [['updatedAt', 'DESC']]
    });
    res.json(docs);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/docs', requireAuth, async (req, res) => {
  try {
    const doc = await Document.create({
      id: uuidv4(), title: req.body.title || 'Untitled',
      content: '', version: 0, ownerId: req.user.id
    });
    res.json(doc);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/docs/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /docs/:id/content — save content directly
app.patch('/docs/:id/content', requireAuth, async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const newVersion = (doc.version || 0) + 1;
    await doc.update({ content: req.body.content, version: newVersion });
    await Version.create({
      docId: doc.id, version: newVersion,
      content: req.body.content, editedBy: req.user.name, delta: req.body.content
    });
    // Keep socket state in sync
    if (docState[doc.id]) {
      docState[doc.id].content = req.body.content;
      docState[doc.id].version = newVersion;
    }
    res.json({ ok: true, version: newVersion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});




app.delete('/docs/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await Version.destroy({ where: { docId: doc.id } });
    await doc.destroy();
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Version history (NEW) ────────────────────────────────────────────────────
app.get('/docs/:id/versions', requireAuth, async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const versions = await Version.findAll({
      where: { docId: req.params.id },
      attributes: ['id', 'version', 'editedBy', 'createdAt', 'content'],
      order: [['version', 'DESC']],
      limit: 50
    });
    res.json(versions);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { next(new Error('Unauthorized')); }
});

const docState = {};

io.on('connection', (socket) => {
  socket.on('join-doc', async ({ docId }) => {
    socket.join(docId);
    socket.docId = docId;
    socket.userId = socket.user.name;
    let doc = await Document.findByPk(docId);
    if (!doc) return socket.emit('error', { message: 'Document not found' });
    docState[docId] = docState[docId] || { content: doc.content, version: doc.version };
    socket.emit('load-doc', docState[docId]);
    socket.to(docId).emit('user-joined', { userId: socket.user.name });
  });

  socket.on('send-changes', async ({ docId, delta, version }) => {
     console.log('send-changes received', { docId, version, deltaLength: delta?.length });
    const state = docState[docId];
    if (!state) return;
    if (version < state.version) {
      socket.emit('conflict', { yourDelta: delta, serverContent: state.content, serverVersion: state.version });
      return;
    }
    state.content = delta;
    state.version++;
    await Document.update(
      { content: state.content, version: state.version, lastEditedBy: socket.user.name },
      { where: { id: docId } }
    );
    await Version.create({
      docId, version: state.version,
      content: state.content, editedBy: socket.user.name, delta
    });
    socket.to(docId).emit('receive-changes', { delta, version: state.version, userId: socket.user.name });
    socket.emit('save-confirmed', { version: state.version });
  });

  socket.on('typing', ({ docId }) => {
    socket.to(docId).emit('user-typing', { userId: socket.user.name });
  });

  socket.on('disconnect', () => {
    if (socket.docId) io.to(socket.docId).emit('user-left', { userId: socket.user.name });
  });
});

server.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT || 3001}`);
});