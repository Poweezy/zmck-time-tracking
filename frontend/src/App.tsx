import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import TimeTracking from './pages/TimeTracking';
import Approvals from './pages/Approvals';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import MyTasks from './pages/MyTasks';
import Calendar from './pages/Calendar';
import Timeline from './pages/Timeline';
import Workload from './pages/Workload';
import Expenses from './pages/Expenses';
import Invoices from './pages/Invoices';
import Budget from './pages/Budget';
import ProjectDetail from './pages/ProjectDetail';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="time-tracking" element={<TimeTracking />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="users" element={<Users />} />
          <Route path="my-tasks" element={<MyTasks />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="workload" element={<Workload />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="budget" element={<Budget />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

