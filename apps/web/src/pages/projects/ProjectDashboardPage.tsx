import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge, statusTone } from '../../components/ui/Badge';
import { getProjectDashboard } from '../../services/projects.service';

export function ProjectDashboardPage() {
  const { companyId = '', projectId = '' } = useParams();
  const dashboardQuery = useQuery({
    queryKey: ['project-dashboard', companyId, projectId],
    queryFn: async () => (await getProjectDashboard(companyId, projectId)).data,
    enabled: Boolean(companyId && projectId),
  });

  if (dashboardQuery.isLoading) {
    return <div className="h-40 animate-pulse border border-slate-200 bg-white" />;
  }

  const data = dashboardQuery.data;
  if (!data) {
    return <Alert>Dashboard data unavailable.</Alert>;
  }

  const cards = [
    {
      label: 'Progress',
      value: `${Number(data.completionPercentage).toFixed(1)}%`,
    },
    {
      label: 'Budget',
      value: `${data.currency} ${Number(data.estimatedBudget).toLocaleString()}`,
    },
    {
      label: 'Milestones',
      value: `${data.milestoneSummary.completed}/${data.milestoneSummary.total}`,
    },
    {
      label: 'Phases',
      value: `${data.phaseSummary.completed}/${data.phaseSummary.total}`,
    },
    { label: 'Team', value: String(data.teamCount) },
    { label: 'Documents', value: String(data.documentCount) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Upcoming deadlines
          </h2>
          <ul className="mt-3 space-y-2">
            {data.upcomingDeadlines.length === 0 ? (
              <li className="text-sm text-slate-500">No deadlines in the next 30 days.</li>
            ) : (
              data.upcomingDeadlines.map((item) => (
                <li
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    <Badge tone="neutral">{item.type}</Badge>{' '}
                    {item.name}
                  </span>
                  <span className="text-slate-500">{item.date}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Risk indicators
          </h2>
          <ul className="mt-3 space-y-2">
            {data.riskIndicators.length === 0 ? (
              <li className="text-sm text-slate-500">No active risk flags.</li>
            ) : (
              data.riskIndicators.map((risk) => (
                <li key={risk.code} className="text-sm">
                  <Badge tone={statusTone(risk.level)}>{risk.level}</Badge>{' '}
                  {risk.message}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Project photos
          </h2>
          <ul className="mt-3 space-y-2">
            {data.recentPhotos.length === 0 ? (
              <li className="text-sm text-slate-500">No site photos uploaded yet.</li>
            ) : (
              data.recentPhotos.map((photo) => (
                <li
                  key={photo.id}
                  className="flex items-center justify-between text-sm"
                >
                  {photo.externalUrl ? (
                    <a
                      href={photo.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {photo.title}
                    </a>
                  ) : (
                    <span>{photo.title}</span>
                  )}
                  <span className="text-slate-500">{photo.versionLabel}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Future module placeholders
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Pending approvals', data.pendingApprovals.length],
              ['Material requests', data.materialRequests.length],
              ['Purchase orders', data.purchaseOrders.length],
              ['Latest reports', data.latestReports.length],
            ].map(([label, count]) => (
              <div
                key={String(label)}
                className="border border-dashed border-slate-200 px-3 py-2 text-sm"
              >
                <p className="text-slate-500">{label}</p>
                <p className="font-medium text-slate-800">{count} (stub)</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
