import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../lib/api-client';
import {
  deleteProject,
  restoreProject,
} from '../../services/projects.service';
import type { Project } from '../../types/api';

export function ProjectOverviewPage() {
  const { companyId = '', projectId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { project } = useOutletContext<{ project?: Project }>();

  const archiveMutation = useMutation({
    mutationFn: async () => deleteProject(companyId, projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', companyId] });
      await queryClient.invalidateQueries({
        queryKey: ['project', companyId, projectId],
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => restoreProject(companyId, projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', companyId] });
      await queryClient.invalidateQueries({
        queryKey: ['project', companyId, projectId],
      });
    },
  });

  if (!project) {
    return <Alert>Loading project details…</Alert>;
  }

  return (
    <div className="space-y-4">
      {(archiveMutation.error instanceof ApiError ||
        restoreMutation.error instanceof ApiError) && (
        <Alert>
          {(archiveMutation.error as ApiError | null)?.message ||
            (restoreMutation.error as ApiError | null)?.message}
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to={`/companies/${companyId}/projects/${projectId}/edit`}>
          <Button variant="secondary">Edit project</Button>
        </Link>
        <Link to={`/companies/${companyId}/projects/${projectId}/dashboard`}>
          <Button>Open dashboard</Button>
        </Link>
        {project.deletedAt ? (
          <Button
            variant="secondary"
            onClick={() => restoreMutation.mutate()}
            disabled={restoreMutation.isPending}
          >
            Restore
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              if (confirm('Archive this project?')) {
                archiveMutation.mutate();
              }
            }}
            disabled={archiveMutation.isPending}
          >
            Archive
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => navigate(`/companies/${companyId}/projects`)}
        >
          Back to list
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Identity</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Type</dt>
              <dd>{project.projectType?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Status</dt>
              <dd>{project.status?.name ?? project.lifecycleStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Contract</dt>
              <dd>
                {project.contractType}
                {project.contractNumber ? ` · ${project.contractNumber}` : ''}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Commercial</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Estimated budget</dt>
              <dd>
                {project.currency}{' '}
                {Number(project.estimatedBudget).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Approved budget</dt>
              <dd>
                {project.approvedBudget
                  ? `${project.currency} ${Number(project.approvedBudget).toLocaleString()}`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Contract value</dt>
              <dd>
                {project.contractValue
                  ? `${project.currency} ${Number(project.contractValue).toLocaleString()}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border border-slate-200 bg-white p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Location</h2>
          <p className="mt-2 text-sm text-slate-700">
            {[project.address, project.area, project.city, project.province, project.country]
              .filter(Boolean)
              .join(', ') || 'No address recorded'}
          </p>
          {(project.latitude || project.longitude) && (
            <p className="mt-1 text-xs text-slate-500">
              GPS {project.latitude}, {project.longitude}
            </p>
          )}
        </section>

        <section className="border border-slate-200 bg-white p-4 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Scope</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {project.scopeOfWork ||
              project.projectDescription ||
              'No scope description yet.'}
          </p>
        </section>
      </div>
    </div>
  );
}
