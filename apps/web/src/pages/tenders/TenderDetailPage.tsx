import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, MapPin, Pencil, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmDialog } from "../../components/feedback/ConfirmDialog";
import { useToast } from "../../components/feedback/Toast";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { userErrorMessage } from "../../lib/api-client";
import { useAuthStore } from "../../store/auth.store";
import { listCrmCompanies } from "../../services/crm.service";
import { getOpportunityAssignees } from "../../services/opportunities.service";
import {
  awardTender,
  changeRequirementStatus,
  changeTenderStatus,
  attachTenderDocument,
  createTenderPreBidMeeting,
  createTenderSiteVisit,
  createTenderRequirement,
  getTender,
  listTenderAttachments,
  listTenderPreBidMeetings,
  listTenderRequirements,
  listTenderSiteVisits,
  listTenderTeam,
  loseTender,
  recordBidDecision,
  removeTenderDocument,
  removeTenderTeam,
  assignTenderTeam,
  submitTender,
  type RequirementStatus,
  type SubmissionMethod,
  type Tender,
  type TenderStatus,
} from "../../services/tenders.service";

type Tab =
  | "overview"
  | "information"
  | "stakeholders"
  | "decision"
  | "team"
  | "documents"
  | "requirements"
  | "site-visits"
  | "pre-bid"
  | "submission"
  | "timeline";
const tabs: Array<[Tab, string]> = [
  ["overview", "Overview"],
  ["information", "Tender Information"],
  ["stakeholders", "Stakeholders"],
  ["decision", "Bid Decision"],
  ["team", "Team"],
  ["documents", "Documents"],
  ["requirements", "Requirements"],
  ["site-visits", "Site Visits"],
  ["pre-bid", "Pre-Bid Meetings"],
  ["submission", "Submission"],
  ["timeline", "Timeline"],
];
const DOCUMENT_CATEGORIES = ["INVITATION_TO_TENDER", "INSTRUCTIONS_TO_BIDDERS", "BOQ", "DRAWINGS", "SPECIFICATIONS", "CONDITIONS_OF_CONTRACT", "ADDENDA", "SCOPE_OF_WORK", "TECHNICAL_REQUIREMENTS", "COMMERCIAL_REQUIREMENTS", "FORMS", "SITE_INFORMATION", "CLIENT_CORRESPONDENCE", "BID_BOND", "TECHNICAL_SUBMISSION", "COMMERCIAL_SUBMISSION", "OTHER"];
const closed = new Set<TenderStatus>([
  "NO_BID",
  "AWARDED",
  "LOST",
  "CANCELLED",
]);
const statusLabel = (s: string) =>
  s.replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
const tone = (s: string): "blue" | "green" | "amber" | "red" | "slate" =>
  s === "AWARDED"
    ? "green"
    : ["LOST", "NO_BID", "CANCELLED"].includes(s)
      ? "red"
      : ["BID_DECISION_PENDING", "UNDER_REVIEW"].includes(s)
        ? "amber"
        : "blue";
const field = (name: string, value?: string | null) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {name}
    </dt>
    <dd className="mt-1 text-sm text-slate-900">{value || "—"}</dd>
  </div>
);
const date = (v?: string | null) =>
  v
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(v),
      )
    : "—";
const days = (t: Tender) => {
  if (t.status === "SUBMITTED") return "Submitted";
  const diff = Math.ceil(
    (new Date(t.closingDate).getTime() - Date.now()) / 86400000,
  );
  return diff < 0
    ? "Submission Deadline Passed"
    : diff === 0
      ? "Closes Today"
      : `${diff} Day${diff === 1 ? "" : "s"} Remaining`;
};
const transitions: Partial<Record<TenderStatus, [TenderStatus, string]>> = {
  DRAFT: ["REGISTERED", "Register Tender"],
  REGISTERED: ["UNDER_REVIEW", "Start Review"],
  UNDER_REVIEW: ["BID_DECISION_PENDING", "Request Bid Decision"],
  BID_APPROVED: ["PREPARING", "Begin Preparation"],
  PREPARING: ["READY_FOR_SUBMISSION", "Ready for Submission"],
};

export function TenderDetailPage() {
  const { companyId = "", tenderId = "" } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const activeMembershipId = useAuthStore((state) => state.memberships.find((membership) => membership.company.id === companyId)?.id);
  const [tab, setTab] = useState<Tab>("overview");
  const [confirm, setConfirm] = useState<
    "bid" | "no-bid" | "submit" | "award" | "lost" | null
  >(null);
  const [reason, setReason] = useState("");
  const [assessment, setAssessment] = useState<Record<string, string>>({
    strategicFit: "",
    clientRelationship: "",
    technicalCapability: "",
    resourceAvailability: "",
    competition: "",
    scheduleFeasibility: "",
    risk: "",
    paymentTerms: "",
    bondRequirements: "",
  });
  const [memberId, setMemberId] = useState("");
  const [teamRole, setTeamRole] = useState("");
  const [requirement, setRequirement] = useState("");
  const [requirementDraft, setRequirementDraft] = useState({ category: "", mandatory: false, responsibleMembershipId: "", dueDate: "", notes: "" });
  const [requirementFilter, setRequirementFilter] = useState("ALL");
  const [documentForm, setDocumentForm] = useState({ fileId: "", title: "", category: "OTHER" });
  const [visitForm, setVisitForm] = useState({ visitDate: new Date().toISOString().slice(0, 10), location: "", attendees: "", siteConditions: "", access: "", logistics: "", utilities: "", constraints: "", observations: "", notes: "" });
  const [meetingForm, setMeetingForm] = useState({ meetingDate: new Date().toISOString().slice(0, 10), location: "", participants: "", agenda: "", discussion: "", decisions: "", questions: "", actions: "", notes: "" });
  const [submission, setSubmission] = useState<{
    method: SubmissionMethod;
    reference: string;
    notes: string;
  }>({ method: "ONLINE_PORTAL", reference: "", notes: "" });
  const [award, setAward] = useState({
    awardDate: new Date().toISOString().slice(0, 10),
    awardValue: "",
    awardReference: "",
    notes: "",
  });
  const [loss, setLoss] = useState({
    lostDate: new Date().toISOString().slice(0, 10),
    lostReason: "",
    competitorCompanyId: "",
    notes: "",
  });
  const tender = useQuery({
    queryKey: ["tender", companyId, tenderId],
    queryFn: async () => (await getTender(companyId, tenderId)).data,
    enabled: Boolean(companyId && tenderId),
  });
  const team = useQuery({
    queryKey: ["tender-team", companyId, tenderId],
    queryFn: async () => (await listTenderTeam(companyId, tenderId)).data,
    enabled: Boolean(companyId && tenderId),
  });
  const requirements = useQuery({
    queryKey: ["tender-requirements", companyId, tenderId],
    queryFn: async () =>
      (await listTenderRequirements(companyId, tenderId)).data,
    enabled: Boolean(companyId && tenderId),
  });
  const documents = useQuery({
    queryKey: ["tender-documents", companyId, tenderId],
    queryFn: async () => (await listTenderAttachments(companyId, tenderId)).data,
    enabled: Boolean(companyId && tenderId && tab === "documents"),
  });
  const visits = useQuery({
    queryKey: ["tender-site-visits", companyId, tenderId],
    queryFn: async () => (await listTenderSiteVisits(companyId, tenderId)).data,
    enabled: Boolean(companyId && tenderId && tab === "site-visits"),
  });
  const meetings = useQuery({
    queryKey: ["tender-pre-bid-meetings", companyId, tenderId],
    queryFn: async () => (await listTenderPreBidMeetings(companyId, tenderId)).data,
    enabled: Boolean(companyId && tenderId && tab === "pre-bid"),
  });
  const members = useQuery({
    queryKey: ["opportunity-assignees", companyId],
    queryFn: async () => (await getOpportunityAssignees(companyId)).data,
    enabled: Boolean(companyId),
  });
  const competitors = useQuery({
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
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["tender", companyId, tenderId] }),
      qc.invalidateQueries({ queryKey: ["tenders", companyId] }),
      qc.invalidateQueries({ queryKey: ["tender-team", companyId, tenderId] }),
      qc.invalidateQueries({
        queryKey: ["tender-requirements", companyId, tenderId],
      }),
      qc.invalidateQueries({ queryKey: ["tender-documents", companyId, tenderId] }),
      qc.invalidateQueries({ queryKey: ["tender-site-visits", companyId, tenderId] }),
      qc.invalidateQueries({ queryKey: ["tender-pre-bid-meetings", companyId, tenderId] }),
    ]);
  };
  const action = useMutation({
    mutationFn: (job: () => Promise<unknown>) => job(),
    onSuccess: async (message: unknown) => {
      await refresh();
      toast.success(typeof message === "string" ? message : "Tender updated.");
      setConfirm(null);
    },
    onError: (error) => toast.error(userErrorMessage(error)),
  });
  if (tender.isLoading)
    return <p className="text-sm text-slate-500">Loading Tender…</p>;
  if (tender.isError || !tender.data)
    return <Alert>{userErrorMessage(tender.error)}</Alert>;
  const x = tender.data;
  const mandatory = requirements.data?.filter((r) => r.mandatory) ?? [];
  const complete = mandatory.filter((r) =>
    ["VERIFIED", "NOT_APPLICABLE"].includes(r.status),
  ).length;
  const requirementRows = (requirements.data ?? []).filter((item) => {
    if (requirementFilter === "MY") return item.responsibleMembershipId === activeMembershipId;
    if (requirementFilter === "MANDATORY") return item.mandatory;
    if (requirementFilter === "BLOCKED") return item.status === "BLOCKED";
    if (requirementFilter === "VERIFIED") return item.status === "VERIFIED";
    if (requirementFilter === "OVERDUE") return Boolean(item.dueDate && new Date(item.dueDate) < new Date() && !["VERIFIED", "NOT_APPLICABLE"].includes(item.status));
    return true;
  });
  const blocked = (requirements.data ?? []).filter((item) => item.status === "BLOCKED").length;
  const overdue = (requirements.data ?? []).filter((item) => item.dueDate && new Date(item.dueDate) < new Date() && !["VERIFIED", "NOT_APPLICABLE"].includes(item.status)).length;
  const closedTender = closed.has(x.status);
  const decision = (value: "BID" | "NO_BID") => {
    const values = Object.fromEntries(
      Object.entries(assessment)
        .filter(([, v]) => v !== "")
        .map(([k, v]) => [k, Number(v)]),
    );
    action.mutate(async () => {
      await recordBidDecision(companyId, tenderId, {
        decision: value,
        reason: value === "NO_BID" ? reason : undefined,
        assessment: values,
      });
      return value === "BID"
        ? "Bid decision recorded."
        : "No-Bid decision recorded.";
    });
  };
  return (
    <div>
      <Link
        to={`/companies/${companyId}/tenders`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tenders
      </Link>
      <PageHeader
        title={x.title}
        description={`${x.tenderNumber} · ${x.clientCompany?.name ?? "Client"}`}
        actions={
          !closedTender ? (
            <Link to={`/companies/${companyId}/tenders/${tenderId}/edit`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          ) : undefined
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone={tone(x.status)}>{statusLabel(x.status)}</Badge>
        <Badge
          tone={
            x.priority === "CRITICAL" || x.priority === "URGENT"
              ? "red"
              : x.priority === "HIGH"
                ? "amber"
                : "slate"
          }
        >
          {statusLabel(x.priority)} priority
        </Badge>
        <Badge tone={days(x).includes("Passed") ? "red" : "blue"}>
          {days(x)}
        </Badge>
        {closedTender ? <Badge tone="slate">Closed Tender</Badge> : null}
      </div>
      {action.isError ? (
        <div className="mb-4">
          <Alert>{userErrorMessage(action.error)}</Alert>
        </div>
      ) : null}
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(([key, name]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500"}`}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold">Tender summary</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {field("Client", x.clientCompany?.name)}
              {field("Project Type", x.projectType)}
              {field(
                "Location",
                [x.projectLocation, x.city].filter(Boolean).join(", "),
              )}
              {field(
                "Estimated Value",
                x.estimatedValue
                  ? `${x.currency} ${Number(x.estimatedValue).toLocaleString()}`
                  : null,
              )}
              {field("Issue Date", date(x.issueDate))}
              {field("Closing Date", date(x.closingDate))}
              {field(
                "Tender Manager",
                x.tenderManager
                  ? `${x.tenderManager.user.firstName} ${x.tenderManager.user.lastName}`
                  : null,
              )}
              {field("Bid Decision", x.bidDecision?.decision ?? "Pending")}
            </dl>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold">Lifecycle</h2>
            {transitions[x.status] && !closedTender ? (
              <Button
                disabled={action.isPending}
                onClick={() =>
                  action.mutate(async () => {
                    await changeTenderStatus(
                      companyId,
                      tenderId,
                      transitions[x.status]![0],
                    );
                    return `${transitions[x.status]![1]} completed.`;
                  })
                }
              >
                {transitions[x.status]![1]}
              </Button>
            ) : (
              <p className="text-sm text-slate-500">
                No ordinary lifecycle transition is available in this state.
              </p>
            )}
            <div className="mt-5 rounded-md bg-slate-50 p-3 text-sm">
              <p className="font-medium">Mandatory requirements</p>
              <p className="mt-1 text-slate-600">
                {complete} / {mandatory.length} complete
              </p>
            </div>
          </section>
        </div>
      ) : null}
      {tab === "information" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {field("Internal Reference", x.internalReference)}
            {field("Tender Type", x.tenderType)}
            {field("Clarification Deadline", date(x.clarificationDeadline))}
            {field("Opening Date", date(x.openingDate))}
            {field("Expected Award Date", date(x.expectedAwardDate))}
            {field("Currency", x.currency)}
          </dl>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>{field("Description", x.description)}</div>
            <div>{field("Scope Summary", x.scopeSummary)}</div>
          </div>
        </section>
      ) : null}
      {tab === "stakeholders" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            {field("Client", x.clientCompany?.name)}
            {field(
              "Primary Contact",
              x.primaryContact
                ? `${x.primaryContact.firstName} ${x.primaryContact.lastName ?? ""}`
                : null,
            )}
            {field(
              "Tender Manager",
              x.tenderManager
                ? `${x.tenderManager.user.firstName} ${x.tenderManager.user.lastName}`
                : null,
            )}
          </dl>
        </section>
      ) : null}
      {tab === "decision" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          {x.bidDecision ? (
            <div>
              <h2 className="font-semibold">
                {x.bidDecision.decision === "BID"
                  ? "Bid approved"
                  : "No-Bid recorded"}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {x.bidDecision.reason ||
                  x.bidDecision.notes ||
                  "No further notes recorded."}
              </p>
              {x.bidDecision.overallScore ? (
                <p className="mt-2 text-sm">
                  Overall assessment score: {x.bidDecision.overallScore}
                </p>
              ) : null}
            </div>
          ) : x.status === "BID_DECISION_PENDING" ? (
            <div>
              <h2 className="font-semibold">Bid Decision</h2>
              <p className="mt-1 text-sm text-slate-600">
                Score criteria from 0–10. Scoring informs but never
                automatically makes the decision.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {Object.entries(assessment).map(([key, value]) => (
                  <Input
                    key={key}
                    label={statusLabel(key)}
                    type="number"
                    min="0"
                    max="10"
                    value={value}
                    onChange={(e) =>
                      setAssessment({ ...assessment, [key]: e.target.value })
                    }
                  />
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  disabled={action.isPending}
                  onClick={() => setConfirm("bid")}
                >
                  Record Bid
                </Button>
                <Button
                  variant="danger"
                  disabled={action.isPending}
                  onClick={() => setConfirm("no-bid")}
                >
                  Record No-Bid
                </Button>
              </div>
            </div>
          ) : (
            <Alert tone="info">
              Bid/No-Bid is available when the Tender reaches Bid Decision
              Pending.
            </Alert>
          )}
        </section>
      ) : null}
      {tab === "team" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold">Tender Team</h2>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Select
              label="Team member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              options={[
                { value: "", label: "Select active member" },
                ...(members.data ?? []).map((m) => ({
                  value: m.id,
                  label: `${m.user.firstName} ${m.user.lastName}`,
                })),
              ]}
            />
            <Input
              label="Tender role"
              value={teamRole}
              onChange={(e) => setTeamRole(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                disabled={!memberId || !teamRole || action.isPending}
                onClick={() =>
                  action.mutate(async () => {
                    await assignTenderTeam(companyId, tenderId, {
                      membershipId: memberId,
                      role: teamRole,
                    });
                    setMemberId("");
                    setTeamRole("");
                    return "Team member assigned.";
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Assign
              </Button>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {(team.data ?? []).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-md border border-slate-200 p-3"
              >
                <span className="text-sm">
                  <strong>{m.role}</strong> · Member{" "}
                  {m.membershipId.slice(0, 8)} · {date(m.assignedAt)}
                </span>
                <Button
                  variant="ghost"
                  className="text-red-700"
                  disabled={action.isPending}
                  onClick={() =>
                    action.mutate(async () => {
                      await removeTenderTeam(companyId, tenderId, m.id);
                      return "Team member removed.";
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            {!team.data?.length ? (
              <p className="text-sm text-slate-500">
                No team members have been assigned.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      {tab === "documents" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Tender Documents</h2><p className="mt-1 text-sm text-slate-600">Attach an existing secure FileObject from the shared storage pipeline.</p></div><FileText className="h-6 w-6 text-primary-700" /></div>
          <div className="mt-4 grid gap-3 rounded-md bg-slate-50 p-4 md:grid-cols-4">
            <Input label="FileObject ID" value={documentForm.fileId} placeholder="File UUID" onChange={(e) => setDocumentForm({ ...documentForm, fileId: e.target.value })} />
            <Input label="Document title" value={documentForm.title} placeholder="Optional title" onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })} />
            <Select label="Category" value={documentForm.category} onChange={(e) => setDocumentForm({ ...documentForm, category: e.target.value })} options={DOCUMENT_CATEGORIES.map((value) => ({ value, label: statusLabel(value) }))} />
            <div className="flex items-end"><Button disabled={!documentForm.fileId || action.isPending} onClick={() => action.mutate(async () => { await attachTenderDocument(companyId, tenderId, { fileId: documentForm.fileId, title: documentForm.title || undefined, category: documentForm.category }); setDocumentForm({ fileId: "", title: "", category: "OTHER" }); return "Tender document attached."; })}>Attach document</Button></div>
          </div>
          {documents.isLoading ? <p className="mt-5 text-sm text-slate-500">Loading Tender documents…</p> : null}
          {documents.isError ? <div className="mt-5"><Alert>{userErrorMessage(documents.error)}</Alert></div> : null}
          <div className="mt-5 space-y-2">{(documents.data ?? []).map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 p-3"><div className="min-w-0"><p className="truncate font-medium">{document.title || document.fileObject.originalName}</p><p className="text-xs text-slate-500">{document.fileObject.originalName} · {document.category ? statusLabel(document.category) : "Other"} · {document.fileObject.mimeType} · {date(document.addedAt)}{document.fileObject.sizeBytes ? ` · ${Number(document.fileObject.sizeBytes).toLocaleString()} bytes` : ""}</p></div><div className="flex gap-2"><a className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium" href={document.fileObject.publicUrl || "#"} target="_blank" rel="noreferrer">Open</a><Button variant="ghost" className="text-red-700" disabled={action.isPending} onClick={() => { if (window.confirm("Remove this document from the Tender?")) action.mutate(async () => { await removeTenderDocument(companyId, tenderId, document.id); return "Tender document removed."; }); }}>Remove</Button></div></div>)}</div>
          {!documents.isLoading && !documents.isError && !documents.data?.length ? <p className="mt-5 text-sm text-slate-500">No Tender documents have been attached yet.</p> : null}
        </section>
      ) : null}
      {tab === "requirements" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Tender Requirement Register</h2><p className="mt-1 text-sm text-slate-600">{requirements.data?.length ?? 0} total · {mandatory.length} mandatory · {complete} mandatory complete · {blocked} blocked · {overdue} overdue · {mandatory.length ? Math.round((complete / mandatory.length) * 100) : 0}% complete</p></div><Select aria-label="Requirement filter" value={requirementFilter} onChange={(e) => setRequirementFilter(e.target.value)} options={[{ value: "ALL", label: "All requirements" }, { value: "MY", label: "My requirements" }, { value: "MANDATORY", label: "Mandatory" }, { value: "OVERDUE", label: "Overdue" }, { value: "BLOCKED", label: "Blocked" }, { value: "VERIFIED", label: "Verified" }]} /></div>
          <div className="mt-4 grid gap-3 rounded-md bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3"><Input label="Requirement *" value={requirement} placeholder="Requirement name" onChange={(e) => setRequirement(e.target.value)} /><Input label="Category" value={requirementDraft.category} onChange={(e) => setRequirementDraft({ ...requirementDraft, category: e.target.value })} /><Select label="Responsible person" value={requirementDraft.responsibleMembershipId} onChange={(e) => setRequirementDraft({ ...requirementDraft, responsibleMembershipId: e.target.value })} options={[{ value: "", label: "Unassigned" }, ...(members.data ?? []).map((member) => ({ value: member.id, label: `${member.user.firstName} ${member.user.lastName}` }))]} /><Input label="Due date" type="date" value={requirementDraft.dueDate} onChange={(e) => setRequirementDraft({ ...requirementDraft, dueDate: e.target.value })} /><label className="flex items-end gap-2 pb-2 text-sm font-medium"><input type="checkbox" checked={requirementDraft.mandatory} onChange={(e) => setRequirementDraft({ ...requirementDraft, mandatory: e.target.checked })} /> Mandatory requirement</label><label className="text-sm font-medium sm:col-span-2 lg:col-span-3">Notes<textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" value={requirementDraft.notes} onChange={(e) => setRequirementDraft({ ...requirementDraft, notes: e.target.value })} /></label><div><Button disabled={!requirement.trim() || action.isPending} onClick={() => action.mutate(async () => { await createTenderRequirement(companyId, tenderId, { name: requirement, ...requirementDraft, category: requirementDraft.category || undefined, responsibleMembershipId: requirementDraft.responsibleMembershipId || undefined, dueDate: requirementDraft.dueDate || undefined, notes: requirementDraft.notes || undefined }); setRequirement(""); setRequirementDraft({ category: "", mandatory: false, responsibleMembershipId: "", dueDate: "", notes: "" }); return "Requirement added."; })}>Add requirement</Button></div></div>
          <div className="mt-5 space-y-2">
            {requirementRows.map((r) => (
              <div
                key={r.id}
                className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <p className="font-medium text-sm">
                    {r.name}{" "}
                    {r.mandatory ? <Badge tone="amber">Mandatory</Badge> : null}
                  </p>
                  <p className="text-xs text-slate-500">{r.category || "Uncategorized"} · Due {date(r.dueDate)}{r.dueDate && new Date(r.dueDate) < new Date() && !["VERIFIED", "NOT_APPLICABLE"].includes(r.status) ? " · Overdue" : ""} · {r.responsibleMembershipId ? `Responsible member ${r.responsibleMembershipId.slice(0, 8)}` : "Unassigned"}{r.verifiedAt ? ` · Verified ${date(r.verifiedAt)}` : ""}</p>
                  {r.notes ? <p className="mt-1 text-xs text-slate-600">{r.notes}</p> : null}
                </div>
                <Select
                  aria-label={`${r.name} status`}
                  value={r.status}
                  onChange={(e) => {
                    if (e.target.value === "VERIFIED" && !window.confirm("Mark this Tender requirement as verified?")) return;
                    action.mutate(async () => {
                      await changeRequirementStatus(
                        companyId,
                        tenderId,
                        r.id,
                        e.target.value as RequirementStatus,
                      );
                      return "Requirement status updated.";
                    });
                  }}
                  options={[
                    "NOT_STARTED",
                    "IN_PROGRESS",
                    "READY",
                    "VERIFIED",
                    "NOT_APPLICABLE",
                    "BLOCKED",
                  ].map((s) => ({ value: s, label: statusLabel(s) }))}
                />
                <Badge
                  tone={
                    ["VERIFIED", "NOT_APPLICABLE"].includes(r.status)
                      ? "green"
                      : r.status === "BLOCKED"
                        ? "red"
                        : "slate"
                  }
                >
                  {statusLabel(r.status)}
                </Badge>
              </div>
            ))}
            {!requirements.data?.length ? (
              <p className="text-sm text-slate-500">
                No Tender requirements have been added.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      {tab === "site-visits" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Tender Site Visits</h2><p className="mt-1 text-sm text-slate-600">Record observed site conditions and operational constraints.</p></div><MapPin className="h-6 w-6 text-primary-700" /></div>
          <div className="mt-4 grid gap-3 rounded-md bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3"><Input label="Visit date *" type="date" value={visitForm.visitDate} onChange={(e) => setVisitForm({ ...visitForm, visitDate: e.target.value })} />{(["location", "attendees", "siteConditions", "access", "logistics", "utilities", "constraints", "observations", "notes"] as const).map((key) => <label key={key} className={key === "notes" || key === "observations" ? "sm:col-span-2 lg:col-span-3 text-sm font-medium" : "text-sm font-medium"}>{statusLabel(key)}<textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" value={visitForm[key]} onChange={(e) => setVisitForm({ ...visitForm, [key]: e.target.value })} /></label>)}<div><Button disabled={!visitForm.visitDate || action.isPending} onClick={() => action.mutate(async () => { await createTenderSiteVisit(companyId, tenderId, visitForm); setVisitForm({ ...visitForm, location: "", attendees: "", siteConditions: "", access: "", logistics: "", utilities: "", constraints: "", observations: "", notes: "" }); return "Site visit recorded."; })}>Record site visit</Button></div></div>
          {visits.isLoading ? <p className="mt-5 text-sm text-slate-500">Loading Tender site visits…</p> : null}{visits.isError ? <div className="mt-5"><Alert>{userErrorMessage(visits.error)}</Alert></div> : null}
          <div className="mt-5 grid gap-3 lg:grid-cols-2">{(visits.data ?? []).map((visit) => <article key={visit.id} className="rounded-md border border-slate-200 p-4"><p className="font-medium">{date(visit.visitDate)} {visit.location ? `· ${visit.location}` : ""}</p>{(["attendees", "siteConditions", "access", "logistics", "utilities", "constraints", "observations", "notes"] as const).filter((key) => visit[key]).map((key) => <p key={key} className="mt-2 text-sm text-slate-700"><strong>{statusLabel(key)}:</strong> {visit[key]}</p>)}</article>)}</div>{!visits.isLoading && !visits.isError && !visits.data?.length ? <p className="mt-5 text-sm text-slate-500">No Tender site visits have been recorded.</p> : null}
        </section>
      ) : null}
      {tab === "pre-bid" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Pre-Bid Meetings</h2><p className="mt-1 text-sm text-slate-600">Record meeting outcomes; actions remain recorded content until the shared task engine is available.</p></div><Users className="h-6 w-6 text-primary-700" /></div>
          <div className="mt-4 grid gap-3 rounded-md bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3"><Input label="Meeting date *" type="date" value={meetingForm.meetingDate} onChange={(e) => setMeetingForm({ ...meetingForm, meetingDate: e.target.value })} /><Input label="Location" value={meetingForm.location} onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })} />{(["participants", "agenda", "discussion", "decisions", "questions", "actions", "notes"] as const).map((key) => <label key={key} className="text-sm font-medium">{statusLabel(key)}<textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" value={meetingForm[key]} onChange={(e) => setMeetingForm({ ...meetingForm, [key]: e.target.value })} /></label>)}<div><Button disabled={!meetingForm.meetingDate || action.isPending} onClick={() => action.mutate(async () => { await createTenderPreBidMeeting(companyId, tenderId, meetingForm); setMeetingForm({ ...meetingForm, location: "", participants: "", agenda: "", discussion: "", decisions: "", questions: "", actions: "", notes: "" }); return "Pre-bid meeting recorded."; })}>Record meeting</Button></div></div>
          {meetings.isLoading ? <p className="mt-5 text-sm text-slate-500">Loading pre-bid meetings…</p> : null}{meetings.isError ? <div className="mt-5"><Alert>{userErrorMessage(meetings.error)}</Alert></div> : null}
          <div className="mt-5 grid gap-3 lg:grid-cols-2">{(meetings.data ?? []).map((meeting) => <article key={meeting.id} className="rounded-md border border-slate-200 p-4"><p className="font-medium">{date(meeting.meetingDate)} {meeting.location ? `· ${meeting.location}` : ""}</p>{(["participants", "agenda", "discussion", "decisions", "questions", "actions", "notes"] as const).filter((key) => meeting[key]).map((key) => <p key={key} className="mt-2 text-sm text-slate-700"><strong>{statusLabel(key)}:</strong> {meeting[key]}</p>)}</article>)}</div>{!meetings.isLoading && !meetings.isError && !meetings.data?.length ? <p className="mt-5 text-sm text-slate-500">No pre-bid meetings have been recorded.</p> : null}
        </section>
      ) : null}
      {tab === "submission" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Tender Submission</h2>
          <p className="mt-1 text-sm text-slate-600">
            Readiness: Bid decision{" "}
            {x.bidDecision?.decision === "BID"
              ? "permits bidding"
              : "is required"}
            ; mandatory requirements {complete}/{mandatory.length} complete.
          </p>
          {x.submissions?.length ? (
            <div className="mt-4 space-y-2">
              {x.submissions.map((s) => (
                <div key={s.id} className="rounded-md bg-slate-50 p-3 text-sm">
                  Submitted {date(s.submittedAt)} via {statusLabel(s.method)}
                  {s.reference ? ` · ${s.reference}` : ""}
                </div>
              ))}
            </div>
          ) : null}
          {x.status === "READY_FOR_SUBMISSION" ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Select
                label="Submission Method"
                value={submission.method}
                onChange={(e) =>
                  setSubmission({
                    ...submission,
                    method: e.target.value as SubmissionMethod,
                  })
                }
                options={[
                  "ONLINE_PORTAL",
                  "EMAIL",
                  "PHYSICAL",
                  "COURIER",
                  "OTHER",
                ].map((s) => ({ value: s, label: statusLabel(s) }))}
              />
              <Input
                label="Reference"
                value={submission.reference}
                onChange={(e) =>
                  setSubmission({ ...submission, reference: e.target.value })
                }
              />
              <label className="sm:col-span-2 text-sm font-medium">
                Notes
                <textarea
                  className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
                  value={submission.notes}
                  onChange={(e) =>
                    setSubmission({ ...submission, notes: e.target.value })
                  }
                />
              </label>
              <div>
                <Button
                  disabled={action.isPending}
                  onClick={() => setConfirm("submit")}
                >
                  Submit Tender
                </Button>
              </div>
            </div>
          ) : (
            <Alert tone="info">
              Move the Tender to Ready for Submission before recording the
              official submission.
            </Alert>
          )}
        </section>
      ) : null}
      {tab === "timeline" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Timeline</h2>
          <Alert tone="info">
            Tender audit history is not exposed by the 2.2.1A API yet, so this
            UI does not invent historical entries.
          </Alert>
        </section>
      ) : null}
      {x.status === "SUBMITTED" ||
      [
        "CLARIFICATION",
        "TECHNICAL_EVALUATION",
        "COMMERCIAL_EVALUATION",
        "NEGOTIATION",
      ].includes(x.status) ? (
        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="font-semibold text-emerald-900">Award Tender</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                label="Award Date"
                type="date"
                value={award.awardDate}
                onChange={(e) =>
                  setAward({ ...award, awardDate: e.target.value })
                }
              />
              <Input
                label="Award Value"
                type="number"
                min="0"
                value={award.awardValue}
                onChange={(e) =>
                  setAward({ ...award, awardValue: e.target.value })
                }
              />
              <Input
                label="Award Reference"
                value={award.awardReference}
                onChange={(e) =>
                  setAward({ ...award, awardReference: e.target.value })
                }
              />
            </div>
            <Button
              className="mt-3"
              disabled={
                !award.awardDate || !award.awardValue || action.isPending
              }
              onClick={() => setConfirm("award")}
            >
              Mark Awarded
            </Button>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <h2 className="font-semibold text-red-900">Mark Lost</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                label="Lost Date"
                type="date"
                value={loss.lostDate}
                onChange={(e) => setLoss({ ...loss, lostDate: e.target.value })}
              />
              <Input
                label="Lost Reason"
                value={loss.lostReason}
                onChange={(e) =>
                  setLoss({ ...loss, lostReason: e.target.value })
                }
              />
              <Select
                label="Competitor"
                value={loss.competitorCompanyId}
                onChange={(e) =>
                  setLoss({ ...loss, competitorCompanyId: e.target.value })
                }
                options={[
                  { value: "", label: "Not recorded" },
                  ...(competitors.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
              />
            </div>
            <Button
              variant="danger"
              className="mt-3"
              disabled={!loss.lostDate || !loss.lostReason || action.isPending}
              onClick={() => setConfirm("lost")}
            >
              Mark Lost
            </Button>
          </div>
        </section>
      ) : null}
      <ConfirmDialog
        open={confirm !== null && confirm !== "no-bid"}
        title={
          confirm === "submit"
              ? "Submit Tender?"
              : confirm === "award"
                ? "Mark Tender Awarded?"
                : confirm === "lost"
                  ? "Mark Tender Lost?"
                  : "Record Bid?"
        }
        description={
          confirm === "submit"
              ? `Submit Tender ${x.tenderNumber}? This records the Tender as officially submitted.`
              : "This important Tender decision will be recorded in the audit history."
        }
        confirmLabel={confirm === "submit" ? "Submit Tender" : "Confirm"}
        danger={confirm === "lost"}
        pending={action.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === "bid") decision("BID");
          else if (confirm === "submit")
            action.mutate(async () => {
              await submitTender(companyId, tenderId, {
                submittedAt: new Date().toISOString(),
                ...submission,
              });
              return "Tender submitted successfully.";
            });
          else if (confirm === "award")
            action.mutate(async () => {
              await awardTender(companyId, tenderId, {
                awardDate: award.awardDate,
                awardValue: Number(award.awardValue),
                awardReference: award.awardReference || undefined,
                notes: award.notes || undefined,
              });
              return "Tender awarded.";
            });
          else if (confirm === "lost")
            action.mutate(async () => {
              await loseTender(companyId, tenderId, {
                ...loss,
                competitorCompanyId: loss.competitorCompanyId || undefined,
                notes: loss.notes || undefined,
              });
              return "Tender marked lost.";
            });
        }}
      />
      {confirm === "no-bid" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-md bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Record No-Bid</h2>
            <p className="mt-1 text-sm text-slate-600">
              A No-Bid decision closes this Tender from active bidding. Provide the reason and confirm the decision.
            </p>
            <Input
              className="mt-4"
              label="No-Bid reason *"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                className="ml-2"
                variant="danger"
                disabled={!reason.trim() || action.isPending}
                onClick={() => decision("NO_BID")}
              >
                Record No-Bid
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
