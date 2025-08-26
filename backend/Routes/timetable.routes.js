import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { generateTimetable, getTimetableByDepartmentAndSemester, getMyTimetable } from '../controllers/timetable.js';
import Timetable from '../models/timetable.model.js';

const router = express.Router();

router.post('/generate', generateTimetable);
router.post('/by-stream', getTimetableByDepartmentAndSemester);
router.get('/my/:semesterId', authMiddleware, getMyTimetable);

// quick reset endpoint (admin could be protected later)
router.delete('/:semesterId', async (req, res) => {
  try {
    await Timetable.deleteOne({ semester: req.params.semesterId });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete timetable' });
  }
});

export default router;
