import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts';
import ChatFeature from './features/chat';

const TeamsFeature = () => <div className="p-4">Teams Feature Placeholder</div>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<ChatFeature />} />
          <Route path="teams" element={<TeamsFeature />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
