import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ApiError } from '../../lib/api-client';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendar,
} from '../../services/projects.service';
import type { ProjectCalendarEvent } from '../../types/api';

const EVENT_TYPES = [
  'HOLIDAY',
  'MILESTONE',
  'MEETING',
  'INSPECTION',
  'DELIVERY',
  'WORKING_DAY_OVERRIDE',
  'OTHER',
];

export function ProjectCalendarPage() {
  const { companyId = '', projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('MEETING');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const calendarQuery = useQuery({
    queryKey: ['project-calendar', companyId, projectId],
    queryFn: async () => (await listCalendar(companyId, projectId)).data,
    enabled: Boolean(companyId && projectId),
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      createCalendarEvent(companyId, projectId, {
        title,
        eventType,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        allDay: false,
      }),
    onSuccess: async () => {
      setTitle('');
      await queryClient.invalidateQueries({
        queryKey: ['project-calendar', companyId, projectId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) =>
      deleteCalendarEvent(companyId, projectId, eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['project-calendar', companyId, projectId],
      });
    },
  });

  return (
    <div className="space-y-4">
      {createMutation.error instanceof ApiError ? (
        <Alert>{createMutation.error.message}</Alert>
      ) : null}

      <form
        className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <Select
          label="Type"
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
          options={EVENT_TYPES.map((item) => ({ value: item, label: item }))}
        />
        <Input
          label="Starts"
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          required
        />
        <Input
          label="Ends"
          type="datetime-local"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
        />
        <div className="flex items-end">
          <Button type="submit" disabled={createMutation.isPending}>
            Add event
          </Button>
        </div>
      </form>

      <DataTable<ProjectCalendarEvent>
        isLoading={calendarQuery.isLoading}
        rows={calendarQuery.data ?? []}
        emptyMessage="No calendar events. Google Calendar sync is reserved for a later release."
        columns={[
          {
            key: 'title',
            header: 'Title',
            render: (row) => row.title,
          },
          {
            key: 'type',
            header: 'Type',
            render: (row) => <Badge tone="neutral">{row.eventType}</Badge>,
          },
          {
            key: 'starts',
            header: 'Starts',
            render: (row) => new Date(row.startsAt).toLocaleString(),
          },
          {
            key: 'ends',
            header: 'Ends',
            render: (row) =>
              row.endsAt ? new Date(row.endsAt).toLocaleString() : '—',
          },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <Button
                variant="ghost"
                onClick={() => deleteMutation.mutate(row.id)}
              >
                Delete
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
