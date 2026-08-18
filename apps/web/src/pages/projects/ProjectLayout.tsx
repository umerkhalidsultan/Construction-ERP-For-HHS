import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge, statusTone } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';
import { getProject } from '../../services/projects.service';

const tabs = [
  { path: '', label: 'Overview', end: true },
  { path: 'dashboard', label: 'Dashboard' },
  { path: 'timeline', label: 'Timeline' },
  { path: 'planning', label: 'Planning' },
  { path: 'phases', label: 'Phases' },
  { path: 'milestones', label: 'Milestones' },
  { path: 'team', label: 'Team' },
  { path: 'documents', label: 'Documents' },
  { path: 'calendar', label: 'Calendar' },
  { path: 'settings', label: 'Settings' },
];

export function ProjectLayout() {
  const { companyId = '', projectId = '' } = useParams();
  const projectQuery = useQuery({
    queryKey: ['project', companyId, projectId],
    queryFn: async () => (await getProject(companyId, projectId)).data,
    enabled: Boolean(companyId && projectId),
  });

  const project = projectQuery.data;
  const base = `/companies/${companyId}/projects/${projectId}`;

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {project?.projectCode ?? '…'}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {project?.projectName ?? 'Loading project'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {[project?.city, project?.country].filter(Boolean).join(', ') ||
                'Location not set'}
            </p>
          </div>
          {project ? (
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(project.lifecycleStatus)}>
                {project.lifecycleStatus}
              </Badge>
              <Badge tone="neutral">{project.priority}</Badge>
              <Badge tone="neutral">
                {Number(project.completionPercentage).toFixed(1)}% complete
              </Badge>
            </div>
          ) : null}
        </div>
        <nav className="mt-4 flex flex-wrap gap-1 border-t border-slate-100 pt-3">
          {tabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.path ? `${base}/${tab.path}` : base}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-primary-50 text-primary-800'
                    : 'text-slate-600 hover:bg-slate-50',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet context={{ project, companyId, projectId }} />
    </div>
  );
}
