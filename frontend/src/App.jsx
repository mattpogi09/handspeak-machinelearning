import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Features
import Login from './features/auth/Login';
import SignUp from './features/auth/SignUp';
import Welcome from './features/auth/Welcome';
import Dashboard from './features/dashboard/Dashboard';
import Practice from './features/practice/WordPractice';
import PracticeSession from './features/practice/WordPracticeSession';
import Study from './features/study/Study';
import StudyIsland from './features/study/StudyIsland';
import StudySession from './features/study/StudySession';
import Settings from './features/settings/Settings';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const stored = localStorage.getItem('handspeak_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleProfileComplete = (profile) => {
    // Optional: update user state with profile
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f8ff] flex-col gap-3">
        <div className="w-8 h-8 border-4 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#546e7a] font-semibold">Loading HandSpeak...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* Auth */}
          <Route
            path="/"
            element={
              user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
            }
          />
          <Route
            path="/signup"
            element={
              user ? <Navigate to="/dashboard" /> : <SignUp onLogin={handleLogin} />
            }
          />

          {/* Onboarding */}
          <Route
            path="/welcome"
            element={
              user ? (
                <Welcome user={user} onProfileComplete={handleProfileComplete} />
              ) : (
                <Navigate to="/" />
              )
            }
          />

          {/* Main app */}
          <Route
            path="/dashboard"
            element={user ? <Dashboard user={user} /> : <Navigate to="/" />}
          />

          {/* Practice */}
          <Route
            path="/practice"
            element={user ? <Practice /> : <Navigate to="/" />}
          />
          <Route path="/practice/:wordId" element={user ? <PracticeSession /> : <Navigate to="/" />} />

          {/* Study */}
          <Route
            path="/study"
            element={user ? <Study /> : <Navigate to="/" />}
          />
          <Route
            path="/study/:islandId"
            element={user ? <StudyIsland /> : <Navigate to="/" />}
          />
          <Route
            path="/study/:islandId/level/:levelId"
            element={user ? <StudySession /> : <Navigate to="/" />}
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              user ? <Settings onLogout={handleLogout} /> : <Navigate to="/" />
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
