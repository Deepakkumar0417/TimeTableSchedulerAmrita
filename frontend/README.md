# Amrita College Time Table Scheduler

## Overview
The **Amrita College Time Table Scheduler** is a web application built to manage college timetables. The system supports three main user roles:

- **Admin**: Manages semesters, departments, and subjects.
- **Teacher**: Logs in to select subjects and generate their own timetable.
- **Student**: Views the final timetable for a selected semester and department.

## Technologies Used

- **Frontend**: 
  - MERN Stack (MongoDB, Express, React, Node.js)
  - CSS, Bootstrap, JavaScript
  - AJAX

- **Backend**:
  - Node.js with Express (in `server.js`)
  - Python Flask (for certain routes if necessary)

- **Database**: MongoDB (to store data for semesters, departments, subjects, and timetables)

## Features

### Admin Features:
- Admin login and full access to create/manage:
  - Semesters
  - Departments for each semester
  - Subjects with attributes like Subject Name, Subject ID, Theory Hours, and Lab Hours.
- Admin can view all timetables.

### Teacher Features:
- Teacher signup and login.
- After login, the teacher selects a semester and department.
- Teachers choose subjects and save their preferences.
- A personalized timetable is generated for the teacher.

### Student Features:
- No login required.
- Students can select a semester and department.
- The timetable is displayed once all the subjects are assigned.

### Constraints:
- A subject's theory and lab hours should not overlap with other subjects' schedules.

## Routes Overview (Backend - `server.js`)

The backend routes are defined in `server.js` to manage the interactions between the frontend and the MongoDB database.

### Admin Routes:
- `POST /admin/login`: Admin login.
- `POST /admin/createSemester`: Create a new semester.
- `POST /admin/createDepartment`: Create a new department under a semester.
- `POST /admin/createSubject`: Create a new subject under a department.
- `GET /admin/viewTimetables`: View all generated timetables.

### Teacher Routes:
- `POST /teacher/signup`: Signup for new teachers with their details.
- `POST /teacher/login`: Teacher login using their ID and password.
- `GET /teacher/selectSemester`: Select a semester.
- `GET /teacher/selectDepartment`: Select a department.
- `POST /teacher/savePreferences`: Save teacher preferences for subjects.
- `GET /teacher/viewTimetable`: View the generated timetable for the teacher.

### Student Routes:
- `GET /student/viewTimetable`: Students view the timetable based on selected semester and department.

## Database Schema

- **Semester**: Contains semester-related data like `semesterName`.
- **Department**: Contains department details like `departmentName` and is linked to a semester.
- **Subject**: Contains subject details such as `subjectName`, `theoryHours`, and `labHours`.
- **Timetable**: Stores the generated timetable for each department and semester, including the subjects assigned to each teacher.

## Setup Instructions

1. **Clone the repository**:
    ```bash
    git clone https://github.com/your-repo/amrita-college-timetable-scheduler.git
    cd amrita-college-timetable-scheduler
    ```

2. **Install dependencies**:
    - Backend (Node.js):
      ```bash
      cd backend
      npm install
      ```
    - Frontend (React):
      ```bash
      cd frontend
      npm install
      ```

3. **Set up MongoDB**: Ensure MongoDB is installed and running locally or set up a MongoDB Atlas cluster.

4. **Run the server**:
    ```bash
    cd backend
    node server.js
    ```

5. **Run the frontend**:
    ```bash
    cd frontend
    npm start
    ```

## Contribution

Feel free to fork the repository and make pull requests for new features or bug fixes.

## License

This project is licensed under the MIT License.

