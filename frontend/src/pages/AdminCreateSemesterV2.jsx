import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiReady } from '../api/client';
import { listCohorts, listDepartments, createSemester } from '../api/admin';
import './AdminOverlay.css';

const allowedSemesters = (total, parity) => {
  const start = parity === 'odd' ? 1 : 2; const out = [];
  for (let n = start; n <= total; n += 2) out.push(n);
  return out;
};

export default function AdminCreateSemesterV2() {
  useEffect(()=>{ document.body.classList.add('admin-create-v2'); return ()=>document.body.classList.remove('admin-create-v2'); },[]);
  const [cohorts,setCohorts]=useState([]); const [depts,setDepts]=useState([]);
  const [form,setForm]=useState({ cohortId:'', departmentId:'', parity:'odd', semesterNum:'', sections:1 });
  const [courses,setCourses]=useState([]);
  const [msg,setMsg]=useState(''); const [err,setErr]=useState('');

  useEffect(()=>{ (async()=>{ try{
    if(apiReady){
      const [co, dp] = await Promise.all([listCohorts(), listDepartments()]);
      setCohorts(co.data || co); setDepts(dp.data || dp);
    }
  }catch(e){ setErr(e.message); } })(); },[]);

  const selectedCohort = useMemo(()=> (cohorts || []).find(c => (c.id||c._id) === form.cohortId), [cohorts, form.cohortId]);
  const semOptions = useMemo(()=>{
    const total = selectedCohort?.totalSemesters || 0;
    return allowedSemesters(total, form.parity);
  }, [selectedCohort, form.parity]);

  const updateForm = e => setForm(f=>({ ...f, [e.target.name]: e.target.value }));
  const updateCourse = (idx, key, val) => setCourses(cs => cs.map((c,i)=> i===idx? { ...c, [key]: val } : c));
  const addCourse = ()=> setCourses(cs => [...cs, { courseId:'', courseName:'', theoryHours:0, tutorialHours:0, labHours:0 }]);
  const removeCourse = (i)=> setCourses(cs => cs.filter((_,idx)=> idx!==i));

  const onSubmit = async e => {
    e.preventDefault(); setErr(''); setMsg('');
    try{
      if(!apiReady) throw new Error('Backend not connected');
      const payload = {
        cohortId: form.cohortId,
        departmentId: form.departmentId,
        semesterNum: Number(form.semesterNum),
        sections: Number(form.sections),
        courses: courses.map(c=>({
          courseId: c.courseId, courseName: c.courseName,
          theoryHours: Number(c.theoryHours||0),
          tutorialHours: Number(c.tutorialHours||0),
          labHours: Number(c.labHours||0)
        }))
      };
      const res = await createSemester(payload);
      setMsg(res.message || 'Semester created'); setCourses([]);
    }catch(e2){ setErr(e2.message); }
  };

  const ui = (
    <div className="ov-viewport">
      <section className="ov-card">
        <h2 className="ov-title">Create Semester</h2>
        {!apiReady && <div className="ov-banner warn">Backend not connected</div>}
        {err && <div className="ov-banner error">{err}</div>}
        {msg && <div className="ov-banner">{msg}</div>}

        <form className="grid-two" onSubmit={onSubmit}>
          <div className="ov-field"><label className="ov-label">Cohort (Degree × Dept × Intake)</label>
            <select className="ov-select" name="cohortId" value={form.cohortId} onChange={updateForm} required>
              <option value="">Select Cohort</option>
              {(cohorts||[]).map(c=>(
                <option key={c.id||c._id} value={c.id||c._id}>
                  {(c.degree?.name||c.degreeId)} — {(c.department?.code||c.departmentId)} — {c.intakeYear} ({c.totalSemesters} sems)
                </option>
              ))}
            </select>
          </div>

          <div className="ov-field"><label className="ov-label">Department</label>
            <select className="ov-select" name="departmentId" value={form.departmentId} onChange={updateForm} required>
              <option value="">Select Department</option>
              {(depts||[]).map(d=> <option key={d.id||d._id} value={d.id||d._id}>{d.code} — {d.name}</option>)}
            </select>
          </div>

          <div className="ov-field"><label className="ov-label">Odd / Even</label>
            <select className="ov-select" name="parity" value={form.parity} onChange={updateForm}>
              <option value="odd">Odd</option><option value="even">Even</option>
            </select>
          </div>

          <div className="ov-field"><label className="ov-label">Semester Number</label>
            <select className="ov-select" name="semesterNum" value={form.semesterNum} onChange={updateForm} required disabled={!selectedCohort}>
              <option value="">Select</option>
              {semOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="ov-field"><label className="ov-label">Sections (count)</label>
            <input className="ov-input" type="number" min="1" max="12" name="sections" value={form.sections} onChange={updateForm} />
          </div>

          {/* Courses editor (side-by-side on laptops) */}
          {/* Courses editor (labeled columns; responsive) */}
<div className="ov-field" style={{ gridColumn: '1 / -1' }}>
  <label className="ov-label">Courses</label>
  <p style={{margin:'4px 0 10px', color:'#6b7280'}}>
    Enter L/T/P hours per week. <strong>P must be a multiple of 3</strong> (each 3 hours = one lab block). Credits are computed as <code>L + T + P/3</code>.
  </p>

  {courses.length > 0 && (
    <div className="course-grid course-head">
      <div>Course ID</div>
      <div>Course Name</div>
      <div>L</div>
      <div>T</div>
      <div>P</div>
      <div></div>
    </div>
  )}

  {courses.map((c, i) => (
    <div key={i} className="course-grid">
      <input
        className="ov-input"
        aria-label="Course ID"
        placeholder="21AIE200"
        value={c.courseId}
        onChange={e => updateCourse(i, 'courseId', e.target.value)}
        required
      />
      <input
        className="ov-input"
        aria-label="Course Name"
        placeholder="Introduction to AI"
        value={c.courseName}
        onChange={e => updateCourse(i, 'courseName', e.target.value)}
        required
      />
      <input
        className="ov-input"
        type="number"
        min="0"
        aria-label="Lecture hours (L)"
        placeholder="L"
        value={c.theoryHours}
        onChange={e => updateCourse(i, 'theoryHours', e.target.value)}
      />
      <input
        className="ov-input"
        type="number"
        min="0"
        aria-label="Tutorial hours (T)"
        placeholder="T"
        value={c.tutorialHours}
        onChange={e => updateCourse(i, 'tutorialHours', e.target.value)}
      />
      <input
        className="ov-input"
        type="number"
        min="0"
        step="3"
        aria-label="Lab hours (P; multiple of 3)"
        placeholder="P"
        value={c.labHours}
        onChange={e => updateCourse(i, 'labHours', e.target.value)}
      />
      <button type="button" className="ov-btn" onClick={() => removeCourse(i)}>
        Remove
      </button>
    </div>
  ))}

  <button type="button" className="ov-btn primary" onClick={addCourse}>
    Add Course
  </button>
</div>


          <button className="ov-btn primary" type="submit" disabled={!apiReady}>Create Semester</button>
        </form>
      </section>
    </div>
  );
  return createPortal(ui, document.body);
}
