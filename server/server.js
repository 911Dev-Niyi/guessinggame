import express from 'express';
import http from 'http';
import mongoose  from 'mongoose';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import gameSessionRoutes from './routes/gameSessionRoutes.js';

import { setupGameSessionSocket } from './sockets/gameSessionSocket.js';
dotenv.config()
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*'} });

setupGameSessionSocket(io);

app.use(cors({
  origin: "https://guessinggame-pi.vercel.app/",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());
app.use('/api/session', gameSessionRoutes);

app.set('socketio', io);

const PORT = process.env.PORT || 5000
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true})
      .then(() => {
        server.listen(PORT, () => {
          console.log(`Server running on PORT ${PORT}`);
        });
      })
      .catch(err => console.error('MongoDB connection erorr', err));
