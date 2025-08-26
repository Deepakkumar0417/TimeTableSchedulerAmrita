import { useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function EnrollSemester() {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemId, setSelectedSemId] = useState('');
  const [selections, setSelections] = useState({}); // { courseEmbeddedId: Set(['A','B']) }
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // load teacher (for dept and semesters count) + semesters list
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(''); setMsg('');

        // 1) who am I
        const token = localStorage.getItem('tt_token');
        const meRes = await fetch(`${API}/api/teacher/me`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const meJson = await meRes.json();
        if (!meRes.ok) throw new Error(meJson.error || meJson.message || 'Failed to load teacher');
        setTeacher(meJson.data);

        // 2) all semesters then filter by teacher.dept
        const sRes = await fetch(`${API}/api/admin/view`);
        const sJson = await sRes.json();
        if (!sRes.ok) throw new Error(sJson.message || 'Failed to load semesters');

        const list = Array.isArray(sJson.data) ? sJson.data : [];
        const dept = meJson.data?.teacher?.department;
        const filtered = dept ? list.filter(s => s.stream === dept) : list;

        setSemesters(filtered.sort((a, b) => (a.semesterNum ?? 0) - (b.semesterNum ?? 0)));

        // preselect first semester
        if (filtered.length) setSelectedSemId(filtered[0]._id || '');
      } catch (e) {
        setErr(e.message || 'Error loading page');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeSemestersCount = useMemo(() => {
    const ids = new Set((teacher?.enrollments || []).map(e => e.semesterId));
    return ids.size;
  }, [teacher]);

  const selectedSemester = useMemo(
    () => semesters.find(s => s._id === selectedSemId),
    [semesters, selectedSemId]
  );

  // PREFILL: when semester changes, pre-select the sections already assigned to this teacher
  useEffect(() => {
    if (!selectedSemester || !teacher?.teacher?._id) return;
    const mine = {};
    for (const c of selectedSemester.courses || []) {
      const a = (c.assignees || []).find(
        x => String(x.teacher) === String(teacher.teacher._id)
      );
      if (a && Array.isArray(a.sections) && a.sections.length) {
        mine[c._id] = new Set(a.sections);
      }
    }
    setSelections(mine);
  }, [selectedSemester, teacher]);

  // toggle a section for a given course embedded _id
  const toggleSection = (courseId, section, max = 3) => {
    setSelections(prev => {
      const cur = new Set(prev[courseId] || []);
      if (cur.has(section)) {
        cur.delete(section);
      } else {
        if (cur.size >= max) return prev; // enforce <= 3
        cur.add(section);
      }
      return { ...prev, [courseId]: cur };
    });
  };

  const submitEnrollment = async () => {
    try {
      setErr(''); setMsg('');

      if (!selectedSemester) throw new Error('Select a semester first');

      // teacher can teach in max 2 semesters (allow if already in this one)
      const alreadyIn = (teacher?.enrollments || []).some(e => e.semesterId === selectedSemester._id);
      if (activeSemestersCount >= 2 && !alreadyIn) {
        throw new Error('Limit reached: A teacher can only teach in 2 semesters.');
      }

      // build payload — DO NOT filter empty arrays; backend uses them to clear/un-enroll
      const arr = Object.entries(selections).map(([courseId, set]) => ({
        courseId,
        sections: Array.from(set || [])
      }));

      // must either pick or clear at least one course
      if (arr.length === 0 || arr.every(x => x.sections.length === 0)) {
        throw new Error('Pick sections or clear at least one course.');
      }

      const token = localStorage.getItem('tt_token');
      const res = await fetch(`${API}/api/teacher/enroll`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          semesterId: selectedSemester._id,
          selections: arr
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Enrollment failed');

      setMsg('Enrollment saved ✅');

      // (Optional) refresh local state; server is already updated
      setTeacher(t => ({
        ...t,
        enrollments: t.enrollments || []
      }));
    } catch (e) {
      setErr(e.message || 'Enrollment failed');
    }
  };

  if (loading) return <div style={{padding:16}}>Loading…</div>;
  if (err) return <div style={{padding:16, color:'crimson'}}>Error: {err}</div>;

  return (
    <div style={{minHeight:'100svh', background:'#f3f5f8', padding:'16px'}}>
      <div style={{maxWidth: 1000, margin:'0 auto'}}>
        <div style={{background:'#fff', borderRadius:16, padding:18, boxShadow:'0 18px 50px rgba(0,0,0,.08)'}}>
          <h2 style={{marginTop:0}}>Enroll to Semester</h2>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
            <div>
              <div style={{fontWeight:700, marginBottom:6}}>Department</div>
              <div style={{padding:'10px 12px', background:'#0f172a', color:'#e5e7eb', borderRadius:10}}>
                {teacher?.teacher?.department || '-'}
              </div>
            </div>
            <div>
              <label style={{fontWeight:700, marginBottom:6, display:'block'}}>Semester</label>
              <select
                value={selectedSemId}
                onChange={e => { setSelectedSemId(e.target.value); setSelections({}); }}
                style={{width:'100%', padding:'12px 14px', borderRadius:10, background:'#1f2937', color:'#e5e7eb', border:0}}
              >
                {semesters.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.semesterNum} — {s.year} ({s.stream})
                  </option>
                ))}
              </select>
              <div style={{marginTop:6, fontSize:12, color:'#6b7280'}}>
                Active semesters: <strong>{activeSemestersCount}</strong> / 2
              </div>
            </div>
          </div>

          {!selectedSemester ? (
            <div style={{color:'#6b7280'}}>No semesters available for your department.</div>
          ) : (
            <>
              <div style={{fontSize:12, color:'#6b7280', marginBottom:8}}>
                Sections marked <em>(Taken)</em> are already assigned to another teacher.
              </div>

              <h3>Courses & Sections</h3>
              <div style={{display:'grid', gap:10}}>
                {selectedSemester.courses?.map(c => {
                  // sections taken by others for this course
                  const takenByOthers = new Set(
                    (c.assignees || [])
                      .filter(a => String(a.teacher) !== String(teacher?.teacher?._id))
                      .flatMap(a => a.sections || [])
                  );

                  return (
                    <div key={c._id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                        <div style={{fontWeight:800}}>
                          {c.courseId} — {c.courseName}
                          <span style={{fontWeight:500, color:'#6b7280'}}> ({c.theoryHours || 0} Theory, {c.labHours || 0} Lab)</span>
                        </div>
                        {/* CLEAR button */}
                        <button
                          onClick={() => setSelections(prev => ({ ...prev, [c._id]: new Set() }))}
                          style={{padding:'6px 10px', border:0, borderRadius:8, background:'#ef4444', color:'#fff', cursor:'pointer'}}
                          title="Un-enroll from all sections of this course"
                        >
                          Clear
                        </button>
                      </div>

                      <div style={{marginTop:8, display:'flex', flexWrap:'wrap', gap:8}}>
                        {(selectedSemester.sections || ['A','B','C']).map(sec => {
                          const picked = selections[c._id]?.has(sec) || false;
                          const count  = selections[c._id]?.size || 0;
                          const locked = takenByOthers.has(sec); // taken by another teacher
                          const disabled = locked || (!picked && count >= 3); // lock or max 3
                          return (
                            <label key={sec}
                              style={{
                                display:'inline-flex', alignItems:'center', gap:6,
                                padding:'6px 10px', borderRadius:10,
                                border:'1px solid #d1d5db',
                                background: picked ? '#e6f7ff' : '#fff',
                                opacity: disabled ? 0.6 : 1,
                                cursor: disabled ? 'not-allowed' : 'pointer'
                              }}>
                              <input
                                type="checkbox"
                                checked={picked}
                                disabled={disabled}
                                onChange={() => toggleSection(c._id, sec, 3)}
                              />
                              <span>{sec}{locked ? ' (Taken)' : ''}</span>
                            </label>
                          );
                        })}
                      </div>

                      <div style={{marginTop:6, fontSize:12, color:'#6b7280'}}>
                        Selected: {selections[c._id]?.size || 0} / 3
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{display:'flex', gap:10, marginTop:14}}>
                <button
                  onClick={submitEnrollment}
                  style={{padding:'12px 16px', border:0, borderRadius:12, background:'#22c55e', color:'#fff', fontWeight:800, cursor:'pointer'}}
                >
                  Save Enrollment
                </button>
                {msg && <div style={{alignSelf:'center', color:'#065f46', fontWeight:700}}>{msg}</div>}
                {err && <div style={{alignSelf:'center', color:'crimson', fontWeight:700}}>{err}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
