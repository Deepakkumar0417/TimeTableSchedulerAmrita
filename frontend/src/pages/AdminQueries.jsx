import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiReady } from '../api/client';
import { listQueries, setQueryStatus, replyQuery } from '../api/admin';
import './AdminOverlay.css';

export default function AdminQueries() {
  useEffect(()=>{ document.body.classList.add('admin-queries'); return ()=>document.body.classList.remove('admin-queries'); },[]);
  const [items,setItems]=useState([]); const [err,setErr]=useState(''); const [msg,setMsg]=useState('');
  const [reply,setReply]=useState({ id:'', text:'' });

  const load = async ()=>{ setErr(''); setMsg(''); try{ if(apiReady){ const r = await listQueries(); setItems(r.data || r); } }catch(e){ setErr(e.message); } };
  useEffect(()=>{ load(); },[]);

  const doStatus = async (id, status) => { try{ if(!apiReady) throw new Error('Backend not connected'); await setQueryStatus(id, status); setMsg(`Marked ${status}`); load(); } catch(e){ setErr(e.message);} };
  const doReply = async (e) => {
    e.preventDefault(); try{
      if(!apiReady) throw new Error('Backend not connected');
      await replyQuery(reply.id, { message: reply.text }); setMsg('Replied'); setReply({ id:'', text:'' }); load();
    } catch(e){ setErr(e.message); }
  };

  const ui = (
    <div className="ov-viewport">
      <section className="ov-card">
        <h2 className="ov-title">Queries</h2>
        {!apiReady && <div className="ov-banner warn">Backend not connected</div>}
        {err && <div className="ov-banner error">{err}</div>}
        {msg && <div className="ov-banner">{msg}</div>}

        <div className="table-wrap">
          <table className="ov-table">
            <thead><tr><th>Title</th><th>From</th><th>Dept</th><th>Sem</th><th>Section</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{(items||[]).map(q=>(
              <tr key={q.id || q._id}>
                <td>{q.title}</td>
                <td>{(q.fromRole||'-')}</td>
                <td>{q.department?.code || q.departmentId || '-'}</td>
                <td>{q.semesterNum || '-'}</td>
                <td>{q.section || '-'}</td>
                <td>{q.status}</td>
                <td>
                  <button className="ov-btn" onClick={()=>setReply({ id: (q.id||q._id), text:'' })}>Reply</button>{' '}
                  <button className="ov-btn" onClick={()=>doStatus(q.id||q._id,'resolved')}>Resolve</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        {reply.id && (
          <form onSubmit={doReply} style={{ marginTop: 12 }}>
            <div className="ov-field"><label className="ov-label">Reply</label>
              <textarea className="ov-textarea" value={reply.text} onChange={e=>setReply(r=>({ ...r, text:e.target.value }))} required />
            </div>
            <button className="ov-btn primary" disabled={!apiReady}>Send Reply</button>
          </form>
        )}
      </section>
    </div>
  );
  return createPortal(ui, document.body);
}
