import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';   // <-- add this
import './AdminSignin.css';

export default function AdminSignin() {
  useEffect(() => {
    document.body.classList.add('admin-signin');
    return () => document.body.classList.remove('admin-signin');
  }, []);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await fetch('http://localhost:5000/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!r.ok) throw new Error('Invalid credentials');
      await r.json();
      navigate('/admin/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ui = (
    <div className="signin-viewport">
      <div className="signin-container">
        <h2 className="signin-title">College Admin Login</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email"
                   className="form-input" placeholder="Enter your email"
                   value={formData.email} onChange={handleChange}/>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password"
                   className="form-input" placeholder="Enter your password"
                   value={formData.password} onChange={handleChange}/>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="signin-button" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );

  // ⬇️ This is the key line
  return createPortal(ui, document.body);
}
