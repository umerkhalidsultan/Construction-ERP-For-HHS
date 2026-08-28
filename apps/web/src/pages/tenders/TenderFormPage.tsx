import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { FormErrorSummary } from "../../components/feedback/FormErrorSummary";
import { useToast } from "../../components/feedback/Toast";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { ApiError, userErrorMessage } from "../../lib/api-client";
import { applyApiFieldErrors } from "../../lib/errors/apply-field-errors";
import { listCrmCompanies, listCrmContacts } from "../../services/crm.service";
import { getOpportunityAssignees } from "../../services/opportunities.service";
import {
  createTender,
  getTender,
  getTenderPrefill,
  updateTender,
  type TenderInput,
} from "../../services/tenders.service";

const schema = z.object({
  title: z.string().min(1, "Tender Title is required.").max(255),
  internalReference: z.string().max(100).optional(),
  opportunityId: z.string().uuid().optional().or(z.literal("")),
  clientCompanyId: z.string().uuid("Please select a client."),
  primaryContactId: z.string().uuid().optional().or(z.literal("")),
  consultantCompanyId: z.string().uuid().optional().or(z.literal("")),
  architectCompanyId: z.string().uuid().optional().or(z.literal("")),
  tenderType: z.string().min(1, "Tender Type is required."),
  projectType: z.string().max(120).optional(),
  projectLocation: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  issueDate: z.string().optional(),
  closingDate: z.string().min(1, "Please enter a valid closing date."),
  clarificationDeadline: z.string().optional(),
  openingDate: z.string().optional(),
  expectedAwardDate: z.string().optional(),
  estimatedValue: z.coerce
    .number()
    .min(0, "Estimated Tender Value must be a valid amount.")
    .optional()
    .or(z.nan()),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code."),
  tenderManagerMembershipId: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"]),
  description: z.string().optional(),
  scopeSummary: z.string().optional(),
});
type Values = z.infer<typeof schema>;
const section = "rounded-lg border border-slate-200 bg-white p-5";
const date = (value?: string | null) => value?.slice(0, 10) ?? "";

export function TenderFormPage() {
  const { companyId = "", tenderId } = useParams();
  const [search] = useSearchParams();
  const opportunityId = search.get("opportunityId") ?? "";
  const edit = Boolean(tenderId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      internalReference: "",
      opportunityId: opportunityId,
      clientCompanyId: "",
      primaryContactId: "",
      consultantCompanyId: "",
      architectCompanyId: "",
      tenderType: "",
      projectType: "",
      projectLocation: "",
      city: "",
      issueDate: "",
      closingDate: "",
      clarificationDeadline: "",
      openingDate: "",
      expectedAwardDate: "",
      currency: "USD",
      tenderManagerMembershipId: "",
      priority: "MEDIUM",
      description: "",
      scopeSummary: "",
    },
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
  const selectedClient = form.watch("clientCompanyId");
  const contacts = useQuery({
    queryKey: ["crm-contact-options", companyId, selectedClient],
    queryFn: async () =>
      (
        await listCrmContacts(companyId, {
          limit: 100,
          crmCompanyId: selectedClient || undefined,
          sortBy: "firstName",
          sortOrder: "asc",
        })
      ).data,
    enabled: Boolean(companyId),
  });
  const members = useQuery({
    queryKey: ["opportunity-assignees", companyId],
    queryFn: async () => (await getOpportunityAssignees(companyId)).data,
    enabled: Boolean(companyId),
  });
  const tender = useQuery({
    queryKey: ["tender", companyId, tenderId],
    queryFn: async () => (await getTender(companyId, tenderId!)).data,
    enabled: edit,
  });
  const prefill = useQuery({
    queryKey: ["tender-prefill", companyId, opportunityId],
    queryFn: async () =>
      (await getTenderPrefill(companyId, opportunityId)).data,
    enabled: Boolean(!edit && companyId && opportunityId),
  });
  useEffect(() => {
    const x = tender.data;
    if (!x) return;
    form.reset({
      title: x.title,
      internalReference: x.internalReference ?? "",
      opportunityId: x.opportunityId ?? "",
      clientCompanyId: x.clientCompanyId,
      primaryContactId: x.primaryContactId ?? "",
      consultantCompanyId: x.consultantCompanyId ?? "",
      architectCompanyId: x.architectCompanyId ?? "",
      tenderType: x.tenderType,
      projectType: x.projectType ?? "",
      projectLocation: x.projectLocation ?? "",
      city: x.city ?? "",
      issueDate: date(x.issueDate),
      closingDate: date(x.closingDate),
      clarificationDeadline: date(x.clarificationDeadline),
      openingDate: date(x.openingDate),
      expectedAwardDate: date(x.expectedAwardDate),
      estimatedValue: x.estimatedValue ? Number(x.estimatedValue) : undefined,
      currency: x.currency,
      tenderManagerMembershipId: x.tenderManagerMembershipId ?? "",
      priority: x.priority,
      description: x.description ?? "",
      scopeSummary: x.scopeSummary ?? "",
    });
  }, [tender.data, form]);
  useEffect(() => {
    const x = prefill.data;
    if (!x) return;
    form.reset({
      ...form.getValues(),
      opportunityId: x.opportunityId,
      title: x.title,
      clientCompanyId: x.clientCompanyId ?? "",
      primaryContactId: x.primaryContactId ?? "",
      tenderType: x.tenderType,
      projectLocation: x.projectLocation ?? "",
      city: x.city ?? "",
      estimatedValue: x.estimatedValue ? Number(x.estimatedValue) : undefined,
      currency: x.currency,
      tenderManagerMembershipId: x.tenderManagerMembershipId ?? "",
      description: x.description ?? "",
    });
  }, [prefill.data, form]);
  const clean = (v: Values): TenderInput => ({
    ...v,
    opportunityId: v.opportunityId || undefined,
    internalReference: v.internalReference || undefined,
    primaryContactId: v.primaryContactId || undefined,
    consultantCompanyId: v.consultantCompanyId || undefined,
    architectCompanyId: v.architectCompanyId || undefined,
    projectType: v.projectType || undefined,
    projectLocation: v.projectLocation || undefined,
    city: v.city || undefined,
    issueDate: v.issueDate || undefined,
    clarificationDeadline: v.clarificationDeadline || undefined,
    openingDate: v.openingDate || undefined,
    expectedAwardDate: v.expectedAwardDate || undefined,
    tenderManagerMembershipId: v.tenderManagerMembershipId || undefined,
    description: v.description || undefined,
    scopeSummary: v.scopeSummary || undefined,
    estimatedValue: Number.isFinite(v.estimatedValue)
      ? v.estimatedValue
      : undefined,
  });
  const mutation = useMutation({
    mutationFn: (v: Values) =>
      edit
        ? updateTender(companyId, tenderId!, clean(v))
        : createTender(companyId, clean(v)),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["tenders", companyId] });
      toast.success(
        edit ? "Tender changes saved." : "Tender created successfully.",
      );
      navigate(`/companies/${companyId}/tenders/${res.data.id}`);
    },
    onError: (error) =>
      applyApiFieldErrors(
        form.setError,
        error instanceof ApiError ? error : {},
      ),
  });
  const errors = Object.values(form.formState.errors)
    .map((x) => x?.message)
    .filter((x): x is string => Boolean(x));
  return (
    <div>
      <PageHeader
        title={edit ? "Edit Tender" : "New Tender"}
        description={
          edit
            ? "Update permitted Tender information. Lifecycle state is controlled separately."
            : "Register a Tender. A company-scoped Tender number is generated when you save."
        }
      />
      {prefill.data ? (
        <div className="mb-4">
          <Alert tone="info">
            Tender details are pre-filled from the selected Opportunity. Review
            them before saving.
          </Alert>
        </div>
      ) : null}
      {prefill.isError || mutation.isError ? (
        <div className="mb-4">
          <Alert>{userErrorMessage(prefill.error ?? mutation.error)}</Alert>
        </div>
      ) : null}
      <form
        noValidate
        className="space-y-5"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        <FormErrorSummary messages={errors} />
        <section className={section}>
          <h2 className="mb-4 font-semibold">Tender overview</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Tender Title *"
              error={form.formState.errors.title?.message}
              {...form.register("title")}
            />
            <Input
              label="Internal Reference"
              {...form.register("internalReference")}
            />
            <Select
              label="Client *"
              error={form.formState.errors.clientCompanyId?.message}
              options={[
                { value: "", label: "Select client" },
                ...(clients.data ?? []).map((x) => ({
                  value: x.id,
                  label: x.name,
                })),
              ]}
              {...form.register("clientCompanyId")}
            />
            <Select
              label="Primary Contact"
              options={[
                { value: "", label: "No contact selected" },
                ...(contacts.data ?? []).map((x) => ({
                  value: x.id,
                  label: `${x.firstName} ${x.lastName ?? ""}`,
                })),
              ]}
              {...form.register("primaryContactId")}
            />
            <Select
              label="Consultant"
              options={[
                { value: "", label: "None" },
                ...(clients.data ?? []).map((x) => ({
                  value: x.id,
                  label: x.name,
                })),
              ]}
              {...form.register("consultantCompanyId")}
            />
            <Select
              label="Architect"
              options={[
                { value: "", label: "None" },
                ...(clients.data ?? []).map((x) => ({
                  value: x.id,
                  label: x.name,
                })),
              ]}
              {...form.register("architectCompanyId")}
            />
            <Input
              label="Tender Type *"
              error={form.formState.errors.tenderType?.message}
              {...form.register("tenderType")}
            />
            <Input label="Project Type" {...form.register("projectType")} />
          </div>
        </section>
        <section className={section}>
          <h2 className="mb-4 font-semibold">Schedule &amp; value</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Project Location"
              {...form.register("projectLocation")}
            />
            <Input label="City" {...form.register("city")} />
            <Input
              label="Issue Date"
              type="date"
              {...form.register("issueDate")}
            />
            <Input
              label="Closing Date *"
              type="date"
              error={form.formState.errors.closingDate?.message}
              {...form.register("closingDate")}
            />
            <Input
              label="Clarification Deadline"
              type="date"
              {...form.register("clarificationDeadline")}
            />
            <Input
              label="Opening Date"
              type="date"
              {...form.register("openingDate")}
            />
            <Input
              label="Expected Award Date"
              type="date"
              {...form.register("expectedAwardDate")}
            />
            <Input
              label="Estimated Tender Value"
              type="number"
              min="0"
              step="0.01"
              error={form.formState.errors.estimatedValue?.message}
              {...form.register("estimatedValue")}
            />
            <Input
              label="Currency *"
              maxLength={3}
              error={form.formState.errors.currency?.message}
              {...form.register("currency")}
            />
            <Select
              label="Tender Manager"
              options={[
                { value: "", label: "Unassigned" },
                ...(members.data ?? []).map((x) => ({
                  value: x.id,
                  label: `${x.user.firstName} ${x.user.lastName}`,
                })),
              ]}
              {...form.register("tenderManagerMembershipId")}
            />
            <Select
              label="Priority"
              options={["LOW", "MEDIUM", "HIGH", "URGENT", "CRITICAL"].map(
                (x) => ({ value: x, label: x }),
              )}
              {...form.register("priority")}
            />
          </div>
        </section>
        <section className={section}>
          <h2 className="mb-4 font-semibold">Scope</h2>
          <div className="grid gap-4">
            <label className="block text-sm font-medium text-slate-700">
              Description
              <textarea
                className="mt-1.5 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register("description")}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Scope Summary
              <textarea
                className="mt-1.5 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...form.register("scopeSummary")}
              />
            </label>
          </div>
        </section>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : edit
                ? "Save changes"
                : "Create Tender"}
          </Button>
        </div>
      </form>
    </div>
  );
}
