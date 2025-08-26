import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import './ViewSemester.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function ViewSemester() {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('admin-view');
    return () => document.body.classList.remove('admin-view');
  }, []);

  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [notice,  setNotice]  = useState('');

  const load = async () => {
    setLoading(true); setError(''); setNotice('');
    try {
      const r = await fetch(`${API}/api/admin/semesters`, { credentials: 'include' });
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('application/json')) {
        const text = await r.text();
        throw new Error(`Non-JSON from ${r.url} (status ${r.status}). Check backend route GET /api/admin/semesters. First chars: ${text.slice(0,80)}`);
      }
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Failed to fetch semesters');
      // Support either { data: [...] } or direct array
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setSemesters(list);
    } catch (e) {
      setError(e.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generate = async (id) => {
    setError(''); setNotice('');
    try {
      const r = await fetch(`${API}/api/timetable/generate`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        credentials: 'include',
        body: JSON.stringify({ semesterId: id })
      });
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      const data = ct.includes('application/json') ? await r.json() : {};
      if (!r.ok) {
        if (data?.missing?.length) throw new Error(`Cannot generate. Unassigned: ${data.missing.join(', ')}`);
        throw new Error(data.error || data.message || 'Failed to generate');
      }
      setNotice('Timetable generated ✅');
    } catch (e) { setError(e.message || 'Failed to generate'); }
  };

  const deleteTimetable = async (id) => {
    setError(''); setNotice('');
    try {
      const r = await fetch(`${API}/api/timetable/${id}`, { method: 'DELETE', credentials: 'include' });
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      const data = ct.includes('application/json') ? await r.json() : {};
      if (!r.ok) throw new Error(data.error || data.message || 'Failed to delete timetable');
      setNotice('Timetable deleted. You can re-generate now.');
    } catch (e) { setError(e.message || 'Failed to delete timetable'); }
  };

  const deleteSemester = async (id) => {
    if (!confirm('Delete this semester? This will remove the semester and its timetable if any.')) return;
    setError(''); setNotice('');
    try {
      const r = await fetch(`${API}/api/admin/semesters/${id}`, { method: 'DELETE', credentials: 'include' });
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      const data = ct.includes('application/json') ? await r.json() : {};
      if (!r.ok) throw new Error(data.error || data.message || 'Failed to delete semester');
      setNotice('Semester deleted.');
      load();
    } catch (e) { setError(e.message || 'Failed to delete semester'); }
  };

  const editSemester = (id) => {
    // If your route differs, change this to your path (e.g., `/admin/create?id=${id}&mode=edit`)
    navigate(`/admin/semesters/${id}/edit`);
  };

  const ui = (
    <div className="view-viewport">
      <section className="view-card">
        <h2 className="page-title">View Created Semesters</h2>

        {notice && <div className="msg success">{notice}</div>}
        {loading ? (
          <div className="skeleton"><div className="bar"/><div className="bar"/><div className="bar"/></div>
        ) : error ? (
          <div className="msg error">{error}</div>
        ) : semesters.length === 0 ? (
          <div className="msg info">No semesters created yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="sem-table">
              <thead>
                <tr>
                  <th>Semester</th>
                  <th>Year</th>
                  <th>Stream</th>
                  <th>Sections</th>
                  <th>Courses</th>
                  <th style={{minWidth:360}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {semesters.map((s) => {
                  const id = s.id || s._id;
                  const stream = (s.stream || s?.department?.code || '').toString().toUpperCase();
                  return (
                    <tr key={id}>
                      <td data-col="Semester">{s.semesterNum}</td>
                      <td data-col="Year">{s.year}</td>
                      <td data-col="Stream">{stream || '—'}</td>
                      <td data-col="Sections">
                        {Array.isArray(s.sections) && s.sections.length ? s.sections.join(', ') : '—'}
                      </td>
                      <td data-col="Courses">
                        {s.courses?.length ? (
                          <ul className="course-list">
                            {s.courses.map((c, j) => (
                              <li key={j}>
                                <strong>{c.courseId}</strong> — {c.courseName}
                                {(c.theoryHours || c.tutorialHours || c.labHours) &&
                                  <> ({c.theoryHours || 0} T, {c.tutorialHours || 0} Tu, {c.labHours || 0} L)</>}
                              </li>
                            ))}
                          </ul>
                        ) : <span className="muted">No courses available</span>}
                      </td>
                      <td>
                        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                          <button className="btn" onClick={() => editSemester(id)}>Edit</button>
                          <button className="btn danger" onClick={() => deleteSemester(id)}>Delete</button>
                          <button className="btn" onClick={() => generate(id)}>Generate TT</button>
                          <button className="btn danger" onClick={() => deleteTimetable(id)}>Delete TT</button>
                          <button className="btn" onClick={load}>Refresh</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );

  return createPortal(ui, document.body);
}
