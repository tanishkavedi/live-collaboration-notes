require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Document = require('./models/Document');
const Version = require('./models/Version');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

const docState = {};

io.on('connection', (socket) => {

  socket.on('join-doc', async ({ docId, userId }) => {
    socket.join(docId);
    socket.docId = docId;
    socket.userId = userId;

    let doc = await Document.findById(docId);
    if (!doc) doc = await Document.create({ _id: docId, content: '', version: 0 });

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

    await Document.findByIdAndUpdate(docId, {
      content: state.content,
      version: state.version,
      lastEditedBy: userId
    });

    await Version.create({
      docId,
      version: state.version,
      content: state.content,
      editedBy: userId,
      delta: delta
    });

    // broadcast once only
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