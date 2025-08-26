// src/pages/CreateSemester.jsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './CreateSemester.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const DEFAULT_SECTIONS = ['A','B','C'];
const STREAMS = ['CSE','ECE','AIE'];

export default function CreateSemester() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const q = useMemo(() => new URLSearchParams(search), [search]);
  const mode = q.get('mode');        // "edit" or null
  const semId = q.get('id');

  const isEdit = mode === 'edit' && semId;

  const [semesterNum, setSemesterNum] = useState('');
  const [year, setYear] = useState('');
  const [stream, setStream] = useState('');
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [courses, setCourses] = useState([]); // each: {_id?, courseId, courseName, theoryHours, labHours}
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Load existing semester when editing
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true); setError(''); setSuccess('');
        const r = await fetch(`${API}/api/admin/semesters/${semId}`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || data.message || 'Failed to load semester');

        setSemesterNum(data.data.semesterNum || '');
        setYear(data.data.year || '');
        setStream(data.data.stream || '');
        setSections(Array.isArray(data.data.sections) ? data.data.sections : DEFAULT_SECTIONS);
        setCourses((data.data.courses || []).map(c => ({
          _id: c._id,                       // keep embedded id to preserve enrollments
          courseId: c.courseId || '',
          courseName: c.courseName || '',
          theoryHours: Number(c.theoryHours || 0),
          labHours: Number(c.labHours || 0)
        })));
      } catch (e) {
        setError(e.message || 'Failed to load semester');
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, semId]);

  // Helpers
  const onChangeCourse = (idx, field, value) => {
    setCourses(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: field === 'theoryHours' || field === 'labHours' ? Number(value || 0) : value };
      return copy;
    });
  };

  const addCourse = () => {
    setCourses(prev => [...prev, { courseId:'', courseName:'', theoryHours:0, labHours:0 }]);
  };

  const removeCourse = (idx) => {
    setCourses(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSectionsInput = (val) => {
    const arr = val.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    setSections(arr.length ? Array.from(new Set(arr)) : []);
  };

  const validate = () => {
    if (!semesterNum || !year || !stream) return 'Semester number, year, and stream are required.';
    if (!Array.isArray(sections) || sections.length === 0) return 'At least one section is required.';
    for (const c of courses) {
      if (!c.courseId || !c.courseName) return 'Each course needs Course ID and Course Name.';
      if (Number.isNaN(Number(c.theoryHours)) || Number.isNaN(Number(c.labHours))) {
        return 'Theory/Lab hours must be numbers.';
      }
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    const v = validate();
    if (v) { setError(v); return; }

    const payload = {
      semesterNum: Number(semesterNum),
      year: Number(year),
      stream,
      sections,
      courses: courses.map(c => ({
        ...(c._id ? { _id: c._id } : {}),        // keep _id to preserve assignees
        courseId: c.courseId.trim(),
        courseName: c.courseName.trim(),
        theoryHours: Number(c.theoryHours || 0),
        labHours: Number(c.labHours || 0)
      }))
    };

    try {
      setLoading(true);
      const r = await fetch(
        isEdit ? `${API}/api/admin/semesters/${semId}` : `${API}/api/admin/create`,
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const data = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(data.error || data.message || 'Save failed');

      setSuccess(isEdit ? 'Semester updated successfully ✅' : 'Semester created successfully ✅');
      setTimeout(() => navigate('/admin/view'), 600);
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="semester-container">
      <h2 className="semester-title">{isEdit ? 'Edit Semester' : 'Create Semester'}</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading ? <div>Loading…</div> : (
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Semester Number</label>
            <input className="form-input" type="number" value={semesterNum} onChange={e=>setSemesterNum(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Year</label>
            <input className="form-input" type="number" value={year} onChange={e=>setYear(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Stream</label>
            <select className="form-select" value={stream} onChange={e=>setStream(e.target.value)} required>
              <option value="">Select Stream</option>
              {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sections (comma-separated, e.g. A,B,C)</label>
            <input
              className="form-input"
              value={sections.join(',')}
              onChange={e => handleSectionsInput(e.target.value)}
              placeholder="A,B,C"
            />
            <div style={{marginTop:6, fontSize:12, color:'#6b7280'}}>
              Current: {sections.length ? sections.join(' • ') : '—'}
            </div>
          </div>

          <div className="form-group">
            <h3 className="form-label">Courses</h3>
            <div className="added-courses-list">
              {courses.map((c, idx) => (
                <div key={c._id || idx} style={{border:'1px solid #e5e7eb', borderRadius:10, padding:10, marginBottom:8}}>
                  <div className="course-input-container" style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8}}>
                    <input className="form-input" placeholder="Course ID"   value={c.courseId}    onChange={e=>onChangeCourse(idx,'courseId',e.target.value)} />
                    <input className="form-input" placeholder="Course Name" value={c.courseName}  onChange={e=>onChangeCourse(idx,'courseName',e.target.value)} />
                    <input className="form-input" type="number" placeholder="Theory Hours" value={c.theoryHours} onChange={e=>onChangeCourse(idx,'theoryHours',e.target.value)} />
                    <input className="form-input" type="number" placeholder="Lab Hours (e.g., 3,6)" value={c.labHours} onChange={e=>onChangeCourse(idx,'labHours',e.target.value)} />
                    <button type="button" className="add-course-btn" onClick={()=>removeCourse(idx)} style={{background:'#ef4444'}}>Remove</button>
                  </div>
                  {c._id && (
                    <div style={{marginTop:6, fontSize:12, color:'#6b7280'}}>
                      Preserving enrollments for this course while editing.
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button type="button" className="add-course-btn" onClick={addCourse}>+ Add Course</button>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (isEdit ? 'Updating…' : 'Creating…') : (isEdit ? 'Update Semester' : 'Create Semester')}
          </button>
        </form>
      )}
    </div>
  );
}
