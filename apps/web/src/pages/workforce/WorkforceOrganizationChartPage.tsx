import { useQuery } from "@tanstack/react-query";
import { ChevronRight, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { QueryErrorState } from "../../components/feedback/FormErrorSummary";
import { Badge, statusTone } from "../../components/ui/Badge";
import { PageHeader } from "../../components/ui/PageHeader";
import { workforceApi } from "../../services/workforce.service";
import { userErrorMessage } from "../../lib/api-client";
import type { WorkforceOrgChartNode } from "../../types/api";

export function WorkforceOrganizationChartPage() {
  const { companyId = "" } = useParams();
  const query = useQuery({
    queryKey: ["workforce-org-chart", companyId],
    queryFn: async () => (await workforceApi.organizationChart(companyId)).data,
    enabled: Boolean(companyId),
  });
  if (query.isError)
    return (
      <QueryErrorState
        message={userErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  const rows = query.data ?? [];
  const roots = rows.filter(
    (row) =>
      !row.managerEmployeeId ||
      !rows.some((candidate) => candidate.id === row.managerEmployeeId),
  );
  return (
    <div>
      <PageHeader
        title="Workforce organization chart"
        description="Employee reporting hierarchy derived from current effective employment placement."
      />
      {query.isLoading ? (
        <div className="h-48 animate-pulse rounded-md bg-slate-100" />
      ) : roots.length ? (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white p-5">
          <div className="min-w-[720px] space-y-4">
            {roots.map((root) => (
              <Node
                key={root.id}
                row={root}
                all={rows}
                companyId={companyId}
                depth={0}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
          No employees available for the chart.
        </div>
      )}
    </div>
  );
}

function Node({
  row,
  all,
  companyId,
  depth,
}: {
  row: WorkforceOrgChartNode;
  all: WorkforceOrgChartNode[];
  companyId: string;
  depth: number;
}) {
  const reports = all.filter(
    (candidate) => candidate.managerEmployeeId === row.id,
  );
  return (
    <div style={{ marginLeft: depth * 36 }}>
      <Link
        to={`/companies/${companyId}/employees/${row.id}`}
        className="inline-flex min-w-80 items-center gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm hover:border-primary-300 hover:bg-primary-50/30"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <UserRound className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {row.preferredName || `${row.firstName} ${row.lastName}`}
          </p>
          <p className="truncate text-xs text-slate-500">
            {row.designation?.name ?? "No designation"} ·{" "}
            {row.department?.name ?? "No department"}
          </p>
        </div>
        <Badge tone={statusTone(row.status)}>{row.employeeCode}</Badge>
      </Link>
      {reports.length ? (
        <div className="relative mt-2 space-y-2 border-l-2 border-slate-200 pl-4">
          <ChevronRight className="absolute -left-3 top-3 h-5 w-5 bg-white text-slate-400" />
          {reports.map((report) => (
            <Node
              key={report.id}
              row={report}
              all={all}
              companyId={companyId}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
