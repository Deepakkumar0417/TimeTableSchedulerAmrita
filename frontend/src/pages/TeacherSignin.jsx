import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import './TeacherSignin.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';


export default function TeacherSignin() {
  useEffect(() => {
    document.body.classList.add('teacher-signin');
    return () => document.body.classList.remove('teacher-signin');
  }, []);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);
  try {
    const res = await fetch(`${API}/api/teacher/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',                      // set httpOnly cookie (jwt)
      body: JSON.stringify({
        email: formData.email,
        password: formData.password
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Login failed');

    // IMPORTANT: keep a copy of the token for Authorization header usage
    if (data.token) localStorage.setItem('tt_token', data.token);

    // go somewhere after login
    navigate('/teacher/dashboard'); // or '/teacher/dashboard'
  } catch (err) {
    setError(err.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};

  const ui = (
    <div className="ts-viewport">
      <div className="ts-card">
        <h2 className="ts-title">Teacher Login</h2>

        {error && <div className="ts-msg error">{error}</div>}
        {success && <div className="ts-msg success">{success}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="ts-field">
            <label className="ts-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="ts-input"
                   placeholder="Enter your email" value={formData.email}
                   onChange={handleChange} required />
          </div>

          <div className="ts-field">
            <label className="ts-label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="ts-input"
                   placeholder="Enter your password" value={formData.password}
                   onChange={handleChange} required />
          </div>

          <Link to="/teacher/signup" className="ts-link">Don’t have an account?</Link>

          <button className="ts-btn primary" type="submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
