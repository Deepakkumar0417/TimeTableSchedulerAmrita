// backend/controllers/admin.js
import Department from '../models/department.model.js';
import Degree from '../models/degree.model.js';
import Cohort from '../models/cohort.model.js';
import Semester from '../models/semester.model.js';

/* ---------- Auth (simple default admin) ---------- */
export const login = (req, res) => {
  try {
    const { email, password } = req.body;

    const defaultEmail = process.env.ADMIN_EMAIL || 'admin@blr.amrita.edu';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'adminpassword';

    if (email !== defaultEmail || password !== defaultPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      admin: { email: defaultEmail }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/* ---------- Departments ---------- */
export const createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code are required' });

    const exists = await Department.findOne({ code: new RegExp(`^${code}$`, 'i') });
    if (exists) return res.status(400).json({ success: false, message: 'Department code already exists' });

    const dep = await Department.create({ name, code, isActive: true });
    return res.status(201).json({ success: true, message: 'Department created', data: dep });
  } catch (e) {
    console.error('createDepartment:', e);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const listDepartments = async (_req, res) => {
  try {
    const rows = await Department.find({}).sort({ code: 1 });
    return res.status(200).json({ success: true, data: rows });
  } catch (e) {
    console.error('listDepartments:', e);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/* ---------- Degrees ---------- */
export const createDegree = async (req, res) => {
  try {
    const { name, level, durationYears } = req.body;
    if (!name || !durationYears) return res.status(400).json({ success: false, message: 'Name and durationYears are required' });

    const totalSemesters = Number(durationYears) * 2;
    const deg = await Degree.create({ name, level: level || '', durationYears: Number(durationYears), totalSemesters });
    return res.status(201).json({ success: true, message: 'Degree created', data: deg });
  } catch (e) {
    console.error('createDegree:', e);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const listDegrees = async (_req, res) => {
  try {
    const rows = await Degree.find({}).sort({ name: 1 });
    return res.status(200).json({ success: true, data: rows });
  } catch (e) {
    console.error('listDegrees:', e);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/* ---------- Cohorts (Degree × Dept × Intake) ---------- */
export const createCohort = async (req, res) => {
  try {
    const { degreeId, departmentId, intakeYear } = req.body;
    if (!degreeId || !departmentId || !intakeYear) {
      return res.status(400).json({ success: false, message: 'degreeId, departmentId, intakeYear are required' });
    }

    const degree = await Degree.findById(degreeId);
    if (!degree) return res.status(404).json({ success: false, message: 'Degree not found' });

    const existing = await Cohort.findOne({ degreeId, departmentId, intakeYear: Number(intakeYear) });
    if (existing) return res.status(200).json({ success: true, message: 'Cohort already exists', data: existing });

    const cohort = await Cohort.create({
      degreeId,
      departmentId,
      intakeYear: Number(intakeYear),
      durationYears: degree.durationYears,
      totalSemesters: degree.totalSemesters
    });

    return res.status(201).json({ success: true, message: 'Cohort created', data: cohort });
  } catch (e) {
    console.error('createCohort:', e);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const listCohorts = async (_req, res) => {
  try {
    const rows = await Cohort.find({})
      .populate('degreeId', 'name totalSemesters')
      .populate('departmentId', 'name code')
      .sort({ intakeYear: -1 });
    // normalize shape for frontend
    const data = rows.map(r => ({
      _id: r._id,
      intakeYear: r.intakeYear,
      totalSemesters: r.totalSemesters,
      degree: r.degreeId ? { _id: r.degreeId._id, name: r.degreeId.name, totalSemesters: r.degreeId.totalSemesters } : null,
      department: r.departmentId ? { _id: r.departmentId._id, name: r.departmentId.name, code: r.departmentId.code } : null
    }));
    return res.status(200).json({ success: true, data });
  } catch (e) {
    console.error('listCohorts:', e);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

/* ---------- Semesters (new create/list used by frontend) ---------- */
const normalizeCourse = (c) => {
  const L = Number(c.theoryHours || 0);
  const T = Number(c.tutorialHours || 0);
  const P = Number(c.labHours || 0);
  if (P % 3 !== 0) throw new Error(`Lab hours for ${c.courseId || c.courseName || 'course'} must be a multiple of 3`);
  const credits = L + T + (P / 3);
  return {
    courseId: c.courseId,
    courseName: c.courseName,
    theoryHours: L,
    tutorialHours: T,
    labHours: P,
    credits,
    theoryPeriodsPerWeek: L + T,
    labBlocksPerWeek: P / 3,
    teachers: [] // keep compatibility; filled later during enrollments
  };
};

export const createSemesterV2 = async (req, res) => {
  try {
    const { cohortId, departmentId, semesterNum, sections, courses } = req.body;
    if (!cohortId || !departmentId || !semesterNum) {
      return res.status(400).json({ success: false, message: 'cohortId, departmentId, semesterNum are required' });
    }

    const cohort = await Cohort.findById(cohortId).populate('degreeId', 'totalSemesters');
    if (!cohort) return res.status(404).json({ success: false, message: 'Cohort not found' });

    const semNum = Number(semesterNum);
    if (semNum < 1 || semNum > cohort.totalSemesters) {
      return res.status(400).json({ success: false, message: 'semesterNum out of range for degree duration' });
    }
    const isOdd = semNum % 2 === 1;

    // department code -> keep legacy "stream" string for existing flows
    const dept = await Department.findById(departmentId);
    const stream = dept?.code || '';

    const sectionCount = Math.max(1, Number(sections || 1));
    const sectionLabels = Array.from({ length: sectionCount }, (_, i) => String.fromCharCode(65 + i)); // A,B,C,...

    const normalizedCourses = (courses || []).map(normalizeCourse);

    const doc = await Semester.create({
      cohortId,
      departmentId,
      stream,            // legacy compatibility
      semesterNum: semNum,
      isOdd,
      year: new Date().getFullYear(),
      sections: sectionLabels,
      courses: normalizedCourses
    });

    return res.status(201).json({ success: true, message: 'Semester created', data: doc });
  } catch (e) {
    console.error('createSemesterV2:', e);
    const msg = e?.message?.includes('multiple of 3') ? e.message : 'Internal Server Error';
    return res.status(500).json({ success: false, message: msg });
  }
};

export const listSemestersV2 = async (req, res) => {
  try {
    const { cohortId } = req.query;
    const q = cohortId ? { cohortId } : {};
    const rows = await Semester.find(q).sort({ semesterNum: 1 });
    return res.status(200).json({ success: true, data: rows });
  } catch (e) {
    console.error('listSemestersV2:', e);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// helper reused from earlier
const normCourse = (c) => {
  const L = Number(c.theoryHours || 0);
  const T = Number(c.tutorialHours || 0);
  const P = Number(c.labHours || 0);
  if (P % 3 !== 0) throw new Error(`Lab hours for ${c.courseId || c.courseName} must be a multiple of 3`);
  return {
    courseId: c.courseId,
    courseName: c.courseName,
    theoryHours: L,
    tutorialHours: T,
    labHours: P,
    credits: L + T + P / 3,
    theoryPeriodsPerWeek: L + T,
    labBlocksPerWeek: P / 3,
    teachers: c.teachers || []
  };
};

// GET /api/admin/semesters/:id
export const getSemesterById = async (req, res) => {
  try {
    const doc = await Semester.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Semester not found' });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// PATCH /api/admin/semesters/:id
export const updateSemester = async (req, res) => {
  try {
    const { semesterNum, year, stream, sections, courses } = req.body;
    const update = {};
    if (semesterNum !== undefined) update.semesterNum = Number(semesterNum);
    if (year !== undefined) update.year = Number(year);
    if (stream !== undefined) update.stream = stream;
    if (Array.isArray(sections) && sections.length) update.sections = sections;
    if (Array.isArray(courses)) update.courses = courses.map(normCourse);

    const doc = await Semester.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Semester not found' });
    return res.status(200).json({ success: true, message: 'Semester updated', data: doc });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message || 'Update failed' });
  }
};

// DELETE /api/admin/semesters/:id
export const deleteSemester = async (req, res) => {
  try {
    const doc = await Semester.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Semester not found' });
    return res.status(200).json({ success: true, message: 'Semester deleted' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
