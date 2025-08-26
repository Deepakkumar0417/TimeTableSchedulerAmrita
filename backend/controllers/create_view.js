// backend/controllers/create_view.js
import Semester from "../models/semester.model.js";

const handleError = (res, status, message, details = null) => {
  res.status(status).json({
    success: false,
    message,
    ...(details && { errorDetails: details }),
  });
};

export const create = async (req, res) => {
  const { semesterNum, year, courses, stream, sections } = req.body;

  if (!semesterNum || !year || !stream) {
    return handleError(res, 400, 'Missing required semester details: semesterNum, year, and stream');
  }

  if (courses && courses.length > 0) {
    for (let course of courses) {
      if (!course.courseId || !course.courseName) {
        return handleError(res, 400, 'Course ID and name are required');
      }
    }
  }

  try {
    const newSemester = new Semester({
      semesterNum: Number(semesterNum),
      year: Number(year),
      stream,
      sections: Array.isArray(sections) && sections.length ? sections : ['A','B','C'],
      courses: (courses || []).map(c => ({
        courseId: c.courseId,
        courseName: c.courseName,
        theoryHours: Number(c.theoryHours || 0),
        labHours: Number(c.labHours || 0),
      })),
    });

    await newSemester.save();

    return res.json({ success: true, message: 'Semester created successfully' });
  } catch (error) {
    console.error('Error creating semester:', error);
    return handleError(res, 500, 'Server error while creating semester', error.message);
  }
};

export const view = async (req, res) => {
  try {
    const semesters = await Semester.find({}).lean();
    if (!semesters.length) return handleError(res, 404, 'No semesters found');
    return res.json({ success: true, data: semesters });
  } catch (error) {
    console.error('Error retrieving semesters:', error);
    return handleError(res, 500, 'Server error while retrieving semesters', error.message);
  }
};

// NEW: get single semester by id (for edit prefill)
export const getSemesterById = async (req, res) => {
  try {
    const s = await Semester.findById(req.params.id).lean();
    if (!s) return handleError(res, 404, 'Semester not found');
    return res.json({ success: true, data: s });
  } catch (e) {
    return handleError(res, 500, 'Server error while retrieving semester', e.message);
  }
};

// NEW: update semester, preserving enrollments on existing courses
export const updateSemester = async (req, res) => {
  try {
    const { semesterNum, year, stream, sections, courses } = req.body;
    const s = await Semester.findById(req.params.id);
    if (!s) return handleError(res, 404, 'Semester not found');

    if (semesterNum !== undefined) s.semesterNum = Number(semesterNum);
    if (year !== undefined)        s.year = Number(year);
    if (stream)                    s.stream = stream;
    if (Array.isArray(sections))   s.sections = sections;

    // Merge courses: preserve assignees/teachers when _id matches
    const incoming = Array.isArray(courses) ? courses : [];
    const nextCourses = [];

    const byId = new Map((s.courses || []).map(c => [String(c._id), c]));

    for (const c of incoming) {
      const hasId = c._id && byId.has(String(c._id));
      if (hasId) {
        const old = byId.get(String(c._id));
        // update fields, keep enrollments
        old.courseId    = c.courseId;
        old.courseName  = c.courseName;
        old.theoryHours = Number(c.theoryHours || 0);
        old.labHours    = Number(c.labHours || 0);
        nextCourses.push(old);
      } else {
        // new course
        nextCourses.push({
          courseId: c.courseId,
          courseName: c.courseName,
          theoryHours: Number(c.theoryHours || 0),
          labHours: Number(c.labHours || 0),
          teachers: [],
          assignees: []
        });
      }
    }

    // If you want to allow deletions, simply assign nextCourses.
    // (Removing a course will drop its enrollments for that course.)
    s.courses = nextCourses;

    await s.save();
    return res.json({ success: true, message: 'Semester updated successfully' });
  } catch (e) {
    console.error('updateSemester error:', e);
    return handleError(res, 500, 'Server error while updating semester', e.message);
  }
};

// OPTIONAL: delete semester
export const deleteSemester = async (req, res) => {
  try {
    const s = await Semester.findById(req.params.id);
    if (!s) return handleError(res, 404, 'Semester not found');
    await s.deleteOne();
    return res.json({ success: true, message: 'Semester deleted' });
  } catch (e) {
    return handleError(res, 500, 'Server error while deleting semester', e.message);
  }
};
