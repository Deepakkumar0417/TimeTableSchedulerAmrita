import { useNavigate } from 'react-router-dom';

export default function TeacherHeader() {
  const navigate = useNavigate();

  async function doLogout() {
    try {
      await fetch(`${API}/api/teacher/logout`, { method:'POST', credentials:'include' });
    } catch {}
    localStorage.removeItem('tt_token');
    navigate('/teacher/login');
  }

   return (
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:'#0f172a',color:'#e5e7eb'}}>
      <div style={{fontWeight:800}}>Teacher Portal</div>
      <div style={{display:'flex', gap:8}}>
        <button onClick={()=>navigate('/teacher/profile')} style={{padding:'8px 12px',border:0,borderRadius:8,background:'#1f2937',color:'#fff',fontWeight:700,cursor:'pointer'}}>Profile</button>
        <button onClick={doLogout} style={{padding:'8px 12px',border:0,borderRadius:8,background:'#ef4444',color:'#fff',fontWeight:700,cursor:'pointer'}}>Logout</button>
      </div>
    </header>
  );
}
