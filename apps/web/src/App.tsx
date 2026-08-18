import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ApiError } from "./lib/api-client";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { CompanyBrandingPage } from "./pages/companies/CompanyBrandingPage";
import { CompanyDetailPage } from "./pages/companies/CompanyDetailPage";
import { CompanyFormPage } from "./pages/companies/CompanyFormPage";
import { CompanyListPage } from "./pages/companies/CompanyListPage";
import { CompanySettingsPage } from "./pages/companies/CompanySettingsPage";
import { DocumentNumberingPage } from "./pages/companies/DocumentNumberingPage";
import { OrgEntityPage } from "./pages/companies/OrgEntityPage";
import { OrganizationChartPage } from "./pages/companies/OrganizationChartPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ProjectCalendarPage } from "./pages/projects/ProjectCalendarPage";
import { ProjectDashboardPage } from "./pages/projects/ProjectDashboardPage";
import { ProjectDocumentsPage } from "./pages/projects/ProjectDocumentsPage";
import { ProjectFormPage } from "./pages/projects/ProjectFormPage";
import { ProjectLayout } from "./pages/projects/ProjectLayout";
import { ProjectListPage } from "./pages/projects/ProjectListPage";
import { ProjectMilestonesPage } from "./pages/projects/ProjectMilestonesPage";
import { ProjectOverviewPage } from "./pages/projects/ProjectOverviewPage";
import { ProjectPhasesPage } from "./pages/projects/ProjectPhasesPage";
import { ProjectSettingsPage } from "./pages/projects/ProjectSettingsPage";
import { ProjectTeamPage } from "./pages/projects/ProjectTeamPage";
import { ProjectTimelinePage } from "./pages/projects/ProjectTimelinePage";
import { ProjectPlanningPage } from "./pages/projects/ProjectPlanningPage";
import { EmployeeDetailPage } from "./pages/workforce/EmployeeDetailPage";
import { EmployeeFormPage } from "./pages/workforce/EmployeeFormPage";
import { EmployeeListPage } from "./pages/workforce/EmployeeListPage";
import { WorkforceOrganizationChartPage } from "./pages/workforce/WorkforceOrganizationChartPage";
import { ProjectQualityPage } from "./pages/quality/ProjectQualityPage";
import { LeadListPage } from "./pages/crm/LeadListPage";
import { LeadFormPage } from "./pages/crm/LeadFormPage";
import { LeadDetailPage } from "./pages/crm/LeadDetailPage";
import { PartyListPage } from "./pages/crm/PartyListPage";
import { PartyFormPage } from "./pages/crm/PartyFormPage";
import { PartyDetailPage } from "./pages/crm/PartyDetailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (
          error instanceof ApiError &&
          error.status > 0 &&
          error.status < 500
        ) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/companies" element={<CompanyListPage />} />
              <Route path="/companies/new" element={<CompanyFormPage />} />
              <Route
                path="/companies/:companyId"
                element={<CompanyDetailPage />}
              />
              <Route
                path="/companies/:companyId/edit"
                element={<CompanyFormPage />}
              />
              <Route
                path="/companies/:companyId/settings"
                element={<CompanySettingsPage />}
              />
              <Route
                path="/companies/:companyId/branding"
                element={<CompanyBrandingPage />}
              />
              <Route
                path="/companies/:companyId/branches"
                element={<OrgEntityPage kind="branches" />}
              />
              <Route
                path="/companies/:companyId/departments"
                element={<OrgEntityPage kind="departments" />}
              />
              <Route
                path="/companies/:companyId/designations"
                element={<OrgEntityPage kind="designations" />}
              />
              <Route
                path="/companies/:companyId/cost-centers"
                element={<OrgEntityPage kind="cost-centers" />}
              />
              <Route
                path="/companies/:companyId/organization-chart"
                element={<OrganizationChartPage />}
              />
              <Route
                path="/companies/:companyId/numbering"
                element={<DocumentNumberingPage />}
              />
              <Route
                path="/companies/:companyId/projects"
                element={<ProjectListPage />}
              />
              <Route
                path="/companies/:companyId/employees"
                element={<EmployeeListPage />}
              />
              <Route
                path="/companies/:companyId/crm/leads"
                element={<LeadListPage />}
              />
              <Route
                path="/companies/:companyId/crm/leads/new"
                element={<LeadFormPage />}
              />
              <Route
                path="/companies/:companyId/crm/leads/:leadId"
                element={<LeadDetailPage />}
              />
              <Route
                path="/companies/:companyId/crm/leads/:leadId/edit"
                element={<LeadFormPage />}
              />
              <Route path="/companies/:companyId/crm/companies" element={<PartyListPage kind="companies" />} />
              <Route path="/companies/:companyId/crm/companies/new" element={<PartyFormPage kind="company" />} />
              <Route path="/companies/:companyId/crm/companies/:partyId" element={<PartyDetailPage kind="company" />} />
              <Route path="/companies/:companyId/crm/companies/:partyId/edit" element={<PartyFormPage kind="company" />} />
              <Route path="/companies/:companyId/crm/contacts" element={<PartyListPage kind="contacts" />} />
              <Route path="/companies/:companyId/crm/contacts/new" element={<PartyFormPage kind="contact" />} />
              <Route path="/companies/:companyId/crm/contacts/:partyId" element={<PartyDetailPage kind="contact" />} />
              <Route path="/companies/:companyId/crm/contacts/:partyId/edit" element={<PartyFormPage kind="contact" />} />
              <Route
                path="/companies/:companyId/employees/new"
                element={<EmployeeFormPage />}
              />
              <Route
                path="/companies/:companyId/employees/:employeeId"
                element={<EmployeeDetailPage />}
              />
              <Route
                path="/companies/:companyId/employees/:employeeId/edit"
                element={<EmployeeFormPage />}
              />
              <Route
                path="/companies/:companyId/workforce/organization-chart"
                element={<WorkforceOrganizationChartPage />}
              />
              <Route
                path="/companies/:companyId/projects/new"
                element={<ProjectFormPage />}
              />
              <Route
                path="/companies/:companyId/projects/:projectId/edit"
                element={<ProjectFormPage />}
              />
              <Route
                path="/companies/:companyId/projects/:projectId"
                element={<ProjectLayout />}
              >
                <Route index element={<ProjectOverviewPage />} />
                <Route path="dashboard" element={<ProjectDashboardPage />} />
                <Route path="timeline" element={<ProjectTimelinePage />} />
                <Route path="planning" element={<ProjectPlanningPage />} />
                <Route path="quality" element={<ProjectQualityPage />} />
                <Route path="phases" element={<ProjectPhasesPage />} />
                <Route path="milestones" element={<ProjectMilestonesPage />} />
                <Route path="team" element={<ProjectTeamPage />} />
                <Route path="documents" element={<ProjectDocumentsPage />} />
                <Route path="calendar" element={<ProjectCalendarPage />} />
                <Route path="settings" element={<ProjectSettingsPage />} />
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
