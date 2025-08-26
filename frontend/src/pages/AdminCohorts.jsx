import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiReady } from '../api/client';
import { listDegrees, listDepartments, listCohorts, createCohort } from '../api/admin';
import './AdminOverlay.css';

export default function AdminCohorts() {
  useEffect(()=>{ document.body.classList.add('admin-cohorts'); return ()=>document.body.classList.remove('admin-cohorts'); },[]);
  const [degrees,setDegrees]=useState([]); const [depts,setDepts]=useState([]);
  const [list,setList]=useState([]); const [form,setForm]=useState({ degreeId:'', departmentId:'', intakeYear:new Date().getFullYear() });
  const [msg,setMsg]=useState(''); const [err,setErr]=useState('');

  const load = async ()=>{
    try{
      if(apiReady){
        const [dg, dp, co] = await Promise.all([listDegrees(), listDepartments(), listCohorts()]);
        setDegrees(dg.data || dg); setDepts(dp.data || dp); setList(co.data || co);
      }
    }catch(e){ setErr(e.message); }
  };
  useEffect(()=>{ load(); },[]);
  const onChange = e => setForm(f=>({ ...f, [e.target.name]: e.target.value }));
  const onSubmit = async e => {
    e.preventDefault(); setErr(''); setMsg('');
    try{
      if(!apiReady) throw new Error('Backend not connected');
      const res = await createCohort(form); setMsg(res.message || 'Cohort created'); setForm(f=>({ ...f })); load();
    }catch(e2){ setErr(e2.message); }
  };

  const ui = (
    <div className="ov-viewport">
      <section className="ov-card">
        <h2 className="ov-title">Program Cohorts</h2>
        {!apiReady && <div className="ov-banner warn">Backend not connected</div>}
        {err && <div className="ov-banner error">{err}</div>}
        {msg && <div className="ov-banner">{msg}</div>}

        <form className="grid-two" onSubmit={onSubmit}>
          <div className="ov-field"><label className="ov-label">Degree</label>
            <select className="ov-select" name="degreeId" value={form.degreeId} onChange={onChange} required>
              <option value="">Select Degree</option>
              {degrees.map(d=><option key={d.id || d._id} value={d.id || d._id}>{d.name} ({d.totalSemesters} sems)</option>)}
            </select>
          </div>
          <div className="ov-field"><label className="ov-label">Department</label>
            <select className="ov-select" name="departmentId" value={form.departmentId} onChange={onChange} required>
              <option value="">Select Department</option>
              {depts.map(d=><option key={d.id || d._id} value={d.id || d._id}>{d.code} — {d.name}</option>)}
            </select>
          </div>
          <div className="ov-field"><label className="ov-label">Intake Year</label>
            <input className="ov-input" type="number" name="intakeYear" value={form.intakeYear} onChange={onChange} />
          </div>
          <button className="ov-btn primary" disabled={!apiReady}>Create Cohort</button>
        </form>

        <div className="table-wrap">
          <table className="ov-table">
            <thead><tr><th>Degree</th><th>Department</th><th>Intake</th><th>Semesters</th></tr></thead>
            <tbody>{(list||[]).map(c=>(
              <tr key={c.id || c._id}>
                <td>{c.degree?.name || c.degreeId}</td>
                <td>{c.department?.code || c.departmentId}</td>
                <td>{c.intakeYear}</td>
                <td>{c.totalSemesters}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
  return createPortal(ui, document.body);
}
