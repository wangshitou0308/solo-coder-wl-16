import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import ResidentHome from './pages/resident/Home';
import ResidentAppointments from './pages/resident/Appointments';
import ResidentAppointmentForm from './pages/resident/AppointmentForm';
import ResidentAppointmentDetail from './pages/resident/AppointmentDetail';
import ResidentPoints from './pages/resident/Points';
import ResidentExchange from './pages/resident/Exchange';
import CollectorTasks from './pages/collector/Tasks';
import CollectorTaskDetail from './pages/collector/TaskDetail';
import CollectorStats from './pages/collector/Stats';
import AdminDashboard from './pages/admin/Dashboard';
import AdminDataScreen from './pages/admin/DataScreen';
import AdminAppointments from './pages/admin/Appointments';
import AdminUsers from './pages/admin/Users';
import AdminExchange from './pages/admin/Exchange';

function App() {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    if (location.pathname !== '/login') {
      return <Navigate to="/login" replace />;
    }
    return <Login />;
  }

  const getDefaultRoute = () => {
    switch (user.role) {
      case 'resident':
        return '/resident/home';
      case 'collector':
        return '/collector/tasks';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/login';
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to={getDefaultRoute()} replace />} />
        <Route path="resident/home" element={<ResidentHome />} />
        <Route path="resident/appointments" element={<ResidentAppointments />} />
        <Route path="resident/appointments/new" element={<ResidentAppointmentForm />} />
        <Route path="resident/appointments/:id" element={<ResidentAppointmentDetail />} />
        <Route path="resident/points" element={<ResidentPoints />} />
        <Route path="resident/exchange" element={<ResidentExchange />} />
        <Route path="collector/tasks" element={<CollectorTasks />} />
        <Route path="collector/tasks/:id" element={<CollectorTaskDetail />} />
        <Route path="collector/stats" element={<CollectorStats />} />
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route path="admin/data-screen" element={<AdminDataScreen />} />
        <Route path="admin/appointments" element={<AdminAppointments />} />
        <Route path="admin/users" element={<AdminUsers />} />
        <Route path="admin/exchange" element={<AdminExchange />} />
        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Route>
    </Routes>
  );
}

export default App;
