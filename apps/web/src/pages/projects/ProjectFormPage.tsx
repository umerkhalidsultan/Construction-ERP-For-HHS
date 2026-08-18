import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  createProject,
  getProject,
  listProjectTypes,
  updateProject,
} from "../../services/projects.service";
import { useAuthStore } from "../../store/auth.store";

const schema = z
  .object({
    projectName: z
      .string()
      .min(2, "Enter a project name.")
      .max(255, "Project name must be 255 characters or fewer."),
    projectShortName: z.string().max(80).optional().or(z.literal("")),
    projectTypeId: z.string().uuid("Select a project type."),
    constructionTypeId: z.string().uuid().optional().or(z.literal("")),
    priority: z.string().min(1),
    projectManagerId: z.string().uuid("Select a project manager."),
    siteEngineerId: z.string().uuid().optional().or(z.literal("")),
    estimatedBudget: z.coerce
      .number()
      .min(0.01, "Estimated budget must be greater than zero."),
    approvedBudget: z.coerce.number().min(0).optional().or(z.nan()),
    currency: z.string().length(3, "Use a three-letter currency code."),
    contractType: z.string().min(1),
    contractNumber: z.string().optional(),
    projectStartDate: z.string().min(1, "Select a start date."),
    plannedCompletionDate: z
      .string()
      .min(1, "Select a planned completion date."),
    address: z.string().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().length(2, "Use a two-letter country code."),
    latitude: z.coerce.number().optional().or(z.nan()),
    longitude: z.coerce.number().optional().or(z.nan()),
    projectDescription: z.string().optional(),
    scopeOfWork: z.string().optional(),
    remarks: z.string().optional(),
    seedDefaultPhases: z.boolean().optional(),
  })
  .refine(
    (values) =>
      !values.projectStartDate ||
      !values.plannedCompletionDate ||
      values.plannedCompletionDate >= values.projectStartDate,
    {
      path: ["plannedCompletionDate"],
      message: "Planned completion must be on or after the start date.",
    },
  );

type FormValues = z.infer<typeof schema>;

export function ProjectFormPage() {
  const { companyId = "", projectId } = useParams();
  const isEdit = Boolean(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const membershipId = useAuthStore(
    (state) =>
      state.memberships.find((item) => item.company.id === companyId)?.id,
  );

  const typesQuery = useQuery({
    queryKey: ["project-types", companyId],
    queryFn: async () => (await listProjectTypes(companyId)).data,
    enabled: Boolean(companyId),
  });

  const projectQuery = useQuery({
    queryKey: ["project", companyId, projectId],
    queryFn: async () => (await getProject(companyId, projectId!)).data,
    enabled: isEdit,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectName: "",
      projectShortName: "",
      projectTypeId: "",
      constructionTypeId: "",
      priority: "MEDIUM",
      projectManagerId: membershipId ?? "",
      siteEngineerId: "",
      estimatedBudget: 1000000,
      currency: "USD",
      contractType: "LUMP_SUM",
      contractNumber: "",
      projectStartDate: new Date().toISOString().slice(0, 10),
      plannedCompletionDate: new Date(Date.now() + 180 * 86400000)
        .toISOString()
        .slice(0, 10),
      address: "",
      area: "",
      city: "",
      province: "",
      country: "PK",
      projectDescription: "",
      scopeOfWork: "",
      remarks: "",
      seedDefaultPhases: true,
    },
  });

  useEffect(() => {
    if (membershipId && !isEdit) {
      form.setValue("projectManagerId", membershipId);
    }
  }, [membershipId, isEdit, form]);

  useEffect(() => {
    const project = projectQuery.data;
    if (!project) return;
    form.reset({
      projectName: project.projectName,
      projectShortName: project.projectShortName ?? "",
      projectTypeId: project.projectTypeId,
      constructionTypeId: project.constructionTypeId ?? "",
      priority: project.priority,
      projectManagerId: project.projectManagerId,
      siteEngineerId: project.siteEngineerId ?? "",
      estimatedBudget: Number(project.estimatedBudget),
      approvedBudget: project.approvedBudget
        ? Number(project.approvedBudget)
        : undefined,
      currency: project.currency,
      contractType: project.contractType,
      contractNumber: project.contractNumber ?? "",
      projectStartDate: project.projectStartDate.slice(0, 10),
      plannedCompletionDate: project.plannedCompletionDate.slice(0, 10),
      address: project.address ?? "",
      area: project.area ?? "",
      city: project.city ?? "",
      province: project.province ?? "",
      country: project.country,
      latitude: project.latitude ? Number(project.latitude) : undefined,
      longitude: project.longitude ? Number(project.longitude) : undefined,
      projectDescription: project.projectDescription ?? "",
      scopeOfWork: project.scopeOfWork ?? "",
      remarks: project.remarks ?? "",
    });
  }, [projectQuery.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = {
        ...values,
        constructionTypeId: values.constructionTypeId || undefined,
        siteEngineerId: values.siteEngineerId || undefined,
        approvedBudget: Number.isFinite(values.approvedBudget)
          ? values.approvedBudget
          : undefined,
        latitude: Number.isFinite(values.latitude)
          ? values.latitude
          : undefined,
        longitude: Number.isFinite(values.longitude)
          ? values.longitude
          : undefined,
        projectShortName: values.projectShortName || undefined,
      };
      if (isEdit) {
        return updateProject(companyId, projectId!, body);
      }
      return createProject(companyId, body);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", companyId],
      });
      toast.success(isEdit ? "Project changes saved." : "Project created.");
      navigate(`/companies/${companyId}/projects/${response.data.id}`);
    },
    onError: (error) =>
      applyApiFieldErrors(
        form.setError,
        error instanceof ApiError ? error : {},
      ),
  });

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit project" : "Create project"}
        description="Projects are the parent record for BOQ, procurement, inventory, labor, and site reporting."
      />

      {mutation.isError ? (
        <div className="mb-4">
          <Alert>{userErrorMessage(mutation.error)}</Alert>
        </div>
      ) : null}

      <form
        noValidate
        className="space-y-4 border border-slate-200 bg-white p-5"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <FormErrorSummary
          messages={Object.values(form.formState.errors)
            .map((error) => error?.message)
            .filter((message): message is string => Boolean(message))}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Project name"
            error={form.formState.errors.projectName?.message}
            {...form.register("projectName")}
          />
          <Input
            label="Short name"
            error={form.formState.errors.projectShortName?.message}
            {...form.register("projectShortName")}
          />
          <Select
            label="Project type"
            error={form.formState.errors.projectTypeId?.message}
            options={[
              { value: "", label: "Select type" },
              ...(typesQuery.data ?? []).map((type) => ({
                value: type.id,
                label: type.name,
              })),
            ]}
            {...form.register("projectTypeId")}
          />
          <Select
            label="Priority"
            error={form.formState.errors.priority?.message}
            options={[
              { value: "LOW", label: "LOW" },
              { value: "MEDIUM", label: "MEDIUM" },
              { value: "HIGH", label: "HIGH" },
              { value: "CRITICAL", label: "CRITICAL" },
            ]}
            {...form.register("priority")}
          />
          <Input
            label="Project manager membership ID"
            error={form.formState.errors.projectManagerId?.message}
            {...form.register("projectManagerId")}
          />
          <Input
            label="Site engineer membership ID"
            error={form.formState.errors.siteEngineerId?.message}
            {...form.register("siteEngineerId")}
          />
          <Input
            label="Estimated budget"
            error={form.formState.errors.estimatedBudget?.message}
            type="number"
            step="0.01"
            {...form.register("estimatedBudget")}
          />
          <Input
            label="Approved budget"
            error={form.formState.errors.approvedBudget?.message}
            type="number"
            step="0.01"
            {...form.register("approvedBudget")}
          />
          <Input
            label="Currency"
            error={form.formState.errors.currency?.message}
            {...form.register("currency")}
          />
          <Select
            label="Contract type"
            error={form.formState.errors.contractType?.message}
            options={[
              { value: "LUMP_SUM", label: "LUMP_SUM" },
              { value: "UNIT_RATE", label: "UNIT_RATE" },
              { value: "COST_PLUS", label: "COST_PLUS" },
              { value: "EPC", label: "EPC" },
              { value: "DESIGN_BUILD", label: "DESIGN_BUILD" },
              { value: "TURNKEY", label: "TURNKEY" },
              { value: "REMEASUREMENT", label: "REMEASUREMENT" },
              { value: "OTHER", label: "OTHER" },
            ]}
            {...form.register("contractType")}
          />
          <Input label="Contract number" {...form.register("contractNumber")} />
          <Input
            label="Start date"
            error={form.formState.errors.projectStartDate?.message}
            type="date"
            {...form.register("projectStartDate")}
          />
          <Input
            label="Planned completion"
            error={form.formState.errors.plannedCompletionDate?.message}
            type="date"
            {...form.register("plannedCompletionDate")}
          />
          <Input
            label="Country (ISO2)"
            error={form.formState.errors.country?.message}
            {...form.register("country")}
          />
          <Input label="Province" {...form.register("province")} />
          <Input label="City" {...form.register("city")} />
          <Input label="Area" {...form.register("area")} />
          <Input label="Address" {...form.register("address")} />
          <Input
            label="Latitude"
            type="number"
            step="any"
            {...form.register("latitude")}
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            {...form.register("longitude")}
          />
        </div>
        <Input label="Description" {...form.register("projectDescription")} />
        <Input label="Scope of work" {...form.register("scopeOfWork")} />
        <Input label="Remarks" {...form.register("remarks")} />
        {!isEdit ? (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...form.register("seedDefaultPhases")} />
            Seed standard construction phases
          </label>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create project"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/companies/${companyId}/projects`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
