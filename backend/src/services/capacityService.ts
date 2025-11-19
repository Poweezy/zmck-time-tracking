import { addWeeks, endOfMonth, endOfWeek, isValid, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { db } from '../db';

const DEFAULT_WEEKLY_HOURS = Number(process.env.CAPACITY_DEFAULT_WEEKLY_HOURS || 40);
const DEFAULT_MONTH_WEEKS = Number(process.env.CAPACITY_WEEKS_PER_MONTH || 4);
const DEFAULT_TASK_ESTIMATE = Number(process.env.CAPACITY_DEFAULT_TASK_ESTIMATE || 6);
const ALERT_WARNING_THRESHOLD = Number(process.env.CAPACITY_ALERT_WARNING || 0.9);
const ALERT_CRITICAL_THRESHOLD = Number(process.env.CAPACITY_ALERT_CRITICAL || 1.1);
const MAX_FORECAST_WEEKS = 8;
const ACTIVE_TASK_STATUSES = ['todo', 'in_progress', 'review'];

type AlertLevel = 'normal' | 'warning' | 'critical';
type AllocationStatus = 'light' | 'balanced' | 'tight' | 'overbooked';

interface SummaryOptions {
  from?: string;
  to?: string;
  userId?: number;
}

interface ForecastOptions {
  start?: string;
  weeks?: number;
  userId?: number;
  includeProjectMix?: boolean;
}

const parseDateOr = (value: string | undefined, fallback: Date): Date => {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
};

const getDefaultPeriod = () => {
  const now = new Date();
  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
  };
};

const getEngineerQuery = (userId?: number) => {
  const query = db('users')
    .select('id', 'first_name', 'last_name', 'role')
    .where({ is_active: true, role: 'engineer' });

  if (userId) {
    query.andWhere('id', userId);
  }

  return query;
};

const ratioToAlert = (ratio: number): AlertLevel => {
  if (ratio >= ALERT_CRITICAL_THRESHOLD) return 'critical';
  if (ratio >= ALERT_WARNING_THRESHOLD) return 'warning';
  return 'normal';
};

const ratioToStatus = (ratio: number): AllocationStatus => {
  if (ratio >= ALERT_CRITICAL_THRESHOLD) return 'overbooked';
  if (ratio >= ALERT_WARNING_THRESHOLD) return 'tight';
  if (ratio >= 0.5) return 'balanced';
  return 'light';
};

const nextWeekStart = () => {
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  if (now.getDay() === 1 && now.getHours() < 12) {
    return currentWeekStart;
  }

  return addWeeks(currentWeekStart, 1);
};

export const getCapacitySummary = async (options: SummaryOptions) => {
  const defaultPeriod = getDefaultPeriod();
  const fromDate = parseDateOr(options.from, defaultPeriod.from);
  const toDate = parseDateOr(options.to, defaultPeriod.to);

  const engineers = await getEngineerQuery(options.userId);

  if (!engineers.length) {
    return {
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      teamTotals: { capacityHours: 0, loggedHours: 0, avgUtilization: 0 },
      members: [],
    };
  }

  const engineerIds = engineers.map((engineer) => engineer.id);

  const timeEntries = await db('time_entries')
    .whereIn('user_id', engineerIds)
    .andWhere('approval_status', 'approved')
    .andWhereBetween('start_time', [fromDate.toISOString(), toDate.toISOString()])
    .select('user_id')
    .sum({ logged: 'duration_hours' })
    .groupBy('user_id');

  const tasksSummary = await db('tasks')
    .whereIn('assigned_to', engineerIds)
    .groupBy('assigned_to')
    .select('assigned_to as user_id')
    .count<{ user_id: number; task_count: string }[]>({ task_count: '*' })
    .countDistinct<{ user_id: number; project_count: string }[]>({ project_count: 'project_id' });

  const loggedMap = new Map<number, number>();
  timeEntries.forEach((row: any) => {
    loggedMap.set(row.user_id, parseFloat(row.logged) || 0);
  });

  const taskMap = new Map<
    number,
    {
      tasks: number;
      projects: number;
    }
  >();

  tasksSummary.forEach((row: any) => {
    taskMap.set(row.user_id, {
      tasks: parseInt(row.task_count, 10) || 0,
      projects: parseInt(row.project_count, 10) || 0,
    });
  });

  const monthlyCapacity = DEFAULT_WEEKLY_HOURS * DEFAULT_MONTH_WEEKS;

  let totalCapacity = 0;
  let totalLogged = 0;

  const members = engineers.map((engineer) => {
    const logged = parseFloat(String(loggedMap.get(engineer.id) || 0));
    const utilizationRatio = monthlyCapacity ? logged / monthlyCapacity : 0;
    const alert = ratioToAlert(utilizationRatio);
    const stats = taskMap.get(engineer.id) || { tasks: 0, projects: 0 };

    totalCapacity += monthlyCapacity;
    totalLogged += logged;

    return {
      userId: engineer.id,
      name: `${engineer.first_name} ${engineer.last_name}`,
      role: engineer.role,
      projects: stats.projects,
      tasks: stats.tasks,
      loggedHours: parseFloat(logged.toFixed(2)),
      capacityHours: monthlyCapacity,
      utilization: parseFloat((utilizationRatio * 100).toFixed(1)),
      alert,
    };
  });

  const avgUtilization = totalCapacity ? parseFloat(((totalLogged / totalCapacity) * 100).toFixed(1)) : 0;

  return {
    period: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    },
    teamTotals: {
      capacityHours: totalCapacity,
      loggedHours: parseFloat(totalLogged.toFixed(2)),
      avgUtilization,
    },
    members,
  };
};

export const getCapacityForecast = async (options: ForecastOptions) => {
  const weekCount = Math.min(Math.max(options.weeks ?? 4, 1), MAX_FORECAST_WEEKS);
  const start = parseDateOr(options.start, nextWeekStart());
  const forecastStart = startOfWeek(start, { weekStartsOn: 1 });

  const engineers = await getEngineerQuery(options.userId);
  if (!engineers.length) {
    return {
      window: {
        start: forecastStart.toISOString(),
        weeks: weekCount,
        weekStartsOn: 1,
      },
      weeks: [],
    };
  }

  const engineerIds = engineers.map((engineer) => engineer.id);

  const tasks = await db('tasks')
    .leftJoin('projects', 'tasks.project_id', 'projects.id')
    .select(
      'tasks.id',
      'tasks.assigned_to',
      'tasks.project_id',
      'tasks.estimated_hours',
      'tasks.due_date',
      'tasks.status',
      'projects.name as project_name'
    )
    .whereIn('tasks.assigned_to', engineerIds)
    .whereIn('tasks.status', ACTIVE_TASK_STATUSES);

  const tasksByUser = tasks.reduce<Record<number, any[]>>((acc, task) => {
    if (!task.assigned_to) {
      return acc;
    }
    if (!acc[task.assigned_to]) {
      acc[task.assigned_to] = [];
    }
    acc[task.assigned_to].push(task);
    return acc;
  }, {});

  const weeks = Array.from({ length: weekCount }, (_, index) => {
    const weekStart = addWeeks(forecastStart, index);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const allocations = engineers
      .map((engineer) => {
        const userTasks = tasksByUser[engineer.id] || [];
        if (!userTasks.length) {
          return null;
        }

        const aggregate = userTasks.reduce(
          (acc, task) => {
            const estimate = parseFloat(task.estimated_hours) || DEFAULT_TASK_ESTIMATE;
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const fallsWithin =
              dueDate && dueDate instanceof Date && !Number.isNaN(dueDate.valueOf())
                ? dueDate >= weekStart && dueDate <= weekEnd
                : index === 0;

            if (fallsWithin) {
              acc.hours += estimate;
              const projectName = task.project_name || `Project #${task.project_id}`;
              acc.projects[projectName] = (acc.projects[projectName] || 0) + estimate;
            }

            return acc;
          },
          { hours: 0, projects: {} as Record<string, number> }
        );

        if (!aggregate.hours) {
          return null;
        }

        const ratio = aggregate.hours / DEFAULT_WEEKLY_HOURS;
        const utilization = Math.round(ratio * 100);

        return {
          userId: engineer.id,
          name: `${engineer.first_name} ${engineer.last_name}`,
          hours: parseFloat(aggregate.hours.toFixed(1)),
          utilization,
          status: ratioToStatus(ratio),
          projects: aggregate.projects,
        };
      })
      .filter(Boolean) as Array<{
        userId: number;
        name: string;
        hours: number;
        utilization: number;
        status: AllocationStatus;
        projects: Record<string, number>;
      }>;

    const statusPriority: Record<AllocationStatus, number> = {
      light: 0,
      balanced: 1,
      tight: 2,
      overbooked: 3,
    };

    const health =
      allocations.length === 0
        ? 'light'
        : allocations.reduce((current, allocation) => {
            return statusPriority[allocation.status] > statusPriority[current] ? allocation.status : current;
          }, 'light' as AllocationStatus);

    return {
      id: `week-${index}`,
      label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(
        'en-US',
        { month: 'short', day: 'numeric' }
      )}`,
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      health,
      allocations: allocations.map((allocation) => ({
        userId: allocation.userId,
        name: allocation.name,
        hours: allocation.hours,
        utilization: allocation.utilization,
        status: allocation.status,
        topProjects: options.includeProjectMix
          ? Object.entries(allocation.projects)
              .map(([project, hours]) => ({
                project,
                hours: parseFloat(hours.toFixed(1)),
              }))
              .sort((a, b) => b.hours - a.hours)
              .slice(0, 4)
          : undefined,
      })),
    };
  });

  return {
    window: {
      start: forecastStart.toISOString(),
      weeks: weekCount,
      weekStartsOn: 1,
    },
    weeks,
  };
};


