import React from 'react';
import { Navigate } from 'react-router-dom';
import { StudentLeaderboard } from '../components/StudentLeaderboard';

export function Leaderboard() {
  const userRole = localStorage.getItem('userRole') || 'student';

  // Strictly enforce admin only
  if (userRole !== 'admin') {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <StudentLeaderboard embedded={false} />
    </div>
  );
}
