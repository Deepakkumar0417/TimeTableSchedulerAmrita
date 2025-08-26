import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AdminOverlay.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const sanitizeSections = (arr) => {
  const out = [];
  const seen = new Set();
  for (const raw of arr || []) {
    const s = String(raw || '').trim().toUpperCase();
    if (s && !seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out.length ? out : ['A'];
};

export default function AdminEditSemester() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [ok, setOk]           = useState('');
  const [form, setForm] = useState({
    semesterNum: 1,
    year: new Date().getFullYear(),
    stream: '',
    sections: ['A'],
    courses: []
  });

  useEffect(() => {
    (async () => {
      if (!id) { setError('Missing semester id in route.'); setLoading(false); return; }
      setLoading(true); setError('');
      try {
        const r = await fetch(`${API}/api/admin/semesters/${id}`, { credentials: 'include' });
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json')) {
          const text = await r.text();
          throw new Error(`Non-JSON from ${r.url} (status ${r.status}). First chars: ${text.slice(0,80)}`);
        }

        const payload = await r.json();
        if (!r.ok) throw new Error(payload.message || 'Failed to load');
        // accept { data }, { semester }, or raw object
        const s = payload.data || payload.semester || payload;
        if (!s || typeof s !== 'object') throw new Error('Invalid response shape for semester details.');

        setForm({
          semesterNum: Number(s.semesterNum ?? 1),
          year:        Number(s.year ?? new Date().getFullYear()),
          stream:      (s.stream || s?.department?.code || '').toString().toUpperCase(),
          sections:    sanitizeSections(Array.isArray(s.sections) ? s.sections : ['A']),
          courses:     Array.isArray(s.courses) ? s.courses.map(c => ({
            courseId:      c.courseId || '',
            courseName:    c.courseName || '',
            theoryHours:   Number(c.theoryHours || 0),
            tutorialHours: Number(c.tutorialHours || 0),
            labHours:      Number(c.labHours || 0),
          })) : []
        });
      } catch (e) {
        console.error('Edit load error:', e);
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const setCourse = (i, k, v) => {
    setForm(f => {
      const next = f.courses.map((c, idx) =>
        idx === i ? { ...c, [k]: (k.endsWith('Hours') ? Number(v || 0) : v) } : c
      );
      return { ...f, courses: next };
    });
  };

  const addCourse    = () => setForm(f => ({ ...f, courses: [...f.courses, { courseId:'', courseName:'', theoryHours:0, tutorialHours:0, labHours:0 }] }));
  const removeCourse = (i) => setForm(f => ({ ...f, courses: f.courses.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaving(true); setError(''); setOk('');
    try {
      const payload = {
        semesterNum: Number(form.semesterNum),
        year:        Number(form.year),
        stream:      form.stream,
        sections:    sanitizeSections(form.sections),
        courses:     (form.courses || []).map(c => ({
          courseId:      String(c.courseId || '').trim(),
          courseName:    String(c.courseName || '').trim(),
          theoryHours:   Number(c.theoryHours || 0),
          tutorialHours: Number(c.tutorialHours || 0),
          labHours:      Number(c.labHours || 0),
        }))
      };

      const r = await fetch(`${API}/api/admin/semesters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      const data = ct.includes('application/json') ? await r.json() : {};
      if (!r.ok) throw new Error(data.message || 'Save failed');

      setOk('Saved!');
      setTimeout(() => navigate('/admin/semesters'), 600);
    } catch (e) {
      console.error('Edit save error:', e);
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="overlay-viewport">
        <div className="overlay-card"><h2>Loading…</h2></div>
      </div>
    );
  }

  return (
    <div className="overlay-viewport">
      <div className="overlay-card">
        <h2 className="page-title">Edit Semester</h2>
        {error && <div className="ov-banner error">{error}</div>}
        {ok && <div className="ov-banner success">{ok}</div>}

        <div className="grid-two">
          <div className="ov-field">
            <label className="ov-label">Semester Number</label>
            <input
              className="ov-input"
              type="number"
              min="1"
              value={form.semesterNum}
              onChange={e => setForm(f => ({ ...f, semesterNum: Number(e.target.value) }))}
            />
          </div>
          <div className="ov-field">
            <label className="ov-label">Year</label>
            <input
              className="ov-input"
              type="number"
              value={form.year}
              onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="ov-field">
          <label className="ov-label">Dept/Stream (read-only)</label>
          <input className="ov-input" value={form.stream} disabled />
        </div>

        <div className="ov-field">
          <label className="ov-label">Sections</label>
          <div className="course-grid">
            {form.sections.map((s, i) => (
              <input
                key={i}
                className="ov-input"
                value={s}
                onChange={e =>
                  setForm(f => {
                    const next = [...f.sections];
                    next[i] = (e.target.value || '').toUpperCase();
                    return { ...f, sections: next };
                  })
                }
              />
            ))}
            <button
              className="ov-btn"
              onClick={() =>
                setForm(f => ({ ...f, sections: [...sanitizeSections(f.sections), ''] }))
              }
            >
              Add Section
            </button>
          </div>
        </div>

        <div className="ov-field" style={{ gridColumn: '1 / -1' }}>
          <label className="ov-label">Courses</label>

          {form.courses.length > 0 && (
            <div className="course-grid course-head">
              <div>Course ID</div><div>Course Name</div><div>L</div><div>Tu</div><div>P</div><div></div>
            </div>
          )}

          {form.courses.map((c, i) => (
            <div className="course-grid" key={i}>
              <input className="ov-input" placeholder="21AIE200" value={c.courseId} onChange={e => setCourse(i, 'courseId', e.target.value)} />
              <input className="ov-input" placeholder="Introduction to AI" value={c.courseName} onChange={e => setCourse(i, 'courseName', e.target.value)} />
              <input className="ov-input" type="number" min="0" value={c.theoryHours} onChange={e => setCourse(i, 'theoryHours', e.target.value)} />
              <input className="ov-input" type="number" min="0" value={c.tutorialHours} onChange={e => setCourse(i, 'tutorialHours', e.target.value)} />
              <input className="ov-input" type="number" min="0" step="3" value={c.labHours} onChange={e => setCourse(i, 'labHours', e.target.value)} />
              <button className="ov-btn" onClick={() => removeCourse(i)}>Remove</button>
            </div>
          ))}

          <button className="ov-btn primary" onClick={addCourse}>Add Course</button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="ov-btn" onClick={() => navigate('/admin/semesters')}>Cancel</button>
          <button className="ov-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}
