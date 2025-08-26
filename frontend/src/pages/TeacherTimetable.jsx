import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];

export default function TeacherTimetable() {
  const { semesterId } = useParams();
  const navigate = useNavigate();

  const [err, setErr] = useState('');
  const [days, setDays] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mySemesters, setMySemesters] = useState([]);
  const [sel, setSel] = useState('');

  // If no :semesterId, load my enrollments to let me pick
  useEffect(() => {
    if (semesterId) return; // skip picker mode

    (async () => {
      try {
        setErr(''); setLoading(true);
        const token = localStorage.getItem('tt_token');
        const r = await fetch(`${API}/api/teacher/me`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || data.message || 'Failed to load profile');

        // unique semester list from enrollments
        const ids = new Map(); // id -> label
        for (const e of data.data.enrollments || []) {
          const label = `${e.semesterNum} — ${e.year} (${e.stream || '-'})`;
          ids.set(e.semesterId, label);
        }
        const arr = Array.from(ids.entries()).map(([id,label]) => ({ id, label }));
        setMySemesters(arr);
        if (arr.length) setSel(arr[0].id);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [semesterId]);

  // When :semesterId present, fetch timetable
  useEffect(() => {
    if (!semesterId) return;
    (async () => {
      try {
        setErr(''); setLoading(true);
        const token = localStorage.getItem('tt_token');
        const r = await fetch(`${API}/api/timetable/my/${semesterId}`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || data.message || 'Failed to load timetable');
        setDays(data.days);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [semesterId]);

  if (!semesterId) {
    // Picker mode
    return (
      <div style={{minHeight:'100svh', background:'#f3f5f8', padding:16}}>
        <div style={{maxWidth:720, margin:'0 auto', background:'#fff', borderRadius:16, padding:16}}>
          <h2>My Timetable</h2>
          {loading ? <div>Loading…</div> :
           err ? <div style={{color:'crimson'}}>Error: {err}</div> :
           mySemesters.length === 0 ? (
            <div style={{color:'#6b7280'}}>No enrolled semesters yet.</div>
           ) : (
            <div style={{display:'flex', gap:8}}>
              <select value={sel} onChange={e=>setSel(e.target.value)} style={{padding:'8px 12px', borderRadius:8}}>
                {mySemesters.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <button onClick={()=>navigate(`/teacher/timetable/${sel}`)}
                style={{padding:'8px 12px', border:0, borderRadius:8, background:'#0ea5e9', color:'#fff', fontWeight:700}}>
                View
              </button>
            </div>
           )}
        </div>
      </div>
    );
  }

  // Display timetable for a specific semester
  if (loading) return <div style={{padding:16}}>Loading…</div>;
  if (err) return <div style={{padding:16, color:'crimson'}}>Error: {err}</div>;
  if (!days) return null;

  return (
    <div style={{padding:16}}>
      <h2>My Timetable</h2>
      {DAYS.map(d=>(
        <div key={d} style={{marginBottom:12}}>
          <h3>{d}</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,minmax(140px,1fr))',gap:8}}>
            {days[d].map((s,i)=>(
              <div key={i} style={{border:'1px solid #e5e7eb',borderRadius:10,padding:8,background:'#fff',minHeight:72}}>
                <div style={{fontSize:12,color:'#6b7280'}}>{s.time}</div>
                {!s.session ? null :
                  s.session.kind==='break' ? <div>Break</div> :
                  s.session.kind==='lab' || s.session.kind==='theory' ?
                    <div>
                      <div style={{fontWeight:800}}>{s.session.courseId}</div>
                      <div>{s.session.courseName}</div>
                      <div style={{fontSize:12,color:'#6b7280'}}>Section {s.session.section} • {s.session.kind}</div>
                    </div> :
                    null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
