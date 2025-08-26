// server.js
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import teacherRoute from './routes/teacher.routes.js';
import db from './DB/database.js';
import adminRoute from './routes/admin.routes.js';
import timetableRoutes from './Routes/timetable.routes.js';
import createViewRoutes from './routes/create_view.routes.js';
import studentRoutes from './routes/student.routes.js';



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const corsOptions = {
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api/teacher', teacherRoute);
app.use('/api/admin', adminRoute);
app.use('/api/create-view', createViewRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/student', studentRoutes);


app.use((req, res) => {
  res.status(404).json({ success:false, message:`Route ${req.method} ${req.originalUrl} not found` });
});

const start = async () => {
  try {
    await db();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`CORS origin: ${CLIENT_URL}`);
    });
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
};

start();
