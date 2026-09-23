import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { StudentDirectory } from './pages/StudentDirectory';
import { AddStudent } from './pages/AddStudent';
import { StudentPortal } from './pages/StudentPortal';
import { Login } from './pages/Login';
import { TeacherDirectory } from './pages/TeacherDirectory';
import { AddTeacher } from './pages/AddTeacher';
import { Settings } from './pages/Settings';
import { AssignmentFlow } from './pages/AssignmentFlow';
import { Analytics } from './pages/Analytics';
import { EnterTrial } from './pages/EnterTrial';
import { MyStudents } from './pages/MyStudents';

function DirectStudentRedirect() {
  const { studentId } = useParams();
  if (studentId) {
    localStorage.setItem('userRole', 'student');
    localStorage.setItem('currentUserId', studentId);
    return <Navigate to={`/portal?studentId=${studentId}`} replace />;
  }
  return <Navigate to="/portal" replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const userRole = localStorage.getItem('userRole');
  const location = useLocation();

  // If a studentId/id is in query params (e.g. shared link via WhatsApp/SMS/Web), grant instant access
  const searchParams = new URLSearchParams(location.search);
  const directStudentId = searchParams.get('studentId') || searchParams.get('id') || searchParams.get('student');
  if (directStudentId) {
    if (localStorage.getItem('currentUserId') !== directStudentId || localStorage.getItem('userRole') !== 'student') {
      localStorage.setItem('userRole', 'student');
      localStorage.setItem('currentUserId', directStudentId);
    }
    return <>{children}</>;
  }

  if (!userRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Direct Public Student Sharing Routes (Zero-barrier for students & parents) */}
        <Route path="/p/:studentId" element={<DirectStudentRedirect />} />
        <Route path="/program/:studentId" element={<DirectStudentRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/teachers" element={<TeacherDirectory />} />
                <Route path="/teachers/new" element={<AddTeacher />} />
                <Route path="/students" element={<StudentDirectory />} />
                <Route path="/students/new" element={<AddStudent />} />
                <Route path="/my-students" element={<MyStudents />} />
                <Route path="/portal" element={<StudentPortal />} />
                <Route path="/assignments" element={<AssignmentFlow />} />
                <Route path="/enter-trial" element={<EnterTrial />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}
