// src/pages/StudentSelectSemester.jsx
import { useEffect, useMemo, useState } from 'react';
import './StudentSelectSemester.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function StudentSelectSemester() {
  // Departments from Admin
  const [departments, setDepartments] = useState([]); // [{_id, name, code}]
  const [deptCode, setDeptCode] = useState('');       // stream = department.code

  // Semesters & Sections (for selected dept)
  const [semesters, setSemesters] = useState([]);     // [{_id, semesterNum, sections:[...]}]
  const [semesterNum, setSemesterNum] = useState('');
  const [sections, setSections] = useState([]);
  const [section, setSection] = useState('');

  // Timetable data (section-specific)
  const [days, setDays] = useState(null);

  // Combined (general) timetable data for downloads
  const [combinedDays, setCombinedDays] = useState(null); // { Monday:[{...}], ... }

  // UI state
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingTT, setLoadingTT] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  // Load departments from Admin
  useEffect(() => {
    (async () => {
      try {
        setLoadingDepts(true);
        setErr(''); setMsg('');
        const r = await fetch(`${API}/api/admin/departments`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || data.message || 'Failed to load departments');
        const rows = (data.data || []).map(d => ({ _id: d._id, name: d.name, code: d.code }));
        setDepartments(rows);
        if (rows.length) {
          const firstCode = rows[0].code;
          setDeptCode(firstCode);
          await loadSemesters(firstCode);
        }
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoadingDepts(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load semesters that already have a generated timetable for a department code
  const loadSemesters = async (code) => {
    if (!code) return;
    setLoadingList(true);
    setErr(''); setMsg(''); setDays(null); setCombinedDays(null);
    try {
      const r = await fetch(`${API}/api/student/fetch-semesters`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ stream: code })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.message || 'Failed to fetch semesters');

      const rows = (data.data || []).slice().sort((a,b)=>a.semesterNum - b.semesterNum);
      setSemesters(rows);

      // Reset selections
      const semVal = rows.length ? String(rows[0].semesterNum) : '';
      setSemesterNum(semVal);
      const secs = rows.length ? (rows[0].sections || []) : [];
      setSections(secs);
      setSection(secs.length ? secs[0] : '');
      if (!rows.length) setMsg('No generated timetable available for this department yet.');
    } catch (e) {
      setErr(e.message);
      setSemesters([]); setSemesterNum(''); setSections([]); setSection('');
    } finally {
      setLoadingList(false);
    }
  };

  // When semester changes, refresh local section list
  useEffect(() => {
    if (!semesterNum) { setSections([]); setSection(''); setCombinedDays(null); return; }
    const found = semesters.find(s => String(s.semesterNum) === String(semesterNum));
    const secs = found?.sections || [];
    setSections(secs);
    if (secs.length && !secs.includes(section)) {
      setSection(secs[0]);
    }
    setCombinedDays(null);
  }, [semesterNum, semesters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTimetable = async (e) => {
    e.preventDefault();
    setErr(''); setMsg(''); setDays(null);
    if (!deptCode || !semesterNum || !section) {
      setErr('Please select department, semester and section.');
      return;
    }
    try {
      setLoadingTT(true);
      const r = await fetch(`${API}/api/student/timetable`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ stream: deptCode, semesterNum: Number(semesterNum), section })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.message || 'Failed to fetch timetable');

      setDays(data.data?.days || null);
      if (!data.data?.days) setMsg('No timetable found for the selected options.');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoadingTT(false);
    }
  };

  // Header times come from Monday
  const headerTimes = useMemo(() => {
    if (!days || !days.Monday) return [];
    return days.Monday.map(s => s.time);
  }, [days]);

  // ----- Combined (general) timetable helpers -----
  const ensureCombinedLoaded = async () => {
    if (combinedDays) return combinedDays;
    if (!deptCode || !semesterNum) throw new Error('Select department and semester first.');
    const r = await fetch(`${API}/api/student/timetable/combined`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ stream: deptCode, semesterNum: Number(semesterNum) })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || data.message || 'Failed to fetch combined timetable');
    setCombinedDays(data.data?.days || null);
    return data.data?.days || null;
  };

  const buildCellText = (slotBySection, orderedSections) => {
    if (!slotBySection || typeof slotBySection !== 'object') return '—';
    const parts = [];
    for (const sec of orderedSections) {
      const s = slotBySection[sec];
      if (s && (s.kind === 'theory' || s.kind === 'lab')) {
        const label = `${sec}: ${s.courseId ?? ''}${s.kind === 'lab' ? ' [Lab]' : ''}`;
        parts.push(label.trim());
      }
    }
    return parts.length ? parts.join(' | ') : '—';
  };

  // Download as CSV (Excel-friendly)
  const downloadCombinedCSV = async () => {
    try {
      setErr(''); setMsg(''); setDownloading(true);
      const daysCombined = await ensureCombinedLoaded();
      if (!daysCombined) throw new Error('No combined timetable available.');

      const orderedSections = sections.slice().sort(); // use current semester sections
      // header
      const times = (daysCombined.Monday || []).map(s => s.time);
      const header = ['Day', ...times];

      const rows = [header];
      for (const d of DAYS) {
        const slots = daysCombined[d] || [];
        const row = [d];
        for (const slot of slots) {
          if (slot.type === 'break') {
            row.push(slot.session || 'Break');
          } else {
            row.push(buildCellText(slot.bySection, orderedSections));
          }
        }
        rows.push(row);
      }

      const csv = rows
        .map(r => r.map(x => {
          const val = (x ?? '').toString();
          // escape quotes and wrap
          const escaped = `"${val.replace(/"/g, '""')}"`;
          return escaped;
        }).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deptCode}_Sem${semesterNum}_GeneralTimetable.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg('Downloaded CSV.');
    } catch (e) {
      setErr(e.message);
    } finally {
      setDownloading(false);
    }
  };

  // Download as PDF (via print-to-PDF)
 // Replace the existing downloadCombinedPDF with this:
const downloadCombinedPDF = async () => {
  try {
    setErr(''); setMsg(''); setDownloading(true);
    const daysCombined = await ensureCombinedLoaded();
    if (!daysCombined) throw new Error('No combined timetable available.');

    const orderedSections = sections.slice().sort();
    const times = (daysCombined.Monday || []).map(s => s.time);

    // Build printable HTML (same content you had before)
    const tableHead = `
      <tr>
        <th>Day</th>
        ${times.map(t => `<th>${t}</th>`).join('')}
      </tr>
    `;
    const tableBody = DAYS.map(d => {
      const slots = daysCombined[d] || [];
      const tds = slots.map(slot => {
        if (slot.type === 'break') {
          return `<td class="break">${(slot.session || 'Break')}</td>`;
        }
        const text = buildCellText(slot.bySection, orderedSections);
        return `<td>${text}</td>`;
      }).join('');
      return `<tr><td class="day">${d}</td>${tds}</tr>`;
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${deptCode} Sem ${semesterNum} — General Timetable</title>
  <style>
    @media print {
      @page { size: A4 landscape; margin: 12mm; }
    }
    body { font-family: Arial, sans-serif; color: #111; }
    h1 { font-size: 18px; margin: 0 0 10px; }
    .meta { font-size: 12px; margin: 0 0 12px; color: #444; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
    td.day { font-weight: 700; background: #fafafa; white-space: nowrap; }
    td.break { background: #fff7ed; font-weight: 700; }
  </style>
</head>
<body>
  <h1>General Timetable</h1>
  <p class="meta">Department: <b>${deptCode}</b> &nbsp;|&nbsp; Semester: <b>${semesterNum}</b> &nbsp;|&nbsp; Sections: <b>${sections.join(', ')}</b></p>
  <table>
    <thead>${tableHead}</thead>
    <tbody>${tableBody}</tbody>
  </table>
</body>
</html>
    `;

    // Create hidden iframe and print from it (no window.open)
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);

    const doc = frame.contentWindow || frame.contentDocument;
    const docEl = doc.document || doc;
    docEl.open();
    docEl.write(html);
    docEl.close();

    // Print when frame is ready
    frame.onload = () => {
      try {
        doc.focus();
        doc.print();
      } finally {
        // Remove the iframe after a short delay
        setTimeout(() => document.body.removeChild(frame), 800);
      }
    };
  } catch (e) {
    setErr(e.message);
  } finally {
    setDownloading(false);
  }
};


  return (
    <div className="student-tt-wrap">
      <div className="student-tt-card">
        <h2 className="title">View Timetable</h2>

        <form className="student-tt-form" onSubmit={fetchTimetable}>
          <div className="form-field">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={deptCode}
              onChange={e=>{ setDeptCode(e.target.value); loadSemesters(e.target.value); setDays(null); }}
              disabled={loadingDepts}
            >
              {!departments.length && <option value="">—</option>}
              {departments.map(d => (
                <option key={d._id} value={d.code}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Semester</label>
            <select
              className="form-select"
              value={semesterNum}
              onChange={e=>setSemesterNum(e.target.value)}
              disabled={!semesters.length || loadingList}
            >
              {!semesters.length && <option value="">—</option>}
              {semesters.map(s => (
                <option key={s._id} value={s.semesterNum}>{s.semesterNum}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Section</label>
            <select
              className="form-select"
              value={section}
              onChange={e=>setSection(e.target.value)}
              disabled={!sections.length || loadingList}
            >
              {!sections.length && <option value="">—</option>}
              {sections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          </div>

          <button
            type="submit"
            className="btn primary"
            disabled={loadingDepts || loadingList || loadingTT || !deptCode || !semesterNum || !section}
          >
            {loadingTT ? 'Loading…' : 'Show Timetable'}
          </button>
        </form>

        {/* Download general timetable (combined across sections) */}
        <div className="download-bar">
          <span className="download-label">Download General Timetable:</span>
          <button
            type="button"
            className="btn outline"
            onClick={downloadCombinedCSV}
            disabled={downloading || !deptCode || !semesterNum}
          >
            Excel (CSV)
          </button>
          <button
            type="button"
            className="btn outline"
            onClick={downloadCombinedPDF}
            disabled={downloading || !deptCode || !semesterNum}
          >
            PDF
          </button>
        </div>

        {(err || msg) && (
          <div className={`alert ${err ? 'error' : 'info'}`}>
            {err || msg}
          </div>
        )}

        {/* Section-specific timetable grid */}
        {days && (
          <div className="tt-scroll">
            <table className="tt-table">
              <thead>
                <tr>
                  <th className="tt-th">Day</th>
                  {headerTimes.map((t, i) => (
                    <th key={i} className="tt-th">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(d => (
                  <tr key={d}>
                    <td className="tt-day">{d}</td>
                    {(days[d] || []).map((slot, i) => {
                      if (slot.session && slot.session.kind === 'break') {
                        return <td key={i} className="tt-cell break">{slot.session.label}</td>;
                      }
                      const s = slot.session;
                      if (s && (s.kind === 'theory' || s.kind === 'lab')) {
                        return (
                          <td key={i} className="tt-cell class">
                            <div className="tt-code">{s.courseId || ''}</div>
                            <div className="tt-name">{s.courseName || ''}</div>
                            <div className="tt-meta">Sec {s.section} • {s.kind}</div>
                          </td>
                        );
                      }
                      return <td key={i} className="tt-cell free">—</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
