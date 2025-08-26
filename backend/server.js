// server.js
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import teacherRoute from './Routes/teacher.routes.js';
import db from './DB/database.js';
import adminRoute from './Routes/admin.routes.js';
import timetableRoutes from './Routes/timetable.routes.js';
import createViewRoutes from './Routes/create_view.routes.js';
import studentRoutes from './Routes/student.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed origins
const allowedOrigins = [
  process.env.CLIENT_URL,        // your Netlify frontend
  'http://localhost:5173',       // local dev
];

// Configure CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors()); // preflight

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Routes
app.use('/api/teacher', teacherRoute);
app.use('/api/admin', adminRoute);
app.use('/api/create-view', createViewRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/student', studentRoutes);

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Start server
const start = async () => {
  try {
    await db();
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Allowed Origins: ${allowedOrigins.join(', ')}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }
};

start();
