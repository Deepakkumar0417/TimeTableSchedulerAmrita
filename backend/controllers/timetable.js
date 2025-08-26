// backend/controllers/timetable.js
import Timetable from '../models/timetable.model.js';
import Semester from '../models/semester.model.js';
import mongoose from 'mongoose';

/* ==============================
   Canonical slots
   ============================== */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOTS = [
  { index: 0,  time: '8:10-9:00',   type: 'theory' },
  { index: 1,  time: '9:00-9:50',   type: 'theory' },
  { index: 2,  time: '9:50-10:40',  type: 'theory' },
  { index: 3,  time: '8:10-10:25',  type: 'lab'    }, // overlaps 0,1,2
  { index: 4,  time: 'Tea Break',   type: 'break'  },
  { index: 5,  time: '10:50-1:05',  type: 'lab'    }, // overlaps 6,7
  { index: 6,  time: '11:00-11:50', type: 'theory' },
  { index: 7,  time: '11:50-12:40', type: 'theory' },
  { index: 8,  time: 'Lunch Break', type: 'break'  },
  { index: 9,  time: '1:25-3:40',   type: 'lab'    }, // overlaps 10,11
  { index: 10, time: '2:00-2:50',   type: 'theory' },
  { index: 11, time: '2:50-3:40',   type: 'theory' },
];

// lab slot -> overlapping theory slots (same day)
const OVERLAP = { 3: [0, 1, 2], 5: [6, 7], 9: [10, 11] };
const THEORY_SLOTS = SLOTS.filter(s => s.type === 'theory').map(s => s.index);
// prefer lab slots that block fewer theory cells first
const LAB_SLOTS = [5, 9, 3];

/* ==============================
   Board (in-memory)
   - For scheduling we keep parallel sessions per section.
   - We convert to schema shape (string session) only at save time.
   ============================== */
const initBoard = () => {
  const days = {};
  for (const d of DAYS) {
    days[d] = SLOTS.map(s => ({
      index: s.index,
      time: s.time,
      type: s.type,
      // in-memory fields:
      break: s.type === 'break',
      sessionsBySection: s.type === 'break' ? null : {}, // { 'A': {kind, courseId, ...}, ... }
    }));
  }
  return days;
};

/* ==============================
   Per-day workload constraints per teacher
   allow: 3T OR 2L OR (2T + 1L)
   ============================== */
function canAdd(load, type) {
  const t = load.theory || 0;
  const l = load.lab || 0;

  if (type === 'theory') {
    if (t + 1 <= 3 && l === 0) return true; // up to 3T
    if (t + 1 <= 2 && l <= 1) return true;  // 2T + 1L
    return false;
  } else {
    if (l + 1 <= 2 && t === 0) return true; // up to 2L
    if (l + 1 <= 1 && t <= 2) return true;  // 2T + 1L (adds the 1L)
    return false;
  }
}

/* ==============================
   Placement helpers
   ============================== */
function placeLab(board, teacherBusy, teacherLoad, teacherId, payload) {
  for (const day of DAYS) {
    const load = teacherLoad[teacherId][day];
    if (!canAdd(load, 'lab')) continue;

    for (const s of LAB_SLOTS) {
      const cell = board[day][s];
      if (cell.break) continue;

      const sec = payload.section;
      const overlaps = OVERLAP[s] || [];
      const busySet = teacherBusy[teacherId][day];

      // teacher must be free for slot + overlaps
      const teacherFree = !busySet.has(s) && overlaps.every(t => !busySet.has(t));
      // section must be free for slot + overlaps
      const sectionFree =
        !cell.sessionsBySection[sec] &&
        overlaps.every(t => !board[day][t].sessionsBySection[sec]);

      if (teacherFree && sectionFree) {
        cell.sessionsBySection[sec] = {
          kind: 'lab',
          courseId: payload.courseId,
          courseName: payload.courseName,
          section: sec,
          teacher: payload.teacher
        };
        // mark overlaps occupied for same section
        for (const t of overlaps) {
          board[day][t].sessionsBySection[sec] = { kind: 'occupied' };
        }
        // mark teacher busy
        busySet.add(s);
        for (const t of overlaps) busySet.add(t);

        load.lab = (load.lab || 0) + 1;
        return true;
      }
    }
  }
  return false;
}

function placeTheory(board, teacherBusy, teacherLoad, teacherId, payload) {
  for (const day of DAYS) {
    const load = teacherLoad[teacherId][day];
    if (!canAdd(load, 'theory')) continue;

    for (const s of THEORY_SLOTS) {
      const cell = board[day][s];
      if (cell.break) continue;

      const sec = payload.section;
      const busySet = teacherBusy[teacherId][day];

      const teacherFree = !busySet.has(s);
      const sectionFree = !cell.sessionsBySection[sec];

      if (teacherFree && sectionFree) {
        cell.sessionsBySection[sec] = {
          kind: 'theory',
          courseId: payload.courseId,
          courseName: payload.courseName,
          section: sec,
          teacher: payload.teacher
        };
        busySet.add(s);
        load.theory = (load.theory || 0) + 1;
        return true;
      }
    }
  }
  return false;
}

/* ==============================
   Generate timetable
   ============================== */
export const generateTimetable = async (req, res) => {
  try {
    const { semesterId } = req.body;
    if (!semesterId || !mongoose.Types.ObjectId.isValid(semesterId)) {
      return res.status(400).json({ error: 'Valid semesterId is required.' });
    }

    const exists = await Timetable.findOne({ semester: semesterId });
    if (exists) {
      return res.status(400).json({ error: 'Timetable already generated for this semester.' });
    }

    const sem = await Semester.findById(semesterId).lean();
    if (!sem) return res.status(404).json({ error: 'Semester not found.' });

    // ---- Preflight: every course-section must be assigned
    const sections = Array.isArray(sem.sections) ? sem.sections : [];
    if (sections.length) {
      const missing = [];
      for (const c of (sem.courses || [])) {
        for (const sec of sections) {
          const covered = (c.assignees || []).some(a => (a.sections || []).includes(sec));
          if (!covered) missing.push(`${c.courseId} (${sec})`);
        }
      }
      if (missing.length) {
        return res.status(400).json({
          error: 'Cannot generate: unassigned course-section slots',
          missing
        });
      }
    }

    // ---- Build board + teacher tracking
    const board = initBoard();

    const teacherLoad = {}; // { teacherId: { Monday:{theory,lab}, ... } }
    const teacherBusy = {}; // { teacherId: { Monday:Set(slotIdx), ... } }

    const ensureTeacher = (tid) => {
      if (!teacherLoad[tid]) {
        teacherLoad[tid] = {};
        for (const d of DAYS) teacherLoad[tid][d] = { theory: 0, lab: 0 };
      }
      if (!teacherBusy[tid]) {
        teacherBusy[tid] = {};
        for (const d of DAYS) teacherBusy[tid][d] = new Set();
      }
    };

    // ---- Build scheduling items from assignees per course/section
    const items = []; // labs first (priority 1), then theory (priority 2)
    for (const c of (sem.courses || [])) {
      const courseId = c.courseId;
      const courseName = c.courseName;
      const theorySessions = Number(c.theoryHours || 0) + Number(c.tutorialHours || 0);
      const labSessions    = Math.floor(Number(c.labHours || 0) / 3);

      for (const a of (c.assignees || [])) {
        if (!a || !a.teacher) {
          return res.status(400).json({ error: `Assignee without teacher for ${courseId}` });
        }
        const teacher = String(a.teacher);
        for (const section of (a.sections || [])) {
          for (let i = 0; i < labSessions; i++) {
            items.push({ priority: 1, kind: 'lab', courseId, courseName, section, teacher });
          }
          for (let i = 0; i < theorySessions; i++) {
            items.push({ priority: 2, kind: 'theory', courseId, courseName, section, teacher });
          }
        }
      }
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'No items to schedule. Check assignees and course hours.' });
    }

    // ---- Sort to schedule most-constrained teachers first
    const teacherNeed = {};
    for (const it of items) {
      const th = it.kind === 'theory' ? 1 : 0;
      const lb = it.kind === 'lab' ? 1 : 0;
      teacherNeed[it.teacher] = teacherNeed[it.teacher] || { t: 0, l: 0 };
      teacherNeed[it.teacher].t += th;
      teacherNeed[it.teacher].l += lb;
    }
    items.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority; // labs first
      const sa = (teacherNeed[a.teacher].l * 2) + teacherNeed[a.teacher].t;
      const sb = (teacherNeed[b.teacher].l * 2) + teacherNeed[b.teacher].t;
      return sb - sa;
    });

    // ---- Place items
    for (const it of items) {
      ensureTeacher(it.teacher);
      const ok = it.kind === 'lab'
        ? placeLab(board, teacherBusy, teacherLoad, it.teacher, it)
        : placeTheory(board, teacherBusy, teacherLoad, it.teacher, it);
      if (!ok) {
        return res.status(400).json({
          error: `Could not place ${it.kind} for ${it.courseId} (${it.section}). Try a different teacher/section distribution.`,
          teacher: it.teacher,
          perDayLoad: teacherLoad[it.teacher]
        });
      }
    }

    // ---- Convert in-memory board -> schema shape (string session)
    const persistDays = {};
    for (const d of DAYS) {
      persistDays[d] = board[d].map(slot => {
        // base shape
        const out = {
          index: slot.index,
          time: slot.time,
          type: slot.type,
          session: 'FREE'
        };

        if (slot.type === 'break') {
          out.session = slot.time; // "Tea Break" / "Lunch Break"
          return out;
        }

        const bySection = {};
        for (const [sec, sess] of Object.entries(slot.sessionsBySection || {})) {
          if (!sess || (sess.kind !== 'theory' && sess.kind !== 'lab')) continue;
          bySection[sec] = {
            kind: sess.kind,
            courseId: sess.courseId,
            courseName: sess.courseName,
            teacher: String(sess.teacher)
          };
        }
        if (Object.keys(bySection).length) {
          // store as JSON string to fit schema (session: String)
          out.session = JSON.stringify({ bySection });
        } else {
          out.session = 'FREE';
        }
        return out;
      });
    }

    // ---- Save
    try {
      const saved = await Timetable.create({ semester: semesterId, days: persistDays });
      return res.status(201).json({ message: 'Timetable generated', timetable: saved });
    } catch (e) {
      console.error('[Timetable save error]', e);
      return res.status(400).json({ error: 'Failed to save timetable', details: e.message || String(e) });
    }
  } catch (e) {
    console.error('Generate error:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e.message || String(e) });
  }
};

/* ==============================
   Teacher's personal timetable (filtered)
   - Reads saved slots (session is String), parses JSON strings,
     and returns only this teacher's session as an object.
   ============================== */
export const getMyTimetable = async (req, res) => {
  try {
    const { semesterId } = req.params;
    if (!semesterId || !mongoose.Types.ObjectId.isValid(semesterId)) {
      return res.status(400).json({ error: 'Valid semesterId required' });
    }

    const tt = await Timetable.findOne({ semester: semesterId }).lean();
    if (!tt) return res.status(404).json({ error: 'Timetable not generated yet' });

    const mine = {};
    const myId = String(req.user.id);

    for (const d of DAYS) {
      const dayArr = tt.days?.[d] || [];
      mine[d] = dayArr.map(slot => {
        // Breaks: convert to object session for UI
        if (slot.type === 'break') {
          return { ...slot, session: { kind: 'break', label: slot.session } };
        }

        // Parse JSON session if present
        let mySession = null;
        if (typeof slot.session === 'string' && slot.session.startsWith('{')) {
          try {
            const parsed = JSON.parse(slot.session);
            const bySection = parsed?.bySection || {};
            for (const [sec, s] of Object.entries(bySection)) {
              if (s && (s.kind === 'theory' || s.kind === 'lab') && String(s.teacher) === myId) {
                mySession = { ...s, section: sec };
                break;
              }
            }
          } catch (_) {
            // ignore parse errors, treat as FREE
          }
        }
        return { ...slot, session: mySession };
      });
    }

    return res.json({ success: true, days: mine });
  } catch (e) {
    console.error('getMyTimetable error', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/* ==============================
   Public: get timetable by stream + semester number
   (unchanged; returns the stored strings)
   ============================== */
export const getTimetableByDepartmentAndSemester = async (req, res) => {
  try {
    const { stream, semesterNum } = req.body;
    if (!stream || !semesterNum) {
      return res.status(400).json({ error: 'stream and semesterNum are required.' });
    }

    const num = parseInt(semesterNum, 10);
    if (Number.isNaN(num) || num < 1) {
      return res.status(400).json({ error: 'Invalid semesterNum.' });
    }

    const semester = await Semester.findOne({ stream, semesterNum: num });
    if (!semester) return res.status(404).json({ error: 'Semester not found.' });

    const timetable = await Timetable.findOne({ semester: semester._id });
    if (!timetable) return res.status(404).json({ error: 'Timetable not found for the selected semester.' });

    return res.status(200).json({ timetable });
  } catch (e) {
    console.error('getTimetableByDepartmentAndSemester error:', e.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
