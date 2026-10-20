require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const app = require('./app');
const configureChat = require('./sockets/chat');
const PORT = process.env.PORT || 3000;
if (!process.env.JWT_SECRET) { console.error('Missing JWT_SECRET. Copy .env.example to .env and configure it.'); process.exit(1); }
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e6 });
configureChat(io);
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connectsphere')
  .then(() => server.listen(PORT, () => console.log(`ConnectSphere running at http://localhost:${PORT}`)))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
