import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import './TeacherSignup.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function TeacherSignup() {
  useEffect(() => {
    document.body.classList.add('teacher-signup');
    return () => document.body.classList.remove('teacher-signup');
  }, []);

  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    name: '', phonenumber: '', department: ''
  });

  // NEW: departments from Admin
  const [deps, setDeps] = useState([]);
  const [depsLoading, setDepsLoading] = useState(true);
  const [depsError, setDepsError] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // NEW: fetch departments created by Admin
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/admin/departments`);
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || 'Failed to load departments');
        const rows = Array.isArray(data.data) ? data.data : [];
        setDeps(rows);
        if (rows.length && !formData.department) {
          // store department CODE in teacher record (e.g., CSE)
          setFormData(f => ({ ...f, department: rows[0].code }));
        }
      } catch (e) {
        setDepsError(e.message || 'Could not load departments');
      } finally {
        setDepsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    if (formData.password !== formData.confirmPassword) {
      setLoading(false); setError('Passwords do not match!'); return;
    }
    try {
      const res = await fetch(`${API}/api/teacher/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'An error occurred during signup.');
      setSuccess(data.message || 'Teacher account created successfully!');
      setFormData({ email:'', password:'', confirmPassword:'', name:'', phonenumber:'', department:'' });
      navigate('/teacher/login');
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const ui = (
    <div className="tsp-viewport">
      <div className="tsp-card">
        <h2 className="tsp-title">Teacher Signup</h2>

        {error && <div className="tsp-msg error">{error}</div>}
        {success && <div className="tsp-msg success">{success}</div>}

        <form onSubmit={handleSubmit} className="tsp-form" noValidate>
          <div className="grid-two">
            <div className="tsp-field">
              <label className="tsp-label" htmlFor="name">Full Name</label>
              <input id="name" name="name" className="tsp-input" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="tsp-field">
              <label className="tsp-label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="tsp-input" value={formData.email} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid-two">
            <div className="tsp-field">
              <label className="tsp-label" htmlFor="phonenumber">Phone Number</label>
              <input id="phonenumber" name="phonenumber" className="tsp-input" value={formData.phonenumber} onChange={handleChange} required />
            </div>

            <div className="tsp-field">
              <label className="tsp-label" htmlFor="department">Department</label>
              <select
                id="department"
                name="department"
                className="tsp-select"
                value={formData.department}
                onChange={handleChange}
                required
                disabled={depsLoading || !!depsError}
              >
                {depsLoading && <option value="">Loading departments…</option>}
                {!depsLoading && !depsError && deps.length === 0 && (
                  <option value="">No departments yet (ask Admin)</option>
                )}
                {!depsLoading && !depsError && deps.map(d => (
                  <option key={d._id} value={d.code}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
              {depsError && <div className="tsp-hint">⚠ {depsError}</div>}
            </div>
          </div>

          <div className="grid-two">
            <div className="tsp-field">
              <label className="tsp-label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="tsp-input" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="tsp-field">
              <label className="tsp-label" htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" className="tsp-input" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
          </div>

          <button className="tsp-btn primary" type="submit" disabled={loading || depsLoading}>
            {loading ? 'Signing Up…' : 'Sign Up'}
          </button>

          <div className="tsp-bottom">
            Already have an account? <Link to="/teacher/login">Login here</Link>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
