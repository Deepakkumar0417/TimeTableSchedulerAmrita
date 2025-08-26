// backend/routes/create_view.routes.js

import express from 'express';
import { create, view } from '../controllers/create_view.js';

const router = express.Router();

// Route to create a new semester - accessible without authentication
router.post('/create', create);

// Route to view semesters, optionally filtered by stream - accessible by all
router.get('/', view);

export default router;
