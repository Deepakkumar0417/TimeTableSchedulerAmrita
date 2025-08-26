// App.jsx
import './App.css';
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home.jsx';
import AdminSignin from './pages/AdminSignin.jsx';
import AdminHome from './pages/AdminHome.jsx';
import TeacherSignin from './pages/TeacherSignin.jsx';
import TeacherSignup from './pages/TeacherSignup.jsx';
import CreateSemester from './pages/CreateSemester.jsx';
import ViewSemester from './pages/ViewSemester.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import EnrollSemester from './pages/EnrollSemester.jsx';
import StudentLogin from './pages/StudentLogin.jsx';
import StudentSelectSemester from './pages/StudentSelectSemester.jsx';
import AdminEditSemester from './pages/AdminEditSemester.jsx';

// NEW admin pages
import AdminDegrees from './pages/AdminDegrees.jsx';
import AdminDepartments from './pages/AdminDepartments.jsx';
import AdminCohorts from './pages/AdminCohorts.jsx';
import AdminCreateSemesterV2 from './pages/AdminCreateSemesterV2.jsx';
import AdminQueries from './pages/AdminQueries.jsx';
import TeacherProfile from './pages/TeacherProfile.jsx';
import TeacherTimetable from './pages/TeacherTimetable.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminSignin />} />
      <Route path="/admin/home" element={<AdminHome />} />
      <Route path="/admin/degrees" element={<AdminDegrees />} />
      <Route path="/admin/departments" element={<AdminDepartments />} />
      <Route path="/admin/cohorts" element={<AdminCohorts />} />
      <Route path="/admin/semesters/create" element={<AdminCreateSemesterV2 />} />
      <Route path="/admin/create" element={<CreateSemester />} /> {/* legacy */}
      <Route path="/admin/view" element={<ViewSemester />} />
      {/* alias so /admin/semesters also opens the list */}
      <Route path="/admin/semesters" element={<ViewSemester />} />

      <Route path="/admin/queries" element={<AdminQueries />} />

      {/* FIX: route must match /admin/semesters/:id/edit */}
      <Route path="/admin/semesters/:id/edit" element={<AdminEditSemester />} />
      {/* optional: keep old pattern too, if some buttons still use it */}
      <Route path="/admin/semesters/edit/:id" element={<AdminEditSemester />} />

      {/* Teacher */}
      <Route path="/teacher/login" element={<TeacherSignin />} />
      <Route path="/teacher/signup" element={<TeacherSignup />} />
      <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
      <Route path="/teacher/enroll" element={<EnrollSemester />} />
      <Route path="/teacher/profile" element={<TeacherProfile />} />
      <Route path="/teacher/timetable/:semesterId" element={<TeacherTimetable />} />
      <Route path="/teacher/timetable" element={<TeacherTimetable />} />

      {/* Student */}
      <Route path="/timetable/public" element={<StudentLogin />} />
      <Route path="/timetable/generate" element={<StudentLogin />} />
      <Route path="/student/select-semester" element={<StudentSelectSemester />} />
    </Routes>
  );
}

export default App;
