require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sequelize = require('./db');
const Document = require('./models/Document');
const Version = require('./models/Version');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Sync database tables
sequelize.sync({ alter: true })
  .then(() => console.log('PostgreSQL connected and tables synced'))
  .catch(err => console.error('Database error:', err));

// Auth routes
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });
    const user = await User.create({ name, email, password });
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Socket.io
const docState = {};

io.on('connection', (socket) => {
  socket.on('join-doc', async ({ docId, userId }) => {
    socket.join(docId);
    socket.docId = docId;
    socket.userId = userId;

    let doc = await Document.findByPk(docId);
    if (!doc) doc = await Document.create({ id: docId, content: '', version: 0 });

    docState[docId] = docState[docId] || { content: doc.content, version: doc.version };

    socket.emit('load-doc', docState[docId]);
    socket.to(docId).emit('user-joined', { userId });
  });

  socket.on('send-changes', async ({ docId, delta, version, userId }) => {
    const state = docState[docId];
    if (!state) return;

    if (version < state.version) {
      socket.emit('conflict', {
        yourDelta: delta,
        serverContent: state.content,
        serverVersion: state.version
      });
      return;
    }

    state.content = delta;
    state.version++;

    await Document.update(
      { content: state.content, version: state.version, lastEditedBy: userId },
      { where: { id: docId } }
    );

    await Version.create({
      docId,
      version: state.version,
      content: state.content,
      editedBy: userId,
      delta
    });

    socket.to(docId).emit('receive-changes', {
      delta,
      version: state.version,
      userId
    });

    socket.emit('save-confirmed', { version: state.version });
  });

  socket.on('typing', ({ docId, userId }) => {
    socket.to(docId).emit('user-typing', { userId });
  });

  socket.on('disconnect', () => {
    if (socket.docId) {
      io.to(socket.docId).emit('user-left', { userId: socket.userId });
    }
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});