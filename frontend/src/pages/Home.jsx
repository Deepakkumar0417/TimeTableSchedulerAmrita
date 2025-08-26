import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ✅ Correct way to reference images from public folder
  const backgroundImages = [
    '/aseb.jpg',
    '/asec.jpg',
    '/asea.jpg',
    '/asee.jpg'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        (prevIndex + 1) % backgroundImages.length
      );
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  return (
    <div
      className="home-background"
      style={{
        backgroundImage: `url(${backgroundImages[currentImageIndex]})`,
        transition: 'background-image 1s ease-in-out',
      }}
    >
      <div className="home-container">
        {/* Left Half - Welcome Text */}
        <div className="welcome-section">
          <h1>
            WELCOME TO
            <span className="highlight">
              AMRITA TIME TABLE SCHEDULER
            </span>
          </h1>
        </div>

        {/* Right Half - Login Buttons */}
        <div className="login-section">
          <button onClick={() => navigate('/admin/login')}>
            COLLEGE ADMIN LOGIN
          </button>

          <button onClick={() => navigate('/teacher/login')}>
            TEACHER LOGIN
          </button>

          <button onClick={() => navigate('/student/select-semester')}>
            STUDENT LOGIN
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;