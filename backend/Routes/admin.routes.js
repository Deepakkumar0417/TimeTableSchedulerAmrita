// backend/routes/admin.routes.js
import express from 'express';
import { listQueries, setQueryStatus, replyQuery } from '../controllers/queries.js';
import {
  login,
  createDepartment, listDepartments,
  createDegree, listDegrees,
  createCohort, listCohorts,
  createSemesterV2, listSemestersV2, getSemesterById, updateSemester, deleteSemester,
} from '../controllers/admin.js';

const router = express.Router();

/* Auth */
router.post('/', login);        // backward compatibility
router.post('/login', login);   // preferred

/* Departments */
router.get('/departments', listDepartments);
router.post('/departments', createDepartment);

/* Degrees */
router.get('/degrees', listDegrees);
router.post('/degrees', createDegree);

/* Cohorts (Degree × Dept × Intake) */
router.get('/cohorts', listCohorts);
router.post('/cohorts', createCohort);

/* Semesters (v2) */
router.get('/semesters', listSemestersV2);     // list all (optionally filter via query)
router.post('/semesters', createSemesterV2);
router.get('/semesters/:id', getSemesterById);
router.patch('/semesters/:id', updateSemester);
router.delete('/semesters/:id', deleteSemester);

/* Legacy alias used by older frontend screens */
router.get('/view', listSemestersV2);          // instead of undefined viewLegacy

/* Queries (admin Q&A) */
router.get('/queries', listQueries);
router.patch('/queries/:id', setQueryStatus);
router.post('/queries/:id/reply', replyQuery);

export default router;
