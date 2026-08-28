import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { userErrorMessage } from "../../lib/api-client";
import { listCrmCompanies } from "../../services/crm.service";
import { getOpportunityAssignees } from "../../services/opportunities.service";
import {
  listTenders,
  type Tender,
  type TenderPriority,
  type TenderStatus,
} from "../../services/tenders.service";

const statusTone = (
  status: TenderStatus,
): "blue" | "green" | "amber" | "red" | "slate" => {
  if (status === "AWARDED") return "green";
  if (["LOST", "NO_BID", "CANCELLED"].includes(status)) return "red";
  if (["READY_FOR_SUBMISSION", "SUBMITTED", "NEGOTIATION"].includes(status))
    return "blue";
  if (["BID_DECISION_PENDING", "UNDER_REVIEW"].includes(status)) return "amber";
  return "slate";
};
const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
const deadline = (date: string, status: TenderStatus) =>
  status === "SUBMITTED"
    ? "Submitted"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(date),
      );
const money = (row: Tender) =>
  row.estimatedValue
    ? `${row.currency} ${Number(row.estimatedValue).toLocaleString()}`
    : "—";

export function TenderListPage() {
  const { companyId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const query = (key: string) => params.get(key) ?? "";
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.set("page", "1");
    setParams(next);
  };
  const updatePage = (value: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(value));
    setParams(next);
  };
  const page = Number(query("page") || 1);
  const status = query("status") as TenderStatus;
  const priority = query("priority") as TenderPriority;
  const tenders = useQuery({
    queryKey: ["tenders", companyId, params.toString()],
    queryFn: () =>
      listTenders(companyId, {
        page,
        limit: 20,
        search: query("search"),
        status,
        priority,
        clientCompanyId: query("clientCompanyId"),
        tenderType: query("tenderType"),
        projectType: query("projectType"),
        tenderManagerMembershipId: query("tenderManagerMembershipId"),
        bidDecision: query("bidDecision"),
        closingFrom: query("closingFrom"),
        closingTo: query("closingTo"),
        sortBy: query("sortBy") || "createdAt",
        sortOrder: query("sortOrder") || "desc",
      }),
    enabled: Boolean(companyId),
  });
  const clients = useQuery({
    queryKey: ["crm-company-options", companyId],
    queryFn: async () =>
      (
        await listCrmCompanies(companyId, {
          limit: 100,
          sortBy: "name",
          sortOrder: "asc",
        })
      ).data,
    enabled: Boolean(companyId),
  });
  const managers = useQuery({
    queryKey: ["opportunity-assignees", companyId],
    queryFn: async () => (await getOpportunityAssignees(companyId)).data,
    enabled: Boolean(companyId),
  });
  const rows = tenders.data?.data ?? [];
  const pagination = tenders.data?.pagination;
  const clear = () => setParams({});
  return (
    <div className="space-y-5">
      <PageHeader
        title="Tender Management"
        description="Register, evaluate, submit, and track commercial tender opportunities."
        actions={
          <Link to={`/companies/${companyId}/tenders/new`}>
            <Button>
              <Plus className="h-4 w-4" />
              New Tender
            </Button>
          </Link>
        }
      />
      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3 lg:grid-cols-6">
        <Input
          label="Search"
          value={query("search")}
          placeholder="Number, title, client…"
          onChange={(e) => update("search", e.target.value)}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => update("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...[
              "DRAFT",
              "REGISTERED",
              "UNDER_REVIEW",
              "BID_DECISION_PENDING",
              "BID_APPROVED",
              "NO_BID",
              "PREPARING",
              "READY_FOR_SUBMISSION",
              "SUBMITTED",
              "CLARIFICATION",
              "TECHNICAL_EVALUATION",
              "COMMERCIAL_EVALUATION",
              "NEGOTIATION",
              "AWARDED",
              "LOST",
              "CANCELLED",
            ].map((x) => ({ value: x, label: label(x) })),
          ]}
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => update("priority", e.target.value)}
          options={[
            { value: "", label: "All priorities" },
            ...["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"].map((x) => ({
              value: x,
              label: label(x),
            })),
          ]}
        />
        <Select
          label="Client"
          value={query("clientCompanyId")}
          onChange={(e) => update("clientCompanyId", e.target.value)}
          options={[
            { value: "", label: "All clients" },
            ...(clients.data ?? []).map((x) => ({
              value: x.id,
              label: x.name,
            })),
          ]}
        />
        <Input
          label="Tender type"
          value={query("tenderType")}
          placeholder="e.g. Open"
          onChange={(e) => update("tenderType", e.target.value)}
        />
        <Input
          label="Project type"
          value={query("projectType")}
          placeholder="e.g. Commercial"
          onChange={(e) => update("projectType", e.target.value)}
        />
        <Select
          label="Tender manager"
          value={query("tenderManagerMembershipId")}
          onChange={(e) => update("tenderManagerMembershipId", e.target.value)}
          options={[
            { value: "", label: "All managers" },
            ...(managers.data ?? []).map((manager) => ({
              value: manager.id,
              label: `${manager.user.firstName} ${manager.user.lastName}`,
            })),
          ]}
        />
        <Select
          label="Bid decision"
          value={query("bidDecision")}
          onChange={(e) => update("bidDecision", e.target.value)}
          options={[
            { value: "", label: "All decisions" },
            { value: "BID", label: "Bid" },
            { value: "NO_BID", label: "No-Bid" },
          ]}
        />
        <Input
          label="Closing from"
          type="date"
          value={query("closingFrom")}
          onChange={(e) => update("closingFrom", e.target.value)}
        />
        <Input
          label="Closing to"
          type="date"
          value={query("closingTo")}
          onChange={(e) => update("closingTo", e.target.value)}
        />
        <Select
          label="Sort by"
          value={query("sortBy") || "createdAt"}
          onChange={(e) => update("sortBy", e.target.value)}
          options={[
            { value: "createdAt", label: "Created date" },
            { value: "tenderNumber", label: "Tender number" },
            { value: "closingDate", label: "Closing date" },
            { value: "estimatedValue", label: "Estimated value" },
            { value: "priority", label: "Priority" },
            { value: "status", label: "Status" },
          ]}
        />
        <Select
          label="Direction"
          value={query("sortOrder") || "desc"}
          onChange={(e) => update("sortOrder", e.target.value)}
          options={[
            { value: "desc", label: "Newest first" },
            { value: "asc", label: "Oldest first" },
          ]}
        />
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={clear}>
            Clear filters
          </Button>
        </div>
      </section>
      <div className="hidden md:block">
        <DataTable<Tender>
          rows={rows}
          isLoading={tenders.isLoading}
          error={tenders.isError ? userErrorMessage(tenders.error) : null}
          onRetry={() => void tenders.refetch()}
          emptyMessage="No Tenders have been registered yet."
          columns={[
            {
              key: "number",
              header: "Tender #",
              render: (r) => (
                <Link
                  className="font-medium text-primary-700 hover:underline"
                  to={`/companies/${companyId}/tenders/${r.id}`}
                >
                  {r.tenderNumber}
                </Link>
              ),
            },
            {
              key: "title",
              header: "Tender Title",
              render: (r) => <span className="font-medium">{r.title}</span>,
            },
            {
              key: "client",
              header: "Client",
              render: (r) => r.clientCompany?.name ?? "—",
            },
            { key: "type", header: "Tender Type", render: (r) => r.tenderType },
            {
              key: "location",
              header: "Location",
              render: (r) =>
                [r.projectLocation, r.city].filter(Boolean).join(", ") || "—",
            },
            {
              key: "closing",
              header: "Closing Date",
              render: (r) => deadline(r.closingDate, r.status),
            },
            {
              key: "value",
              header: "Estimated Value",
              render: money,
            },
            {
              key: "manager",
              header: "Tender Manager",
              render: (r) =>
                r.tenderManager
                  ? `${r.tenderManager.user.firstName} ${r.tenderManager.user.lastName}`
                  : "—",
            },
            {
              key: "priority",
              header: "Priority",
              render: (r) => (
                <Badge
                  tone={
                    r.priority === "CRITICAL" || r.priority === "URGENT"
                      ? "red"
                      : r.priority === "HIGH"
                        ? "amber"
                        : "slate"
                  }
                >
                  {label(r.priority)}
                </Badge>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (r) => (
                <Link
                  className="text-primary-700 hover:underline"
                  to={`/companies/${companyId}/tenders/${r.id}`}
                >
                  View Tender
                </Link>
              ),
            },
          ]}
        />
      </div>
      <div className="space-y-3 md:hidden">
        {tenders.isLoading ? (
          <p className="text-sm text-slate-500">Loading Tenders…</p>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              to={`/companies/${companyId}/tenders/${r.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-primary-700">
                    {r.tenderNumber}
                  </p>
                  <p className="truncate font-semibold">{r.title}</p>
                  <p className="truncate text-sm text-slate-500">
                    {r.clientCompany?.name ?? "No client"}
                  </p>
                </div>
                <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <span>{deadline(r.closingDate, r.status)}</span>
                <span className="text-right">{money(r)}</span>
                <span>{label(r.priority)}</span>
                <span className="text-right text-primary-700">View Tender</span>
              </div>
            </Link>
          ))
        )}
        {!tenders.isLoading && !rows.length ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            <Search className="mx-auto mb-2 h-5 w-5" />
            No Tenders found.
          </div>
        ) : null}
      </div>
      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages} ·{" "}
            {pagination.total} Tenders
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => updatePage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page >= pagination.totalPages}
              onClick={() => updatePage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
