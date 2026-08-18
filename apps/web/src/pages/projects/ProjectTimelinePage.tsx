import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge, statusTone } from '../../components/ui/Badge';
import { getProjectTimeline } from '../../services/projects.service';

export function ProjectTimelinePage() {
  const { companyId = '', projectId = '' } = useParams();
  const timelineQuery = useQuery({
    queryKey: ['project-timeline', companyId, projectId],
    queryFn: async () => (await getProjectTimeline(companyId, projectId)).data,
    enabled: Boolean(companyId && projectId),
  });

  if (timelineQuery.isLoading) {
    return <div className="h-40 animate-pulse border border-slate-200 bg-white" />;
  }

  const data = timelineQuery.data;
  if (!data) {
    return <Alert>Timeline unavailable.</Alert>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Phases</h2>
        <ol className="mt-3 space-y-3">
          {data.phases.map((phase, index) => (
            <li key={phase.id} className="border-l-2 border-primary-200 pl-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">
                  {index + 1}. {phase.name}
                </p>
                <Badge tone={statusTone(phase.status)}>{phase.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {phase.plannedStartDate || '—'} → {phase.plannedEndDate || '—'} ·{' '}
                {Number(phase.completionPercentage).toFixed(1)}%
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Milestones</h2>
        <ul className="mt-3 space-y-3">
          {data.milestones.length === 0 ? (
            <li className="text-sm text-slate-500">No milestones yet.</li>
          ) : (
            data.milestones.map((milestone) => (
              <li key={milestone.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {milestone.name}
                  </span>
                  <Badge tone={statusTone(milestone.status)}>
                    {milestone.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Target {milestone.targetDate}
                  {milestone.actualDate ? ` · Actual ${milestone.actualDate}` : ''}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
