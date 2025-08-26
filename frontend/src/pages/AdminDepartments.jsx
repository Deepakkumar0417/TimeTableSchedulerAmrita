import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiReady } from '../api/client';
import { listDepartments, createDepartment } from '../api/admin';
import './AdminOverlay.css';

export default function AdminDepartments() {
  useEffect(()=>{ document.body.classList.add('admin-depts'); return ()=>document.body.classList.remove('admin-depts'); },[]);
  const [list, setList] = useState([]); const [form, setForm] = useState({ name:'', code:'' });
  const [msg,setMsg]=useState(''); const [err,setErr]=useState('');

  const load = async ()=>{ try{ if(apiReady){ const d = await listDepartments(); setList(d.data || d); } } catch(e){ setErr(e.message);} };
  useEffect(()=>{ load(); },[]);
  const onChange = e => setForm(f=>({ ...f, [e.target.name]: e.target.value }));
  const onSubmit = async e => {
    e.preventDefault(); setErr(''); setMsg('');
    try{
      if(!apiReady) throw new Error('Backend not connected');
      const res = await createDepartment(form); setMsg(res.message || 'Department created'); setForm({name:'',code:''}); load();
    } catch(e2){ setErr(e2.message); }
  };

  const ui = (
    <div className="ov-viewport">
      <section className="ov-card">
        <h2 className="ov-title">Departments</h2>
        {!apiReady && <div className="ov-banner warn">Backend not connected</div>}
        {err && <div className="ov-banner error">{err}</div>}
        {msg && <div className="ov-banner">{msg}</div>}

        <form className="grid-two" onSubmit={onSubmit}>
          <div className="ov-field"><label className="ov-label">Name</label><input className="ov-input" name="name" value={form.name} onChange={onChange} required /></div>
          <div className="ov-field"><label className="ov-label">Code</label><input className="ov-input" name="code" value={form.code} onChange={onChange} required /></div>
          <button className="ov-btn primary" type="submit" disabled={!apiReady}>Add Department</button>
        </form>

        <div className="table-wrap">
          <table className="ov-table">
            <thead><tr><th>Name</th><th>Code</th></tr></thead>
            <tbody>{(list||[]).map(d=>(
              <tr key={d.id || d._id}><td>{d.name}</td><td>{d.code}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
  return createPortal(ui, document.body);
}
