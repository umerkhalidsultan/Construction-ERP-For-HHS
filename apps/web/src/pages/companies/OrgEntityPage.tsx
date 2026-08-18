import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { z } from "zod";
import { ConfirmDialog } from "../../components/feedback/ConfirmDialog";
import { FormErrorSummary } from "../../components/feedback/FormErrorSummary";
import { useToast } from "../../components/feedback/Toast";
import { Alert } from "../../components/ui/Alert";
import { Badge, statusTone } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DataTable } from "../../components/ui/DataTable";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { ApiError } from "../../lib/api-client";
import { userErrorMessage } from "../../lib/api-client";
import { applyApiFieldErrors } from "../../lib/errors/apply-field-errors";
import {
  branchesApi,
  costCentersApi,
  departmentsApi,
  designationsApi,
} from "../../services/companies.service";

type EntityKind = "branches" | "departments" | "designations" | "cost-centers";

const baseSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Z0-9][A-Z0-9_-]{1,49}$/, "Use uppercase codes like HO-01"),
  name: z.string().min(2).max(160),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  type: z.string().optional(),
});

type FormValues = z.infer<typeof baseSchema>;

type EntityApi = {
  list: (
    companyId: string,
    params?: { limit?: number },
  ) => Promise<{ data: Array<{ id: string } & Record<string, unknown>> }>;
  create: (
    companyId: string,
    body: Record<string, unknown>,
  ) => Promise<unknown>;
  update: (
    companyId: string,
    id: string,
    body: Record<string, unknown>,
  ) => Promise<unknown>;
  remove: (companyId: string, id: string) => Promise<unknown>;
};

const configs: Record<
  EntityKind,
  {
    title: string;
    description: string;
    codeLabel: string;
    api: EntityApi;
    mapCreate: (values: FormValues) => Record<string, unknown>;
    showType?: boolean;
  }
> = {
  branches: {
    title: "Branches",
    description: "Physical or commercial operating locations for the company.",
    codeLabel: "Branch code",
    api: branchesApi as unknown as EntityApi,
    mapCreate: (values) => ({
      branchCode: values.code,
      name: values.name,
      status: values.status,
      address: values.description || undefined,
    }),
  },
  departments: {
    title: "Departments",
    description: "Functional departments and reporting ownership units.",
    codeLabel: "Department code",
    api: departmentsApi as unknown as EntityApi,
    mapCreate: (values) => ({
      departmentCode: values.code,
      name: values.name,
      description: values.description || undefined,
      status: values.status,
    }),
  },
  designations: {
    title: "Designations",
    description: "Job titles used across HR, projects, and reporting.",
    codeLabel: "Designation code",
    api: designationsApi as unknown as EntityApi,
    mapCreate: (values) => ({
      code: values.code,
      name: values.name,
      description: values.description || undefined,
      status: values.status,
    }),
  },
  "cost-centers": {
    title: "Cost centers",
    description:
      "Accounting-ready cost centers for projects, warehouses, and administration.",
    codeLabel: "Cost center code",
    api: costCentersApi as unknown as EntityApi,
    showType: true,
    mapCreate: (values) => ({
      code: values.code,
      name: values.name,
      type: values.type || "ADMINISTRATION",
      description: values.description || undefined,
      status: values.status,
    }),
  },
};

export function OrgEntityPage({ kind }: { kind: EntityKind }) {
  const { companyId = "" } = useParams();
  const config = configs[kind];
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const toast = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      status: "ACTIVE",
      type: "ADMINISTRATION",
    },
  });

  const listQuery = useQuery({
    queryKey: [kind, companyId],
    queryFn: async () =>
      (await config.api.list(companyId, { limit: 100 })).data,
    enabled: Boolean(companyId),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = config.mapCreate(values);
      if (editingId) {
        return config.api.update(companyId, editingId, body);
      }
      return config.api.create(companyId, body);
    },
    onSuccess: async () => {
      setFormOpen(false);
      setEditingId(null);
      form.reset({ status: "ACTIVE", type: "ADMINISTRATION" });
      await queryClient.invalidateQueries({ queryKey: [kind, companyId] });
      toast.success(`${config.title.slice(0, -1)} saved.`);
    },
    onError: (error) =>
      applyApiFieldErrors(
        form.setError,
        error instanceof ApiError ? error : {},
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => config.api.remove(companyId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [kind, companyId] });
      toast.success(`${config.title.slice(0, -1)} archived.`);
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <Button
            onClick={() => {
              setEditingId(null);
              form.reset({ status: "ACTIVE", type: "ADMINISTRATION" });
              setFormOpen(true);
            }}
          >
            Add {config.title.slice(0, -1).toLowerCase()}
          </Button>
        }
      />

      {(saveMutation.isError || deleteMutation.isError) && (
        <Alert>
          {(saveMutation.error ?? deleteMutation.error) instanceof ApiError
            ? ((saveMutation.error ?? deleteMutation.error) as ApiError).message
            : userErrorMessage(saveMutation.error ?? deleteMutation.error)}
        </Alert>
      )}

      {formOpen ? (
        <form
          noValidate
          className="space-y-4 border border-slate-200 bg-white p-5"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <FormErrorSummary
            messages={Object.values(form.formState.errors)
              .map((error) => error?.message)
              .filter((message): message is string => Boolean(message))}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={config.codeLabel}
              error={form.formState.errors.code?.message}
              {...form.register("code")}
            />
            <Input
              label="Name"
              error={form.formState.errors.name?.message}
              {...form.register("name")}
            />
            {config.showType ? (
              <Select
                label="Type"
                options={[
                  { label: "Project", value: "PROJECT" },
                  { label: "Head office", value: "HEAD_OFFICE" },
                  { label: "Warehouse", value: "WAREHOUSE" },
                  { label: "Equipment", value: "EQUIPMENT" },
                  { label: "Administration", value: "ADMINISTRATION" },
                  { label: "Other", value: "OTHER" },
                ]}
                {...form.register("type")}
              />
            ) : null}
            <Select
              label="Status"
              options={[
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ]}
              {...form.register("status")}
            />
            <Input
              label="Description / address"
              className="md:col-span-2"
              {...form.register("description")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      ) : null}

      <DataTable
        isLoading={listQuery.isLoading}
        error={listQuery.isError ? userErrorMessage(listQuery.error) : null}
        onRetry={() => void listQuery.refetch()}
        rows={
          (listQuery.data ?? []) as Array<
            { id: string } & Record<string, unknown>
          >
        }
        columns={[
          {
            key: "code",
            header: "Code",
            render: (row) =>
              String(row.branchCode ?? row.departmentCode ?? row.code ?? ""),
          },
          {
            key: "name",
            header: "Name",
            render: (row) => String(row.name ?? ""),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <Badge tone={statusTone(String(row.status))}>
                {String(row.status)}
              </Badge>
            ),
          },
          {
            key: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingId(row.id);
                    form.reset({
                      code: String(
                        row.branchCode ?? row.departmentCode ?? row.code ?? "",
                      ),
                      name: String(row.name ?? ""),
                      description: String(row.description ?? row.address ?? ""),
                      status: (row.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
                      type: String(row.type ?? "ADMINISTRATION"),
                    });
                    setFormOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => setArchiveId(row.id)}>
                  Archive
                </Button>
              </div>
            ),
          },
        ]}
      />
      <ConfirmDialog
        open={Boolean(archiveId)}
        title={`Archive ${config.title.slice(0, -1).toLowerCase()}?`}
        description="This record will no longer be available for new assignments."
        confirmLabel="Archive"
        danger
        pending={deleteMutation.isPending}
        onCancel={() => setArchiveId(null)}
        onConfirm={() => {
          if (archiveId) deleteMutation.mutate(archiveId);
          setArchiveId(null);
        }}
      />
    </div>
  );
}
