
import { useNavigate } from 'react-router-dom';
import './StudentLogin.css';

const StudentLogin = () => {
  const navigate = useNavigate();

  // After student clicks login, navigate to the select semester page
  const handleLogin = () => {
    navigate('/student/select-semester');
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <h1 className="login-title">Student Login</h1>
        <div className="login-button-container">
          <button
            className="login-button"
            onClick={handleLogin}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;