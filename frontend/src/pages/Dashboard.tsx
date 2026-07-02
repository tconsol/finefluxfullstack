import { useAuth } from '@/contexts/AuthContext';
import { OwnerDashboard } from '@/components/dashboard/OwnerDashboard';
import { ManagerDashboard } from '@/components/dashboard/ManagerDashboard';
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'owner':
      return <OwnerDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'employee':
      return <EmployeeDashboard />;
    default:
      return <div>Invalid user role</div>;
  }
}