import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  ClipboardCheck,
  FlaskConical,
  Plus,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "../../components/feedback/Toast";
import { Alert } from "../../components/ui/Alert";
import { Badge, statusTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { userErrorMessage } from "../../lib/api-client";
import { cn } from "../../lib/utils";
import { qualityApi } from "../../services/quality.service";
import type {
  QualityInspection,
  QualityDashboard,
  QualityIssue,
  QualityItp,
  QualityNcr,
  QualityTestResult,
} from "../../services/quality.service";

type Tab = "dashboard" | "inspections" | "itps" | "tests" | "ncrs" | "issues";
type CreateKind = Exclude<Tab, "dashboard"> | null;
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "inspections", label: "Inspections" },
  { id: "itps", label: "ITPs" },
  { id: "tests", label: "Tests" },
  { id: "ncrs", label: "NCRs" },
  { id: "issues", label: "Defects & punch" },
];

export function ProjectQualityPage() {
  const { companyId = "", projectId = "" } = useParams();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [createKind, setCreateKind] = useState<CreateKind>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const dashboard = useQuery({
    queryKey: ["quality-dashboard", companyId, projectId],
    queryFn: async () =>
      (await qualityApi.dashboard(companyId, projectId)).data,
  });
  const inspections = useQuery({
    queryKey: ["quality-inspections", companyId, projectId],
    queryFn: async () =>
      (await qualityApi.inspections(companyId, projectId, { limit: 200 })).data,
    enabled: tab === "inspections",
  });
  const itps = useQuery({
    queryKey: ["quality-itps", companyId, projectId],
    queryFn: async () =>
      (await qualityApi.itps(companyId, projectId, { limit: 200 })).data,
    enabled: tab === "itps" || createKind === "inspections",
  });
  const definitions = useQuery({
    queryKey: ["quality-test-definitions", companyId, projectId],
    queryFn: async () =>
      (await qualityApi.testDefinitions(companyId, projectId)).data,
    enabled: tab === "tests" || createKind === "tests",
  });
  const tests = useQuery({
    queryKey: ["quality-tests", companyId, projectId],
    queryFn: async () =>
      (await qualityApi.testResults(companyId, projectId, { limit: 200 })).data,
    enabled: tab === "tests",
  });
  const ncrs = useQuery({
    queryKey: ["quality-ncrs", companyId, projectId],
    queryFn: async () =>
      (await qualityApi.ncrs(companyId, projectId, { limit: 200 })).data,
    enabled: tab === "ncrs",
  });
  const issues = useQuery({
    queryKey: ["quality-issues", companyId, projectId],
    queryFn: async () =>
      (await qualityApi.issues(companyId, projectId, { limit: 200 })).data,
    enabled: tab === "issues",
  });

  const create = useMutation({
    mutationFn: async ({
      kind,
      body,
    }: {
      kind: Exclude<Tab, "dashboard">;
      body: Record<string, unknown>;
    }) => {
      if (kind === "inspections")
        return qualityApi.createInspection(
          companyId,
          projectId,
          body,
          crypto.randomUUID(),
        );
      if (kind === "itps")
        return qualityApi.createItp(companyId, projectId, body);
      if (kind === "tests")
        return body.definitionOnly
          ? qualityApi.createTestDefinition(companyId, projectId, body)
          : qualityApi.createTestResult(companyId, projectId, body);
      if (kind === "ncrs")
        return qualityApi.createNcr(companyId, projectId, body);
      return qualityApi.createIssue(companyId, projectId, body);
    },
    onSuccess: async (_, variables) => {
      setCreateKind(null);
      toast.success("Quality record saved successfully.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["quality-dashboard", companyId, projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: [`quality-${variables.kind}`, companyId, projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["quality-test-definitions", companyId, projectId],
        }),
      ]);
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quality assurance & control"
        description="Plan, inspect, test, resolve non-conformance, and retain auditable evidence."
        actions={
          tab !== "dashboard" ? (
            <Button onClick={() => setCreateKind(tab)}>
              <Plus className="h-4 w-4" />
              Create record
            </Button>
          ) : undefined
        }
      />
      <nav
        className="flex gap-1 overflow-x-auto border-b border-slate-200"
        aria-label="Quality sections"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium",
              tab === item.id
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {tab === "dashboard" ? (
        <Dashboard query={dashboard} onOpen={setTab} />
      ) : null}
      {tab === "inspections" ? (
        <InspectionRegister query={inspections} />
      ) : null}
      {tab === "itps" ? <ItpRegister query={itps} /> : null}
      {tab === "tests" ? <TestRegister query={tests} /> : null}
      {tab === "ncrs" ? <NcrRegister query={ncrs} /> : null}
      {tab === "issues" ? <IssueRegister query={issues} /> : null}
      {create.error ? <Alert>{userErrorMessage(create.error)}</Alert> : null}
      {createKind ? (
        <CreateQualityModal
          kind={createKind}
          busy={create.isPending}
          itps={itps.data ?? []}
          definitions={definitions.data ?? []}
          onClose={() => setCreateKind(null)}
          onSubmit={(body) => create.mutate({ kind: createKind, body })}
        />
      ) : null}
    </div>
  );
}

function Dashboard({
  query,
  onOpen,
}: {
  query: UseQueryResult<QualityDashboard>;
  onOpen: (tab: Tab) => void;
}) {
  if (query.isLoading)
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-md bg-slate-100" />
        ))}
      </div>
    );
  if (query.isError)
    return (
      <DataTable
        columns={[]}
        rows={[]}
        error={userErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  const data = query.data;
  if (!data) return null;
  const cards = [
    [
      "Inspection pass rate",
      `${data.inspectionPassRate.toFixed(1)}%`,
      ClipboardCheck,
      "inspections" as Tab,
    ],
    [
      "Pending inspections",
      String(
        (data.inspections.SUBMITTED ?? 0) + (data.inspections.SCHEDULED ?? 0),
      ),
      ClipboardCheck,
      "inspections" as Tab,
    ],
    ["Open NCRs", String(data.openNcrs), ShieldAlert, "ncrs" as Tab],
    ["Critical NCRs", String(data.criticalNcrs), ShieldAlert, "ncrs" as Tab],
    ["Overdue NCRs", String(data.overdueNcrs), ShieldAlert, "ncrs" as Tab],
    [
      "Test pass rate",
      `${data.testPassRate.toFixed(1)}%`,
      FlaskConical,
      "tests" as Tab,
    ],
    ["Rework records", String(data.reworkCount), Wrench, "issues" as Tab],
    [
      "Rework cost",
      Number(data.totalReworkCost).toLocaleString(),
      Wrench,
      "issues" as Tab,
    ],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(([label, value, Icon, target]) => (
        <button
          type="button"
          key={label}
          onClick={() => onOpen(target)}
          className="rounded-md border border-slate-200 bg-white p-4 text-left hover:border-primary-300"
        >
          <Icon className="h-5 w-5 text-primary-600" />
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        </button>
      ))}
    </div>
  );
}

function InspectionRegister({
  query,
}: {
  query: UseQueryResult<QualityInspection[]>;
}) {
  return (
    <DataTable
      isLoading={query.isLoading}
      error={query.isError ? userErrorMessage(query.error) : null}
      onRetry={() => void query.refetch()}
      rows={query.data ?? []}
      emptyMessage="No inspection requests have been created."
      columns={[
        {
          key: "number",
          header: "IR number",
          render: (row) => (
            <span className="font-medium">{row.inspectionNumber}</span>
          ),
        },
        {
          key: "description",
          header: "Inspection",
          render: (row) => (
            <div>
              <p>{row.description}</p>
              <p className="text-xs text-slate-500">
                {row.activity?.name ?? row.areaReference ?? "Project level"}
              </p>
            </div>
          ),
        },
        {
          key: "type",
          header: "Type / point",
          render: (row) =>
            `${row.inspectionType.replaceAll("_", " ")} · ${row.controlPoint}`,
        },
        {
          key: "date",
          header: "Requested",
          render: (row) => row.requestedDate.slice(0, 10),
        },
        {
          key: "status",
          header: "Status",
          render: (row) => (
            <Badge tone={statusTone(row.status)}>
              {row.status.replaceAll("_", " ")}
            </Badge>
          ),
        },
      ]}
    />
  );
}

function ItpRegister({ query }: { query: UseQueryResult<QualityItp[]> }) {
  return (
    <DataTable
      isLoading={query.isLoading}
      error={query.isError ? userErrorMessage(query.error) : null}
      onRetry={() => void query.refetch()}
      rows={query.data ?? []}
      emptyMessage="No inspection and test plans have been created."
      columns={[
        {
          key: "number",
          header: "ITP",
          render: (row) => (
            <span className="font-medium">
              {row.itpNumber} · Rev {row.version}
            </span>
          ),
        },
        {
          key: "stage",
          header: "Stage",
          render: (row) => (
            <div>
              <p>{row.inspectionStage}</p>
              <p className="text-xs text-slate-500">
                {row.activity?.name ?? "Project level"}
              </p>
            </div>
          ),
        },
        {
          key: "criteria",
          header: "Acceptance criteria",
          render: (row) => (
            <span className="line-clamp-2 max-w-md">
              {row.acceptanceCriteria}
            </span>
          ),
        },
        {
          key: "point",
          header: "Control point",
          render: (row) => (
            <Badge tone={row.controlPoint === "HOLD" ? "danger" : "neutral"}>
              {row.controlPoint}
            </Badge>
          ),
        },
        {
          key: "status",
          header: "Status",
          render: (row) => (
            <Badge tone={statusTone(row.status)}>{row.status}</Badge>
          ),
        },
      ]}
    />
  );
}

function TestRegister({
  query,
}: {
  query: UseQueryResult<QualityTestResult[]>;
}) {
  return (
    <DataTable
      isLoading={query.isLoading}
      error={query.isError ? userErrorMessage(query.error) : null}
      onRetry={() => void query.refetch()}
      rows={query.data ?? []}
      emptyMessage="No quality test results have been recorded."
      columns={[
        {
          key: "number",
          header: "Test number",
          render: (row) => (
            <span className="font-medium">{row.testNumber}</span>
          ),
        },
        {
          key: "test",
          header: "Test",
          render: (row) =>
            `${row.definition.name} · ${row.definition.parameter}`,
        },
        {
          key: "result",
          header: "Result",
          render: (row) =>
            `${row.numericResult ?? row.textResult ?? "—"} ${row.definition.unit ?? ""}`,
        },
        {
          key: "date",
          header: "Date",
          render: (row) => row.testDate.slice(0, 10),
        },
        {
          key: "status",
          header: "Calculated result",
          render: (row) => (
            <Badge
              tone={
                row.calculatedStatus === "PASS"
                  ? "success"
                  : row.calculatedStatus === "FAIL"
                    ? "danger"
                    : "neutral"
              }
            >
              {row.resultStatus}
            </Badge>
          ),
        },
      ]}
    />
  );
}

function NcrRegister({ query }: { query: UseQueryResult<QualityNcr[]> }) {
  return (
    <DataTable
      isLoading={query.isLoading}
      error={query.isError ? userErrorMessage(query.error) : null}
      onRetry={() => void query.refetch()}
      rows={query.data ?? []}
      emptyMessage="No non-conformance reports have been raised."
      columns={[
        {
          key: "number",
          header: "NCR",
          render: (row) => <span className="font-medium">{row.ncrNumber}</span>,
        },
        {
          key: "description",
          header: "Non-conformance",
          render: (row) => (
            <span className="line-clamp-2 max-w-md">{row.description}</span>
          ),
        },
        {
          key: "severity",
          header: "Severity",
          render: (row) => (
            <Badge
              tone={
                row.severity === "CRITICAL"
                  ? "danger"
                  : row.severity === "MAJOR"
                    ? "warning"
                    : "neutral"
              }
            >
              {row.severity}
            </Badge>
          ),
        },
        {
          key: "due",
          header: "Due",
          render: (row) => row.dueDate?.slice(0, 10) ?? "—",
        },
        {
          key: "status",
          header: "Status",
          render: (row) => (
            <Badge tone={statusTone(row.status)}>
              {row.status.replaceAll("_", " ")}
            </Badge>
          ),
        },
      ]}
    />
  );
}

function IssueRegister({ query }: { query: UseQueryResult<QualityIssue[]> }) {
  return (
    <DataTable
      isLoading={query.isLoading}
      error={query.isError ? userErrorMessage(query.error) : null}
      onRetry={() => void query.refetch()}
      rows={query.data ?? []}
      emptyMessage="No defects, punch items, or observations have been recorded."
      columns={[
        {
          key: "number",
          header: "Reference",
          render: (row) => (
            <span className="font-medium">{row.issueNumber}</span>
          ),
        },
        {
          key: "type",
          header: "Type",
          render: (row) => row.type.replaceAll("_", " "),
        },
        {
          key: "description",
          header: "Description",
          render: (row) => (
            <span className="line-clamp-2 max-w-md">{row.description}</span>
          ),
        },
        {
          key: "location",
          header: "Area",
          render: (row) => row.areaReference ?? "—",
        },
        {
          key: "status",
          header: "Status",
          render: (row) => (
            <Badge tone={statusTone(row.status)}>
              {row.status.replaceAll("_", " ")}
            </Badge>
          ),
        },
      ]}
    />
  );
}

function CreateQualityModal({
  kind,
  busy,
  itps,
  definitions,
  onClose,
  onSubmit,
}: {
  kind: Exclude<Tab, "dashboard">;
  busy: boolean;
  itps: QualityItp[];
  definitions: Array<{ id: string; name: string; parameter: string }>;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const optional = (name: string) => value(name) || undefined;
    const today = new Date().toISOString().slice(0, 10);
    if (kind === "inspections")
      onSubmit({
        inspectionNumber: value("number"),
        itpId: optional("itpId"),
        areaReference: optional("area"),
        requestedDate: value("date") || today,
        inspectionType: value("type"),
        controlPoint: value("point"),
        description: value("description"),
        clientMutationId: crypto.randomUUID(),
      });
    if (kind === "itps")
      onSubmit({
        itpNumber: value("number"),
        inspectionStage: value("stage"),
        inspectionType: value("type"),
        controlPoint: value("point"),
        acceptanceCriteria: value("criteria"),
        responsibleParty: value("responsible"),
        requiredDocuments: [],
        requiredTests: [],
      });
    if (kind === "tests")
      onSubmit({
        testNumber: value("number"),
        definitionId: value("definitionId"),
        testDate: value("date") || today,
        numericResult: value("result") ? Number(value("result")) : undefined,
        materialReference: optional("material"),
        remarks: optional("remarks"),
      });
    if (kind === "ncrs")
      onSubmit({
        ncrNumber: value("number"),
        source: value("source"),
        description: value("description"),
        severity: value("severity"),
        reportedDate: value("date") || today,
        dueDate: optional("dueDate"),
        responsibleParty: optional("responsible"),
      });
    if (kind === "issues")
      onSubmit({
        issueNumber: value("number"),
        type: value("issueType"),
        description: value("description"),
        severity: value("severity"),
        reportedDate: value("date") || today,
        dueDate: optional("dueDate"),
        areaReference: optional("area"),
      });
  };
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Create ${kind}`}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold capitalize">
          Create {kind.replaceAll("_", " ")}
        </h2>
        <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input required name="number" label="Reference number" />
            <Input
              name="date"
              type="date"
              label={kind === "inspections" ? "Requested date" : "Date"}
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          {kind === "inspections" || kind === "itps" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                name="type"
                label="Inspection type"
                options={[
                  "RECEIVING",
                  "MATERIAL",
                  "PRE_INSTALLATION",
                  "IN_PROCESS",
                  "FINAL",
                  "TESTING",
                  "PRE_COMMISSIONING",
                  "COMMISSIONING",
                  "CLIENT",
                  "CONSULTANT",
                  "THIRD_PARTY",
                  "OTHER",
                ].map((value) => ({
                  value,
                  label: value.replaceAll("_", " "),
                }))}
              />
              <Select
                name="point"
                label="Control point"
                options={["NONE", "HOLD", "WITNESS", "REVIEW"].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </div>
          ) : null}
          {kind === "inspections" ? (
            <>
              <Select
                name="itpId"
                label="ITP"
                options={[
                  { value: "", label: "No linked ITP" },
                  ...itps.map((item) => ({
                    value: item.id,
                    label: `${item.itpNumber} · ${item.inspectionStage}`,
                  })),
                ]}
              />
              <Input name="area" label="Site / area reference" />
            </>
          ) : null}
          {kind === "itps" ? (
            <>
              <Input required name="stage" label="Inspection stage" />
              <Input required name="responsible" label="Responsible party" />
              <Input required name="criteria" label="Acceptance criteria" />
            </>
          ) : null}
          {kind === "tests" ? (
            <>
              <Select
                required
                name="definitionId"
                label="Test definition"
                options={[
                  { value: "", label: "Select test" },
                  ...definitions.map((item) => ({
                    value: item.id,
                    label: `${item.name} · ${item.parameter}`,
                  })),
                ]}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  required
                  name="result"
                  type="number"
                  step="any"
                  label="Numeric result"
                />
                <Input name="material" label="Material / batch reference" />
              </div>
              <Input name="remarks" label="Remarks" />
            </>
          ) : null}
          {kind === "ncrs" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  name="source"
                  label="Source"
                  options={[
                    "INSPECTION",
                    "TEST_FAILURE",
                    "MATERIAL_REJECTION",
                    "SITE_OBSERVATION",
                    "CLIENT_COMPLAINT",
                    "CONSULTANT_OBSERVATION",
                    "INTERNAL_AUDIT",
                    "EXTERNAL_AUDIT",
                    "SUBCONTRACTOR",
                    "OTHER",
                  ].map((value) => ({
                    value,
                    label: value.replaceAll("_", " "),
                  }))}
                />
                <SeveritySelect />
              </div>
              <Input name="responsible" label="Responsible party" />
              <Input name="dueDate" type="date" label="Due date" />
            </>
          ) : null}
          {kind === "issues" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  name="issueType"
                  label="Issue type"
                  options={[
                    "DEFECT",
                    "PUNCH_ITEM",
                    "POSITIVE_OBSERVATION",
                    "WARNING",
                    "POTENTIAL_DEFECT",
                    "IMPROVEMENT",
                    "QUALITY_CONCERN",
                  ].map((value) => ({
                    value,
                    label: value.replaceAll("_", " "),
                  }))}
                />
                <SeveritySelect />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="area" label="Site / area" />
                <Input name="dueDate" type="date" label="Due date" />
              </div>
            </>
          ) : null}
          {kind !== "tests" && kind !== "itps" ? (
            <Input required name="description" label="Description" />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SeveritySelect() {
  return (
    <Select
      name="severity"
      label="Severity"
      options={["MINOR", "MAJOR", "CRITICAL"].map((value) => ({
        value,
        label: value,
      }))}
    />
  );
}
