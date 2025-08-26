import Semester from '../models/semester.model.js';
import Timetable from '../models/timetable.model.js';

/**
 * POST /api/student/fetch-semesters
 * Body: { stream: String }
 * Returns semesters for the stream that ALREADY have a generated timetable,
 * plus their available sections.
 */
export const fetchSemestersWithEnrolledCourses = async (req, res) => {
  try {
    const { stream } = req.body;

    if (!stream || typeof stream !== 'string') {
      return res.status(400).json({ success: false, error: 'Stream is required.' });
    }

    // Find all semesters for this stream
    const semesters = await Semester.find({ stream }).sort({ semesterNum: 1 }).lean();
    if (!semesters.length) {
      return res.status(404).json({ success: false, error: 'No semesters found for the selected stream.' });
    }

    // Keep only semesters that already have a generated timetable
    const semIds = semesters.map(s => s._id);
    const ttRows = await Timetable.find({ semester: { $in: semIds } }, { semester: 1 }).lean();
    const hasTT = new Set(ttRows.map(r => String(r.semester)));

    const filtered = semesters
      .filter(s => hasTT.has(String(s._id)))
      .map(s => ({
        _id: s._id,
        semesterNum: s.semesterNum,
        sections: Array.isArray(s.sections) ? s.sections : ['A'],
      }));

    if (!filtered.length) {
      return res.status(404).json({ success: false, error: 'No generated timetable available for this stream.' });
    }

    return res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    console.error('Error fetching semesters:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * POST /api/student/timetable
 * Body: { stream: String, semesterNum: Number, section: String }
 * Returns a SECTION-SPECIFIC timetable view for students.
 *
 * Notes on storage:
 * - Your Timetable model saves each slot with `session: String`.
 * - We stored either:
 *    - 'FREE' or a break label ('Tea Break' / 'Lunch Break'), or
 *    - a JSON string: {"bySection":{"A":{kind,courseId,courseName,teacher}, ...}}
 * - Here we parse that JSON and pick the requested section only.
 */
export const getTimetableForStudent = async (req, res) => {
  try {
    const { stream, semesterNum, section } = req.body;

    if (!stream || !semesterNum || !section) {
      return res.status(400).json({ success: false, error: 'stream, semesterNum and section are required.' });
    }

    const num = parseInt(semesterNum, 10);
    if (Number.isNaN(num) || num < 1) {
      return res.status(400).json({ success: false, error: 'Invalid semesterNum.' });
    }

    // Find the semester first (to validate section)
    const semester = await Semester.findOne({ stream, semesterNum: num }).lean();
    if (!semester) {
      return res.status(404).json({ success: false, error: 'Semester not found for the given stream and number.' });
    }

    const validSections = new Set(semester.sections || []);
    const sec = String(section).toUpperCase().trim();
    if (!validSections.has(sec)) {
      return res.status(400).json({ success: false, error: `Invalid section. Valid sections: ${Array.from(validSections).join(', ')}` });
    }

    // Load timetable doc
    const timetable = await Timetable.findOne({ semester: semester._id }).lean();
    if (!timetable) {
      return res.status(404).json({ success: false, error: 'Timetable not generated for this semester.' });
    }

    // Build a per-section view from stored strings
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const daysOut = {};

    for (const d of DAYS) {
      const arr = timetable.days?.[d] || [];
      daysOut[d] = arr.map(slot => {
        // Break cells: session is the break label string
        if (slot.type === 'break') {
          return {
            index: slot.index,
            time: slot.time,
            type: slot.type,
            session: { kind: 'break', label: slot.session } // object for frontend ease
          };
        }

        // Non-break: parse JSON or fallback
        let sessObj = null;
        if (typeof slot.session === 'string' && slot.session.startsWith('{')) {
          try {
            const parsed = JSON.parse(slot.session);
            const bySection = parsed?.bySection || {};
            const s = bySection[sec];
            if (s && (s.kind === 'theory' || s.kind === 'lab')) {
              sessObj = {
                kind: s.kind,
                courseId: s.courseId,
                courseName: s.courseName,
                section: sec
              };
            }
          } catch {
            // treat invalid JSON as FREE
          }
        }

        // If nothing for this section at this slot
        if (!sessObj) {
          return {
            index: slot.index,
            time: slot.time,
            type: slot.type,
            session: null // FREE for this section
          };
        }

        return {
          index: slot.index,
          time: slot.time,
          type: slot.type,
          session: sessObj
        };
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        semester: { id: String(semester._id), stream: semester.stream, semesterNum: semester.semesterNum, section: sec },
        days: daysOut
      }
    });
  } catch (e) {
    console.error('getTimetableForStudent error', e);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * OPTIONAL (useful for admin/student general view)
 * POST /api/student/timetable/combined
 * Body: { stream, semesterNum }
 * Returns the raw combined timetable with per-slot `bySection` mapping for UI grids.
 */
export const getCombinedTimetable = async (req, res) => {
  try {
    const { stream, semesterNum } = req.body;

    if (!stream || !semesterNum) {
      return res.status(400).json({ success: false, error: 'stream and semesterNum are required.' });
    }

    const num = parseInt(semesterNum, 10);
    if (Number.isNaN(num) || num < 1) {
      return res.status(400).json({ success: false, error: 'Invalid semesterNum.' });
    }

    const semester = await Semester.findOne({ stream, semesterNum: num }).lean();
    if (!semester) return res.status(404).json({ success: false, error: 'Semester not found.' });

    const timetable = await Timetable.findOne({ semester: semester._id }).lean();
    if (!timetable) return res.status(404).json({ success: false, error: 'Timetable not generated for this semester.' });

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const daysOut = {};

    for (const d of DAYS) {
      const arr = timetable.days?.[d] || [];
      daysOut[d] = arr.map(slot => {
        if (slot.type === 'break') {
          return { index: slot.index, time: slot.time, type: slot.type, session: slot.session }; // string label
        }
        let bySection = {};
        if (typeof slot.session === 'string' && slot.session.startsWith('{')) {
          try {
            const parsed = JSON.parse(slot.session);
            bySection = parsed?.bySection || {};
          } catch {
            bySection = {};
          }
        }
        return {
          index: slot.index,
          time: slot.time,
          type: slot.type,
          bySection // e.g., { A:{kind,courseId,courseName,teacher}, B:{...} }
        };
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        semester: { id: String(semester._id), stream: semester.stream, semesterNum: semester.semesterNum, sections: semester.sections || [] },
        days: daysOut
      }
    });
  } catch (e) {
    console.error('getCombinedTimetable error', e);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
