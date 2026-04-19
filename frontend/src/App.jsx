import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { IslandsProvider } from './contexts/IslandsContext';

// Features
import Login from './features/auth/Login';
import SignUp from './features/auth/SignUp';
import Welcome from './features/auth/Welcome';
import Dashboard from './features/dashboard/Dashboard';
import Practice from './features/practice/WordPractice';
import PracticeSession from './features/practice/WordPracticeSession';
import StudyIsland from './features/study/StudyIsland';
import StudySession from './features/study/StudySession';
import IslandsHub from './features/islands/IslandsHub';
import IslandOverview from './features/islands/IslandOverview';
import ChainSession from './features/islands/ChainSession';
import ReplyQuestSession from './features/islands/ReplyQuestSession';
import ConverseHub from './features/islands/ConverseHub';
import Settings from './features/settings/Settings';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('handspeak_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('handspeak_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('handspeak_study_progress');
    setUser(null);
  };

  const handleProfileComplete = (profile) => {
    localStorage.setItem('handspeak_user', JSON.stringify(profile));
    setUser(profile);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f8ff] flex-col gap-3">
        <div className="w-8 h-8 border-4 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#546e7a] font-semibold">Loading HandSpeak...</p>
      </div>
    );
  }

  const guard = (element) => (user ? element : <Navigate to="/" />);

  return (
    <IslandsProvider>
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* Auth */}
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />
          <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <SignUp onLogin={handleLogin} />} />

          {/* Onboarding */}
          <Route path="/welcome" element={user ? <Welcome user={user} onProfileComplete={handleProfileComplete} /> : <Navigate to="/" />} />

          {/* Main hub */}
          <Route path="/dashboard" element={guard(<Dashboard user={user} />)} />

          {/* Unified Islands journey — Phase 1 */}
          <Route path="/islands" element={guard(<IslandsHub />)} />
          <Route path="/islands/:islandId" element={guard(<IslandOverview />)} />
          <Route path="/islands/:islandId/converse" element={guard(<ConverseHub />)} />
          <Route path="/islands/:islandId/converse/reply-quest" element={guard(<ReplyQuestSession />)} />
          <Route path="/islands/:islandId/converse/chains" element={guard(<ChainSession />)} />

          {/* Learn mode (reuses existing Study Voyage screens under the Islands journey) */}
          <Route path="/study" element={<Navigate to="/islands" replace />} />
          <Route path="/study/:islandId" element={guard(<StudyIsland />)} />
          <Route path="/study/:islandId/level/:levelId" element={guard(<StudySession />)} />

          {/* Drill mode (reuses existing WordPractice flow) */}
          <Route path="/practice" element={guard(<Practice />)} />
          <Route path="/practice/:wordId" element={guard(<PracticeSession />)} />

          {/* Settings */}
          <Route path="/settings" element={guard(<Settings user={user} onLogout={handleLogout} />)} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
    </IslandsProvider>
  );
}

export default App;
