import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ApiError } from '../../lib/api-client';
import {
  createPhase,
  createTask,
  deletePhase,
  listPhases,
} from '../../services/projects.service';

export function ProjectPhasesPage() {
  const { companyId = '', projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskPhaseId, setTaskPhaseId] = useState('');

  const phasesQuery = useQuery({
    queryKey: ['project-phases', companyId, projectId],
    queryFn: async () => (await listPhases(companyId, projectId)).data,
    enabled: Boolean(companyId && projectId),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['project-phases', companyId, projectId],
    });
    await queryClient.invalidateQueries({
      queryKey: ['project-timeline', companyId, projectId],
    });
  };

  const createMutation = useMutation({
    mutationFn: async () =>
      createPhase(companyId, projectId, {
        code: code || name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 50),
        name,
      }),
    onSuccess: async () => {
      setName('');
      setCode('');
      await invalidate();
    },
  });

  const taskMutation = useMutation({
    mutationFn: async () =>
      createTask(companyId, projectId, taskPhaseId, { name: taskName }),
    onSuccess: async () => {
      setTaskName('');
      await invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (phaseId: string) =>
      deletePhase(companyId, projectId, phaseId),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      {(createMutation.error instanceof ApiError ||
        taskMutation.error instanceof ApiError) && (
        <Alert>
          {(createMutation.error as ApiError | null)?.message ||
            (taskMutation.error as ApiError | null)?.message}
        </Alert>
      )}

      <form
        className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <Input
          label="Phase name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          label="Code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Optional"
        />
        <div className="flex items-end md:col-span-2">
          <Button type="submit" disabled={createMutation.isPending || !name}>
            Add phase
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        {(phasesQuery.data ?? []).map((phase) => (
          <section
            key={phase.id}
            className="border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-slate-900">
                  {phase.name}{' '}
                  <span className="text-xs text-slate-500">({phase.code})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {Number(phase.completionPercentage).toFixed(1)}% · budget{' '}
                  {phase.budget ?? '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={statusTone(phase.status)}>{phase.status}</Badge>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Delete this phase?')) {
                      deleteMutation.mutate(phase.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
            <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
              {(phase.tasks ?? []).length === 0 ? (
                <li className="text-slate-500">No tasks</li>
              ) : (
                (phase.tasks ?? []).map((task) => (
                  <li key={task.id} className="flex justify-between gap-2">
                    <span>{task.name}</span>
                    <Badge tone={statusTone(task.status)}>{task.status}</Badge>
                  </li>
                ))
              )}
            </ul>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setTaskPhaseId(phase.id);
                taskMutation.mutate();
              }}
            >
              <Input
                label="New task"
                value={taskPhaseId === phase.id ? taskName : ''}
                onChange={(event) => {
                  setTaskPhaseId(phase.id);
                  setTaskName(event.target.value);
                }}
              />
              <div className="flex items-end">
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={!taskName || taskPhaseId !== phase.id}
                >
                  Add task
                </Button>
              </div>
            </form>
          </section>
        ))}
      </div>
    </div>
  );
}
