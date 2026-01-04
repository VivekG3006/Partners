import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts';
import ChatFeature from './features/chat';
import ActivityFeed from './features/activity/ActivityFeed';
import CalendarView from './features/calendar/CalendarView';

const TeamsFeature = () => <div className="p-4">Teams Feature Placeholder</div>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<ChatFeature />} />
          <Route path="teams" element={<TeamsFeature />} />
          <Route path="activity" element={<ActivityFeed />} />
          <Route path="calendar" element={<CalendarView />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
