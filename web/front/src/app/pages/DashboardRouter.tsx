import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import DoctorDashboard from './DoctorDashboard';
import PatientDashboard from './PatientDashboard';

export default function DashboardRouter() {
  const { user } = useAuth();

  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'medecin':
      return <DoctorDashboard />;
    case 'patient':
      return <PatientDashboard />;
    default:
      return <div>Invalid role</div>;
  }
}
