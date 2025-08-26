import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function TeacherProfile() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
  (async () => {
    setLoading(true); setErr('');
    try {
      const token = localStorage.getItem('tt_token');
      const r = await fetch(`${API}/api/teacher/me`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (r.status === 401) {
        setErr('Please log in to view your profile.');
        return; // show message instead of auto-redirect loop
      }

      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.message || 'Failed to load profile');
      setData(data.data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  })();
}, [navigate]);

  if (loading) return <div style={{padding:20}}>Loading…</div>;
  if (err) return <div style={{padding:20, color:'crimson'}}>Error: {err}</div>;
  if (!data) return null;

  const t = data.teacher;
  const enrollments = data.enrollments || [];
  const semestersCount = data.stats?.semestersCount ?? 0;

  return (
    <div style={{minHeight:'100svh', background:'#f3f5f8', padding:'16px'}}>
      <div style={{maxWidth: 920, margin:'0 auto'}}>
        <div style={{background:'#fff', borderRadius:16, padding:20, boxShadow:'0 20px 50px rgba(0,0,0,.1)'}}>
          <h2 style={{marginTop:0}}>Profile</h2>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div><strong>Name</strong><div>{t.name}</div></div>
            <div><strong>Email</strong><div>{t.email}</div></div>
            <div><strong>Phone</strong><div>{t.phonenumber || '-'}</div></div>
            <div><strong>Department</strong><div>{t.department || '-'}</div></div>
            <div><strong>Active Semesters</strong><div>{semestersCount} / 2</div></div>
          </div>

          <h3 style={{marginTop:18}}>Current Enrollments</h3>
          {enrollments.length === 0 ? (
            <div style={{color:'#6b7280'}}>No enrollments yet.</div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    <th style={{textAlign:'left', borderBottom:'1px solid #e5e7eb', padding:'8px'}}>Semester</th>
                    <th style={{textAlign:'left', borderBottom:'1px solid #e5e7eb', padding:'8px'}}>Year</th>
                    <th style={{textAlign:'left', borderBottom:'1px solid #e5e7eb', padding:'8px'}}>Stream</th>
                    <th style={{textAlign:'left', borderBottom:'1px solid #e5e7eb', padding:'8px'}}>Course</th>
                    <th style={{textAlign:'left', borderBottom:'1px solid #e5e7eb', padding:'8px'}}>Sections</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e, i) => (
                    <tr key={i}>
                      <td style={{borderBottom:'1px solid #f1f5f9', padding:'8px'}}>{e.semesterNum}</td>
                      <td style={{borderBottom:'1px solid #f1f5f9', padding:'8px'}}>{e.year}</td>
                      <td style={{borderBottom:'1px solid #f1f5f9', padding:'8px'}}>{e.stream || '-'}</td>
                      <td style={{borderBottom:'1px solid #f1f5f9', padding:'8px'}}>{e.courseId} — {e.courseName}</td>
                      <td style={{borderBottom:'1px solid #f1f5f9', padding:'8px'}}>{(e.sections||[]).join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
