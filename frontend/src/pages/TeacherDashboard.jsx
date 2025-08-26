import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import './TeacherDashboard.css';
import TeacherHeader from './TeacherHeader.jsx';

export default function TeacherDashboard() {
  useEffect(() => {
    document.body.classList.add('teacher-dashboard');
    return () => document.body.classList.remove('teacher-dashboard');
  }, []);

  const navigate = useNavigate();

  const ui = (
    <div className="td-viewport">
       <TeacherHeader />
      <section className="td-card">
        <h2 className="td-title">Teacher Dashboard</h2>
        <p className="td-sub">Welcome! Choose an action below.</p>

        <div className="td-actions">
          <button className="td-btn primary" onClick={() => navigate('/teacher/enroll')}>
            Enroll in Semester
          </button>
          <button className="td-btn secondary" onClick={() => navigate('/teacher/timetable')}>
            View Timetable
          </button>
        </div>
      </section>
    </div>
  );

  return createPortal(ui, document.body);
}
