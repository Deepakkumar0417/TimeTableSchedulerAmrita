import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiReady } from '../api/client';
import { listDegrees, createDegree } from '../api/admin';
import './AdminOverlay.css';

export default function AdminDegrees() {
  useEffect(() => { document.body.classList.add('admin-degrees'); return () => document.body.classList.remove('admin-degrees'); }, []);
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ name: '', level: 'UG', durationYears: 4 });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setErr(''); setMsg('');
    try { if (apiReady) { const d = await listDegrees(); setList(d.data || d); } }
    catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const onSubmit = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      if (!apiReady) throw new Error('Backend not connected');
      const d = await createDegree(form);
      setMsg(d.message || 'Degree created');
      setForm({ name: '', level: 'UG', durationYears: 4 });
      load();
    } catch (e2) { setErr(e2.message); }
  };

  const ui = (
    <div className="ov-viewport">
      <section className="ov-card">
        <h2 className="ov-title">Degrees</h2>
        {!apiReady && <div className="ov-banner warn">Backend not connected (set <code>VITE_API_BASE_URL</code>)</div>}
        {err && <div className="ov-banner error">{err}</div>}
        {msg && <div className="ov-banner">{msg}</div>}

        <form className="grid-two" onSubmit={onSubmit}>
          <div className="ov-field"><label className="ov-label">Degree Name</label>
            <input className="ov-input" name="name" value={form.name} onChange={onChange} placeholder="B.Tech" required />
          </div>
          <div className="ov-field"><label className="ov-label">Level</label>
            <select className="ov-select" name="level" value={form.level} onChange={onChange}><option>UG</option><option>PG</option></select>
          </div>
          <div className="ov-field"><label className="ov-label">Duration (years)</label>
            <input className="ov-input" type="number" min="1" max="6" name="durationYears" value={form.durationYears} onChange={onChange} required />
          </div>
          <button className="ov-btn primary" disabled={!apiReady} type="submit">Create Degree</button>
        </form>

        <div className="table-wrap">
          <table className="ov-table">
            <thead><tr><th>Name</th><th>Level</th><th>Years</th><th>Total Semesters</th></tr></thead>
            <tbody>{(list||[]).map(d=>(
              <tr key={d.id || d._id}><td>{d.name}</td><td>{d.level||'-'}</td><td>{d.durationYears}</td><td>{d.totalSemesters}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
  return createPortal(ui, document.body);
}
