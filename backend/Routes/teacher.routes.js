import express from 'express';
import { signup, login, logout, me, getAvailableSemesters, enrollSemester } from '../controllers/teacher.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

// NEW
router.get('/me', authMiddleware, me);

// existing
router.get('/available', getAvailableSemesters);
router.post('/enroll', authMiddleware, enrollSemester);

export default router;
