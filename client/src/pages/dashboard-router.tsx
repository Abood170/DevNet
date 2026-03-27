import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import DeveloperDashboard from "@/pages/developer-dashboard";
import EmployerDashboard from "@/pages/employer-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";

export default function DashboardRouter() {
  const { user } = useAuth();

  if (!user) {
    return <></>;
  }

  switch (user.role) {
    case UserRole.ADMIN:
      return <AdminDashboard />;
    case UserRole.EMPLOYER:
      return <EmployerDashboard />;
    case UserRole.DEVELOPER:
    default:
      return <DeveloperDashboard />;
  }
}
