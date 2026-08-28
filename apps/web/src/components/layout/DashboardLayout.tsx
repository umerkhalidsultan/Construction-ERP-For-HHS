import {
  Building2,
  BriefcaseBusiness,
  CalendarClock,
  ContactRound,
  FolderKanban,
  GitBranch,
  KeyRound,
  Layers3,
  LayoutDashboard,
  LogOut,
  Network,
  Palette,
  Settings2,
  Tags,
  Target,
  FileCheck2,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { logout as logoutRequest } from "../../services/auth.service";
import { useAuthStore } from "../../store/auth.store";
import { useActiveCompanyContext } from "../../hooks/useActiveCompanyContext";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

export function DashboardLayout() {
  const navigate = useNavigate();
  const params = useParams();
  const { user, activeCompany, logout } = useAuthStore();
  useActiveCompanyContext();
  const companyId = params.companyId ?? activeCompany?.id;

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/companies", label: "Companies", icon: Building2 },
    ...(companyId
      ? [
          {
            to: `/companies/${companyId}`,
            label: "Company Profile",
            icon: Building2,
          },
          {
            to: `/companies/${companyId}/projects`,
            label: "Projects",
            icon: FolderKanban,
          },
          {
            to: `/companies/${companyId}/crm/dashboard`,
            label: "CRM · Dashboard",
            icon: TrendingUp,
          },
          {
            to: `/companies/${companyId}/crm/leads`,
            label: "CRM · Leads",
            icon: BriefcaseBusiness,
          },
          {
            to: `/companies/${companyId}/crm/opportunities`,
            label: "CRM · Opportunities",
            icon: Target,
          },
          {
            to: `/companies/${companyId}/tenders`,
            label: "Pre-Construction · Tenders",
            icon: FileCheck2,
          },
          {
            to: `/companies/${companyId}/tenders/dashboard`,
            label: "Tender Dashboard",
            icon: FileCheck2,
          },
          {
            to: `/companies/${companyId}/crm/companies`,
            label: "CRM · Companies",
            icon: Building2,
          },
          {
            to: `/companies/${companyId}/crm/contacts`,
            label: "CRM · Contacts",
            icon: ContactRound,
          },
          {
            to: `/companies/${companyId}/crm/activities`,
            label: "CRM · Activities",
            icon: CalendarClock,
          },
          {
            to: `/companies/${companyId}/employees`,
            label: "Employees",
            icon: Users,
          },
          {
            to: `/companies/${companyId}/settings`,
            label: "Settings",
            icon: Settings2,
          },
          {
            to: `/companies/${companyId}/branding`,
            label: "Branding",
            icon: Palette,
          },
          {
            to: `/companies/${companyId}/branches`,
            label: "Branches",
            icon: GitBranch,
          },
          {
            to: `/companies/${companyId}/departments`,
            label: "Departments",
            icon: Layers3,
          },
          {
            to: `/companies/${companyId}/designations`,
            label: "Designations",
            icon: Tags,
          },
          {
            to: `/companies/${companyId}/cost-centers`,
            label: "Cost Centers",
            icon: WalletCards,
          },
          {
            to: `/companies/${companyId}/organization-chart`,
            label: "Org Chart",
            icon: Network,
          },
          {
            to: `/companies/${companyId}/numbering`,
            label: "Numbering",
            icon: Users,
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Local logout remains authoritative if the API call fails.
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <div>
            <p className="text-sm font-semibold text-primary-700">HHS ERP</p>
            <p className="text-xs text-slate-500">Construction Operations</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === `/companies/${companyId}`}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-primary-50 text-primary-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {activeCompany?.displayName ?? "Platform Administration"}
            </p>
            <p className="text-xs text-slate-500">
              {user?.email}
              {user?.isPlatformAdmin ? " · Platform Admin" : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <NavLink
              to="/account/password"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">Change password</span>
            </NavLink>
            <Button variant="ghost" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
