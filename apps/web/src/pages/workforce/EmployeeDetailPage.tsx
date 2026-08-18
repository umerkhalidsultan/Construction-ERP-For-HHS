import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  FileText,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/feedback/ConfirmDialog";
import { QueryErrorState } from "../../components/feedback/FormErrorSummary";
import { Alert } from "../../components/ui/Alert";
import { Badge, statusTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { userErrorMessage } from "../../lib/api-client";
import {
  branchesApi,
  departmentsApi,
  designationsApi,
} from "../../services/companies.service";
import { listProjects } from "../../services/projects.service";
import { workforceApi } from "../../services/workforce.service";
import type { Employee } from "../../types/api";

type Tab =
  | "overview"
  | "assignments"
  | "skills"
  | "certifications"
  | "licenses"
  | "documents"
  | "employment";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "assignments", label: "Assignments" },
  { id: "skills", label: "Skills" },
  { id: "certifications", label: "Certifications" },
  { id: "licenses", label: "Licenses" },
  { id: "documents", label: "Documents" },
  { id: "employment", label: "Employment history" },
];

export function EmployeeDetailPage() {
  const { companyId = "", employeeId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [action, setAction] = useState<
    | "transfer"
    | "project"
    | "skill"
    | "certification"
    | "license"
    | "document"
    | null
  >(null);
  const employee = useQuery({
    queryKey: ["employee", companyId, employeeId],
    queryFn: async () =>
      (await workforceApi.getEmployee(companyId, employeeId)).data,
    enabled: Boolean(companyId && employeeId),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["employee", companyId, employeeId],
    });
    await queryClient.invalidateQueries({ queryKey: ["employees", companyId] });
    setAction(null);
  };
  const remove = useMutation({
    mutationFn: () => workforceApi.deleteEmployee(companyId, employeeId),
    onSuccess: () => navigate(`/companies/${companyId}/employees`),
  });
  const removeAsset = useMutation({
    mutationFn: ({
      kind,
      id,
    }: {
      kind: "certification" | "license" | "document";
      id: string;
    }) => {
      if (kind === "certification")
        return workforceApi.deleteCertification(companyId, employeeId, id);
      if (kind === "license")
        return workforceApi.deleteLicense(companyId, employeeId, id);
      return workforceApi.deleteDocument(companyId, employeeId, id);
    },
    onSuccess: refresh,
  });
  const row = employee.data;

  if (employee.isLoading)
    return <div className="h-48 animate-pulse rounded-md bg-slate-100" />;
  if (employee.isError)
    return (
      <QueryErrorState
        message={userErrorMessage(employee.error)}
        onRetry={() => void employee.refetch()}
      />
    );
  if (!row) return <Alert>Employee not found.</Alert>;

  return (
    <div>
      <PageHeader
        title={`${row.firstName} ${row.lastName}`}
        description={`${row.employeeCode} · ${row.designation?.name ?? "No designation"} · ${row.department?.name ?? "No department"}`}
        actions={
          <div className="flex gap-2">
            <Link to={`/companies/${companyId}/employees/${employeeId}/edit`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() =>
                setAction(action === "transfer" ? null : "transfer")
              }
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => setConfirmArchive(true)}
            >
              <Trash2 className="h-4 w-4" />
              Archive
            </Button>
          </div>
        }
      />
      <ConfirmDialog
        open={confirmArchive}
        title="Archive employee?"
        description="The employee record will be archived. Login access will remain unchanged."
        confirmLabel="Archive employee"
        danger
        pending={remove.isPending}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          remove.mutate();
        }}
      />
      {remove.isError ? (
        <div className="mb-4">
          <Alert>{userErrorMessage(remove.error)}</Alert>
        </div>
      ) : null}
      {removeAsset.isError ? (
        <div className="mb-4">
          <Alert>{userErrorMessage(removeAsset.error)}</Alert>
        </div>
      ) : null}
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Stat
          icon={<UserRound className="h-5 w-5" />}
          label="Status"
          value={
            <Badge tone={statusTone(row.status)}>
              {row.status.replaceAll("_", " ")}
            </Badge>
          }
        />
        <Stat
          icon={<BriefcaseBusiness className="h-5 w-5" />}
          label="Availability"
          value={
            <Badge tone={statusTone(row.availability)}>
              {row.availability.replaceAll("_", " ")}
            </Badge>
          }
        />
        <Stat
          icon={<Wrench className="h-5 w-5" />}
          label="Skills"
          value={String(row.skills.length)}
        />
        <Stat
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Active projects"
          value={String(
            row.projectAssignments.filter((item) => item.status === "ACTIVE")
              .length,
          )}
        />
      </div>
      {action === "transfer" ? (
        <TransferPanel
          employee={row}
          companyId={companyId}
          onDone={refresh}
          onCancel={() => setAction(null)}
        />
      ) : null}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === item.id ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <Overview employee={row} companyId={companyId} />
      ) : null}
      {tab === "assignments" ? (
        <Collection
          title="Project assignments"
          action="Assign project"
          onAction={() => setAction(action === "project" ? null : "project")}
        >
          {action === "project" ? (
            <ProjectPanel
              companyId={companyId}
              employeeId={employeeId}
              onDone={refresh}
              onCancel={() => setAction(null)}
            />
          ) : null}
          {row.projectAssignments.map((item) => (
            <Card
              key={item.id}
              title={`${item.project.projectCode} · ${item.project.projectName}`}
              subtitle={`${item.role.replaceAll("_", " ")} · ${item.allocationPct}% allocation · ${date(item.assignedAt)}${item.unassignedAt ? ` → ${date(item.unassignedAt)}` : ""}`}
            />
          ))}
        </Collection>
      ) : null}
      {tab === "skills" ? (
        <Collection
          title="Skills"
          action="Add skill"
          onAction={() => setAction(action === "skill" ? null : "skill")}
        >
          {action === "skill" ? (
            <SkillPanel
              companyId={companyId}
              employeeId={employeeId}
              onDone={refresh}
              onCancel={() => setAction(null)}
            />
          ) : null}
          {row.skills.map((item) => (
            <Card
              key={item.id}
              title={item.skill.name}
              subtitle={`Level ${item.proficiencyLevel ?? "—"} · ${item.yearsExperience ?? "—"} years`}
            />
          ))}
        </Collection>
      ) : null}
      {tab === "certifications" ? (
        <Collection
          title="Certifications"
          action="Add certification"
          onAction={() =>
            setAction(action === "certification" ? null : "certification")
          }
        >
          {action === "certification" ? (
            <CredentialPanel
              kind="certification"
              companyId={companyId}
              employeeId={employeeId}
              onDone={refresh}
              onCancel={() => setAction(null)}
            />
          ) : null}
          {row.certifications.map((item) => (
            <Card
              key={item.id}
              title={item.name ?? "Certification"}
              subtitle={`${item.certificationNo ?? "No number"} · expires ${date(item.expiryDate)}`}
              onDelete={() =>
                removeAsset.mutate({ kind: "certification", id: item.id })
              }
            />
          ))}
        </Collection>
      ) : null}
      {tab === "licenses" ? (
        <Collection
          title="Licenses"
          action="Add license"
          onAction={() => setAction(action === "license" ? null : "license")}
        >
          {action === "license" ? (
            <CredentialPanel
              kind="license"
              companyId={companyId}
              employeeId={employeeId}
              onDone={refresh}
              onCancel={() => setAction(null)}
            />
          ) : null}
          {row.licenses.map((item) => (
            <Card
              key={item.id}
              title={item.licenseType ?? "License"}
              subtitle={`${item.licenseNumber ?? "No number"} · expires ${date(item.expiryDate)}`}
              onDelete={() =>
                removeAsset.mutate({ kind: "license", id: item.id })
              }
            />
          ))}
        </Collection>
      ) : null}
      {tab === "documents" ? (
        <Collection
          title="Employee documents"
          action="Add document"
          onAction={() => setAction(action === "document" ? null : "document")}
        >
          {action === "document" ? (
            <DocumentPanel
              companyId={companyId}
              employeeId={employeeId}
              onDone={refresh}
              onCancel={() => setAction(null)}
            />
          ) : null}
          {row.documents.map((item) => (
            <Card
              key={item.id}
              title={item.title}
              subtitle={`${item.documentType.replaceAll("_", " ")} · expires ${date(item.expiresAt)}`}
              icon={<FileText className="h-4 w-4" />}
              onDelete={() =>
                removeAsset.mutate({ kind: "document", id: item.id })
              }
            />
          ))}
        </Collection>
      ) : null}
      {tab === "employment" ? (
        <Collection title="Effective-dated employment history">
          {row.employments.map((item) => (
            <Card
              key={item.id}
              title={`${item.employmentType.name} · ${item.designation?.name ?? "No designation"}`}
              subtitle={`${date(item.effectiveFrom)} → ${item.effectiveTo ? date(item.effectiveTo) : "Current"} · ${item.department?.name ?? "No department"}${item.changeReason ? ` · ${item.changeReason}` : ""}`}
            />
          ))}
        </Collection>
      ) : null}
    </div>
  );
}

function Overview({
  employee,
  companyId,
}: {
  employee: Employee;
  companyId: string;
}) {
  const fields = [
    ["Employee code", employee.employeeCode],
    ["Company email", employee.companyEmail],
    ["Personal email", employee.personalEmail],
    ["Phone", employee.phone],
    ["Branch", employee.branch?.name],
    ["Department", employee.department?.name],
    ["Designation", employee.designation?.name],
    ["Employment type", employee.employmentType?.name],
    ["Joining date", date(employee.joiningDate)],
    [
      "Manager",
      employee.manager
        ? `${employee.manager.firstName} ${employee.manager.lastName}`
        : undefined,
    ],
    ["National ID", employee.nationalId],
    ["Passport", employee.passportNumber],
    ["Emergency contact", employee.emergencyContactName],
    ["Emergency phone", employee.emergencyContactPhone],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-md border border-slate-200 bg-white p-5 lg:col-span-2">
        <h2 className="mb-4 font-semibold text-slate-900">Employee profile</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Direct reports</h2>
        {employee.directReports.length ? (
          <div className="space-y-2">
            {employee.directReports.map((report) => (
              <Link
                key={report.id}
                className="block rounded border border-slate-100 p-2 text-sm hover:bg-slate-50"
                to={`/companies/${companyId}/employees/${report.id}`}
              >
                <span className="font-medium">
                  {report.firstName} {report.lastName}
                </span>
                <span className="block text-xs text-slate-500">
                  {report.employeeCode}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No direct reports.</p>
        )}
      </div>
    </div>
  );
}

function TransferPanel({
  employee,
  companyId,
  onDone,
  onCancel,
}: {
  employee: Employee;
  companyId: string;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [data, setData] = useState({
    branchId: employee.branch?.id ?? "",
    departmentId: employee.department?.id ?? "",
    designationId: employee.designation?.id ?? "",
    managerEmployeeId: employee.manager?.id ?? "",
    employmentTypeId: employee.employmentType?.id ?? "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });
  const branches = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () =>
      (await branchesApi.list(companyId, { limit: 200 })).data,
  });
  const departments = useQuery({
    queryKey: ["departments", companyId],
    queryFn: async () =>
      (await departmentsApi.list(companyId, { limit: 200 })).data,
  });
  const designations = useQuery({
    queryKey: ["designations", companyId],
    queryFn: async () =>
      (await designationsApi.list(companyId, { limit: 200 })).data,
  });
  const managers = useQuery({
    queryKey: ["employee-options", companyId],
    queryFn: async () =>
      (
        await workforceApi.listEmployees(companyId, {
          limit: 200,
          status: "ACTIVE",
        })
      ).data,
  });
  const types = useQuery({
    queryKey: ["employment-types", companyId],
    queryFn: async () => (await workforceApi.employmentTypes(companyId)).data,
  });
  const mutation = useMutation({
    mutationFn: () =>
      workforceApi.transferEmployee(companyId, employee.id, {
        ...data,
        branchId: data.branchId || null,
        departmentId: data.departmentId || null,
        designationId: data.designationId || null,
        managerEmployeeId: data.managerEmployeeId || null,
      }),
    onSuccess: onDone,
  });
  return (
    <ActionPanel
      title="Transfer / employment change"
      error={mutation.error}
      onCancel={onCancel}
      onSave={() => mutation.mutate()}
      pending={mutation.isPending}
    >
      <Select
        label="Branch"
        value={data.branchId}
        onChange={(e) => setData({ ...data, branchId: e.target.value })}
        options={[
          { value: "", label: "No branch" },
          ...(branches.data ?? []).map((x) => ({ value: x.id, label: x.name })),
        ]}
      />
      <Select
        label="Department"
        value={data.departmentId}
        onChange={(e) => setData({ ...data, departmentId: e.target.value })}
        options={[
          { value: "", label: "No department" },
          ...(departments.data ?? []).map((x) => ({
            value: x.id,
            label: x.name,
          })),
        ]}
      />
      <Select
        label="Designation"
        value={data.designationId}
        onChange={(e) => setData({ ...data, designationId: e.target.value })}
        options={[
          { value: "", label: "No designation" },
          ...(designations.data ?? []).map((x) => ({
            value: x.id,
            label: x.name,
          })),
        ]}
      />
      <Select
        label="Reports to"
        value={data.managerEmployeeId}
        onChange={(e) =>
          setData({ ...data, managerEmployeeId: e.target.value })
        }
        options={[
          { value: "", label: "No manager" },
          ...(managers.data ?? [])
            .filter((x) => x.id !== employee.id)
            .map((x) => ({
              value: x.id,
              label: `${x.firstName} ${x.lastName}`,
            })),
        ]}
      />
      <Select
        label="Employment type"
        value={data.employmentTypeId}
        onChange={(e) => setData({ ...data, employmentTypeId: e.target.value })}
        options={(types.data ?? []).map((x) => ({
          value: x.id,
          label: x.name,
        }))}
      />
      <Input
        label="Effective date"
        type="date"
        value={data.effectiveDate}
        onChange={(e) => setData({ ...data, effectiveDate: e.target.value })}
      />
      <Input
        label="Reason"
        value={data.reason}
        onChange={(e) => setData({ ...data, reason: e.target.value })}
      />
    </ActionPanel>
  );
}

function ProjectPanel({ companyId, employeeId, onDone, onCancel }: PanelProps) {
  const [data, setData] = useState({
    projectId: "",
    role: "OTHER",
    assignedAt: new Date().toISOString().slice(0, 10),
    allocationPct: 100,
  });
  const projects = useQuery({
    queryKey: ["projects", companyId, "workforce-options"],
    queryFn: async () => (await listProjects(companyId, { limit: 200 })).data,
  });
  const mutation = useMutation({
    mutationFn: () => workforceApi.assignProject(companyId, employeeId, data),
    onSuccess: onDone,
  });
  return (
    <ActionPanel
      title="Assign project"
      error={mutation.error}
      onCancel={onCancel}
      onSave={() => mutation.mutate()}
      pending={mutation.isPending}
    >
      <Select
        label="Project"
        value={data.projectId}
        onChange={(e) => setData({ ...data, projectId: e.target.value })}
        options={[
          { value: "", label: "Select project" },
          ...(projects.data ?? []).map((x) => ({
            value: x.id,
            label: `${x.projectCode} · ${x.projectName}`,
          })),
        ]}
      />
      <Select
        label="Role"
        value={data.role}
        onChange={(e) => setData({ ...data, role: e.target.value })}
        options={[
          "PROJECT_MANAGER",
          "SITE_ENGINEER",
          "PLANNING_ENGINEER",
          "QUANTITY_SURVEYOR",
          "SAFETY_OFFICER",
          "QUALITY_ENGINEER",
          "FOREMAN",
          "OTHER",
        ].map((x) => ({ value: x, label: x.replaceAll("_", " ") }))}
      />
      <Input
        label="Assigned date"
        type="date"
        value={data.assignedAt}
        onChange={(e) => setData({ ...data, assignedAt: e.target.value })}
      />
      <Input
        label="Allocation %"
        type="number"
        min="1"
        max="100"
        value={data.allocationPct}
        onChange={(e) =>
          setData({ ...data, allocationPct: Number(e.target.value) })
        }
      />
    </ActionPanel>
  );
}

function SkillPanel({ companyId, employeeId, onDone, onCancel }: PanelProps) {
  const [data, setData] = useState({
    skillId: "",
    proficiencyLevel: 3,
    yearsExperience: 0,
  });
  const skills = useQuery({
    queryKey: ["workforce-skills", companyId],
    queryFn: async () => (await workforceApi.skills(companyId)).data,
  });
  const mutation = useMutation({
    mutationFn: () => workforceApi.assignSkill(companyId, employeeId, data),
    onSuccess: onDone,
  });
  return (
    <ActionPanel
      title="Add skill"
      error={mutation.error}
      onCancel={onCancel}
      onSave={() => mutation.mutate()}
      pending={mutation.isPending}
    >
      <Select
        label="Skill"
        value={data.skillId}
        onChange={(e) => setData({ ...data, skillId: e.target.value })}
        options={[
          { value: "", label: "Select skill" },
          ...(skills.data ?? []).map((x) => ({ value: x.id, label: x.name })),
        ]}
      />
      <Input
        label="Proficiency (1–5)"
        type="number"
        min="1"
        max="5"
        value={data.proficiencyLevel}
        onChange={(e) =>
          setData({ ...data, proficiencyLevel: Number(e.target.value) })
        }
      />
      <Input
        label="Years experience"
        type="number"
        min="0"
        step="0.5"
        value={data.yearsExperience}
        onChange={(e) =>
          setData({ ...data, yearsExperience: Number(e.target.value) })
        }
      />
    </ActionPanel>
  );
}

function CredentialPanel({
  kind,
  companyId,
  employeeId,
  onDone,
  onCancel,
}: PanelProps & { kind: "certification" | "license" }) {
  const [data, setData] = useState({
    name: "",
    number: "",
    issueDate: "",
    expiryDate: "",
    issuingAuthority: "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      kind === "certification"
        ? workforceApi.addCertification(companyId, employeeId, {
            name: data.name,
            certificationNo: data.number || undefined,
            issueDate: data.issueDate || undefined,
            expiryDate: data.expiryDate || undefined,
            issuingAuthority: data.issuingAuthority || undefined,
          })
        : workforceApi.addLicense(companyId, employeeId, {
            licenseType: data.name,
            licenseNumber: data.number || undefined,
            issueDate: data.issueDate || undefined,
            expiryDate: data.expiryDate || undefined,
            issuingAuthority: data.issuingAuthority || undefined,
          }),
    onSuccess: onDone,
  });
  return (
    <ActionPanel
      title={`Add ${kind}`}
      error={mutation.error}
      onCancel={onCancel}
      onSave={() => mutation.mutate()}
      pending={mutation.isPending}
    >
      <Input
        label="Name / type"
        value={data.name}
        onChange={(e) => setData({ ...data, name: e.target.value })}
      />
      <Input
        label="Number"
        value={data.number}
        onChange={(e) => setData({ ...data, number: e.target.value })}
      />
      <Input
        label="Issue date"
        type="date"
        value={data.issueDate}
        onChange={(e) => setData({ ...data, issueDate: e.target.value })}
      />
      <Input
        label="Expiry date"
        type="date"
        value={data.expiryDate}
        onChange={(e) => setData({ ...data, expiryDate: e.target.value })}
      />
      <Input
        label="Issuing authority"
        value={data.issuingAuthority}
        onChange={(e) => setData({ ...data, issuingAuthority: e.target.value })}
      />
    </ActionPanel>
  );
}

function DocumentPanel({
  companyId,
  employeeId,
  onDone,
  onCancel,
}: PanelProps) {
  const [data, setData] = useState({
    documentType: "OTHER",
    title: "",
    documentNumber: "",
    issuedAt: "",
    expiresAt: "",
  });
  const mutation = useMutation({
    mutationFn: () =>
      workforceApi.addDocument(companyId, employeeId, {
        ...data,
        documentNumber: data.documentNumber || undefined,
        issuedAt: data.issuedAt || undefined,
        expiresAt: data.expiresAt || undefined,
      }),
    onSuccess: onDone,
  });
  return (
    <ActionPanel
      title="Add document metadata"
      error={mutation.error}
      onCancel={onCancel}
      onSave={() => mutation.mutate()}
      pending={mutation.isPending}
    >
      <Select
        label="Document type"
        value={data.documentType}
        onChange={(e) => setData({ ...data, documentType: e.target.value })}
        options={[
          "NATIONAL_ID",
          "PASSPORT",
          "VISA",
          "OFFER_LETTER",
          "EMPLOYMENT_CONTRACT",
          "EDUCATION_CERTIFICATE",
          "EXPERIENCE_CERTIFICATE",
          "TRAINING_CERTIFICATE",
          "NDA",
          "OTHER",
        ].map((x) => ({ value: x, label: x.replaceAll("_", " ") }))}
      />
      <Input
        label="Title"
        value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
      />
      <Input
        label="Document number"
        value={data.documentNumber}
        onChange={(e) => setData({ ...data, documentNumber: e.target.value })}
      />
      <Input
        label="Issued date"
        type="date"
        value={data.issuedAt}
        onChange={(e) => setData({ ...data, issuedAt: e.target.value })}
      />
      <Input
        label="Expiry date"
        type="date"
        value={data.expiresAt}
        onChange={(e) => setData({ ...data, expiresAt: e.target.value })}
      />
    </ActionPanel>
  );
}

type PanelProps = {
  companyId: string;
  employeeId: string;
  onDone: () => Promise<void>;
  onCancel: () => void;
};
function ActionPanel({
  title,
  children,
  error,
  onCancel,
  onSave,
  pending,
}: {
  title: string;
  children: React.ReactNode;
  error: unknown;
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
}) {
  return (
    <div className="mb-5 rounded-md border border-primary-200 bg-primary-50/40 p-4">
      <h2 className="mb-3 font-semibold text-slate-900">{title}</h2>
      {error instanceof Error ? (
        <div className="mb-3">
          <Alert>{userErrorMessage(error)}</Alert>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">{children}</div>
      <div className="mt-3 flex gap-2">
        <Button onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
function Collection({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {action ? <Button onClick={onAction}>{action}</Button> : null}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Card({
  title,
  subtitle,
  icon,
  onDelete,
}: {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  onDelete?: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex items-start gap-3 rounded-md border border-slate-100 p-3">
      <ConfirmDialog
        open={confirmOpen}
        title={`Remove ${title}?`}
        description="This action cannot be undone."
        confirmLabel="Remove"
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete?.();
        }}
      />
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {onDelete ? (
        <button
          className="ml-auto rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove ${title}`}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-2 text-primary-600">{icon}</div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
function date(value?: string | null) {
  return value ? value.slice(0, 10) : "—";
}
