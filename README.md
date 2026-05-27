
# 📝 CollabDocs

A real-time collaborative document editor built with React, Node.js, and PostgreSQL. Multiple users can edit documents simultaneously, see live presence indicators, and share documents via email invites.

# 🚀 Features

- Real-time collaboration — multiple users editing the same document simultaneously via Socket.IO
- JWT authentication — secure login and signup with token expiry handling
- Document management — create, rename, and delete documents
- Role-based sharing — share documents via email with view or edit permissions
- Version history — view and restore previous versions of any document
- Live presence — see who's currently in the document and typing indicators
- Mobile responsive — works on all screen sizes
- Rate limiting — brute-force protection on auth routes
- Input validation — server-side validation on all routes
- Integration tests — 7 passing tests covering auth flows

# 🛠 Tech Stack

Frontend
 - React 18
 - Vite
 - React Router v6
 - Socket.IO client

Backend
 - Node.js + Express
 - Socket.IO
 - PostgreSQL
 - Sequelize ORM
 - JWT (jsonwebtoken)
 - Bcryptjs
 - Resend (email)
 - Express Rate Limit
 - Express Validator


