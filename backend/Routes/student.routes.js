import express from 'express';
import {
  fetchSemestersWithEnrolledCourses,
  getTimetableForStudent,
  getCombinedTimetable,
} from '../controllers/student.js';
import { create, view } from '../controllers/create_view.js';
import { generateTimetable } from '../controllers/timetable.js';

const router = express.Router();

/**
 * Student: list semesters (only ones with a generated timetable) for a stream
 * Body: { stream }
 */
router.post('/fetch-semesters', fetchSemestersWithEnrolledCourses);

/**
 * Student: get SECTION-SPECIFIC timetable
 * Body: { stream, semesterNum, section }
 */
router.post('/timetable', getTimetableForStudent);

/**
 * (Optional) Student/Admin: get COMBINED timetable (per-slot bySection map)
 * Body: { stream, semesterNum }
 */
router.post('/timetable/combined', getCombinedTimetable);

/**
 * You likely don't want students to generate, but keeping as you had it:
 */
router.post('/generate', generateTimetable);

/**
 * Legacy create/view (if still used elsewhere)
 */
router.post('/create', create);
router.get('/view', view);

export default router;
