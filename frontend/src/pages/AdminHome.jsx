import { useNavigate } from 'react-router-dom';
import './AdminHome.css';

const AdminHome = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-shell">
      <div className="admin-card">
        <h2 className="admin-title">Welcome, Admin</h2>
        <p className="admin-subtitle">Manage programs, departments, semesters, and queries</p>

        {/* Setup */}
        <h3 className="admin-section-title">Setup</h3>
        <div className="admin-btn-grid">
          <button className="admin-btn" onClick={() => navigate('/admin/degrees')}>
            Degrees
          </button>
          <button className="admin-btn" onClick={() => navigate('/admin/departments')}>
            Departments
          </button>
          <button className="admin-btn" onClick={() => navigate('/admin/cohorts')}>
            Program Cohorts
          </button>
        </div>

        {/* Semesters */}
        <h3 className="admin-section-title">Semesters</h3>
        <div className="admin-btn-grid">
          <button
            className="admin-btn primary"
            onClick={() => navigate('/admin/semesters/create')}
            title="Includes sections, odd/even guided semester number, and L/T/P"
          >
            Create Semester (New)
          </button>
          <button className="admin-btn" onClick={() => navigate('/admin/view')}>
            View Created Semesters
          </button>
          {/* keep legacy page optional */}
          <button
            className="admin-btn ghost"
            onClick={() => navigate('/admin/create')}
            title="Legacy create (stream/year only)"
          >
            Create Semester (Legacy)
          </button>
        </div>

        {/* Support */}
        <h3 className="admin-section-title">Support</h3>
        <div className="admin-btn-grid">
          <button className="admin-btn" onClick={() => navigate('/admin/queries')}>
            Queries Inbox
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;
