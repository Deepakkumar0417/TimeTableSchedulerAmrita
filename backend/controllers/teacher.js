import bcrypt from 'bcryptjs';
import Teacher from '../models/teacher.model.js';
import Semester from '../models/semester.model.js';
import generateToken from '../utils/tokens.js';
import mongoose from 'mongoose';

// ---------- NEW: Who am I (profile + enrollments) ----------
export const me = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id).select('-password');
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    // Aggregate assignments across semesters
    const semesters = await Semester.find({
      $or: [
        { 'courses.teachers': req.user.id },
        { 'courses.assignees.teacher': req.user.id }
      ]
    }).lean();

    const enrollments = [];
    for (const s of semesters) {
      for (const c of s.courses || []) {
        const byId = (c.assignees || []).find(a => String(a.teacher) === String(req.user.id));
        if (byId || (c.teachers || []).some(t => String(t) === String(req.user.id))) {
          enrollments.push({
            semesterId: s._id,
            semesterNum: s.semesterNum,
            year: s.year,
            stream: s.stream,
            sections: byId?.sections || [],
            courseId: c.courseId,
            courseName: c.courseName,
          });
        }
      }
    }

    const activeSemesterIds = Array.from(new Set(enrollments.map(e => String(e.semesterId))));

    return res.json({
      success: true,
      data: {
        teacher,
        stats: {
          semestersCount: activeSemesterIds.length,
          assignmentsCount: enrollments.length
        },
        enrollments
      }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ---------- REPLACE: Enroll with section selections + constraints ----------

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email });
    const isPasswordCorrect = await bcrypt.compare(password, teacher?.password || '');

    if (!teacher || !isPasswordCorrect) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(teacher._id, res);

    return res.status(201).json({
      _id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      token
    });
  } catch (error) {
    console.log('Error in login', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const logout = (_req, res) => {
  try {
    // must match the cookie name set in utils/tokens.js
    res.clearCookie('jwt', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.log('Error in logout controller', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const signup = async (req, res) => {
  try {
    const { email, password, confirmPassword, name, phonenumber, department } = req.body;

    if (!email || !password || !confirmPassword || !name || !department) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const existing = await Teacher.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Teacher with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const teacher = await Teacher.create({
      email,
      password: hashedPassword,
      name,
      phonenumber,
      department, // storing department code (e.g., "CSE")
    });

    return res.status(201).json({
      message: 'Account created. Please login.',
      teacher: { _id: teacher._id, name: teacher.name, email: teacher.email, department: teacher.department }
    });
  } catch (err) {
    console.error('Error in signup:', err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getAvailableSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find();

    if (!semesters || semesters.length === 0) {
      return res.status(404).json({ error: 'No available semesters found' });
    }

    // Group by stream (CSE/ECE/AIE or custom dept codes)
    const groupedSemesters = semesters.reduce((acc, semester) => {
      const key = semester.stream || 'UNKNOWN';
      if (!acc[key]) acc[key] = [];
      acc[key].push(semester);
      return acc;
    }, {});

    return res.status(200).json({ success: true, data: groupedSemesters });
  } catch (error) {
    console.log('Error fetching available semesters', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const enrollSemester = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { semesterId, selections } = req.body; // [{ courseId:<embedded>, sections:[...] }]

    if (!semesterId || !Array.isArray(selections)) {
      return res.status(400).json({ error: 'semesterId and selections[] are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(semesterId)) {
      return res.status(400).json({ error: 'Invalid semesterId' });
    }

    const sem = await Semester.findById(semesterId);
    if (!sem) return res.status(404).json({ error: 'Semester not found' });

    // A) Max 2 semesters rule (unless already in this one)
    const involved = await Semester.countDocuments({
      $or: [
        { 'courses.teachers': teacherId },
        { 'courses.assignees.teacher': teacherId }
      ]
    });
    const inThis = await Semester.countDocuments({
      _id: semesterId,
      $or: [
        { 'courses.teachers': teacherId },
        { 'courses.assignees.teacher': teacherId }
      ]
    });
    if (involved >= 2 && !inThis) {
      return res.status(400).json({ error: 'Limit reached: A teacher can only teach in 2 semesters.' });
    }

    const validSections = new Set(sem.sections || ['A','B','C']);

    // B) Validate all selections first (section-level exclusivity + ≤3)
    for (const sel of selections) {
      const course = sem.courses.id(sel.courseId);
      if (!course) return res.status(400).json({ error:`Course not found: ${sel.courseId}` });

      const chosen = Array.from(new Set((sel.sections || []).map(s => String(s).toUpperCase().trim())))
        .filter(s => validSections.has(s));

      // if clearing (empty array) it's allowed — handled below
      if (chosen.length > 3) return res.status(400).json({ error:`Max 3 sections per course` });

      // find sections already taken by other teachers for this course
      const takenByOthers = new Set();
      for (const a of (course.assignees || [])) {
        if (String(a.teacher) === String(teacherId)) continue;
        for (const s of (a.sections || [])) takenByOthers.add(s);
      }

      // check overlap
      const conflicts = chosen.filter(s => takenByOthers.has(s));
      if (conflicts.length) {
        return res.status(400).json({ error: `${course.courseId}: sections already assigned`, sections: conflicts });
      }
    }

    // C) Apply changes
    for (const sel of selections) {
      const course = sem.courses.id(sel.courseId);
      const chosen = Array.from(new Set((sel.sections || []).map(s => String(s).toUpperCase().trim())))
        .filter(s => validSections.has(s));

      // clearing: remove my assignment
      if (chosen.length === 0) {
        course.assignees = (course.assignees || []).filter(a => String(a.teacher) !== String(teacherId));
        course.teachers  = (course.teachers  || []).filter(t => String(t) !== String(teacherId));
        continue;
      }

      // upsert my assignee
      if (!course.assignees) course.assignees = [];
      const mine = course.assignees.find(a => String(a.teacher) === String(teacherId));
      if (mine) {
        mine.sections = chosen.slice(0, 3);
      } else {
        course.assignees.push({ teacher: teacherId, sections: chosen.slice(0, 3) });
      }

      // keep legacy teachers[] unique & in sync
      if (!(course.teachers || []).some(t => String(t) === String(teacherId))) {
        (course.teachers ||= []).push(teacherId);
      }
    }

    await sem.save();
    return res.json({ message:'Enrollment updated successfully.' });
  } catch (e) {
    console.error('enroll error', e);
    return res.status(500).json({ error:'Internal Server Error' });
  }
};


