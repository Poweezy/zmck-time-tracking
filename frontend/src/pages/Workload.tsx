import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { addWeeks, endOfWeek, format, isWithinInterval, startOfWeek } from 'date-fns';

interface UserWorkload {
  userId: number;
  userName: string;
  totalHours: number;
  capacity: number;
  utilization: number;
  projects: number;
  tasks: number;
}

interface ResourceAllocation {
  userId: number;
  userName: string;
  hours: number;
  utilization: number;
  status: 'light' | 'balanced' | 'tight' | 'overbooked';
}

interface ResourceWeek {
  id: string;
  label: string;
  start: Date;
  end: Date;
  health: ResourceAllocation['status'];
  allocations: ResourceAllocation[];
}

interface ProjectAllocation {
  project: string;
  hours: number;
}

type SelectedUser = number | 'all';

const HOURS_PER_WEEK = 40;
const DEFAULT_TASK_ESTIMATE = 6;
const PLANNING_WEEKS = 4;

const getStatusFromUtilization = (utilization: number): ResourceAllocation['status'] => {
  if (utilization >= 110) return 'overbooked';
  if (utilization >= 85) return 'tight';
  if (utilization >= 50) return 'balanced';
  return 'light';
};

const getWeekBadgeStyles = (status: ResourceAllocation['status']) => {
  switch (status) {
    case 'overbooked':
      return 'bg-red-100 text-red-700 border border-red-200';
    case 'tight':
      return 'bg-orange-100 text-orange-700 border border-orange-200';
    case 'balanced':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    default:
      return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
  }
};

const describeStatus = (status: ResourceAllocation['status']) => {
  switch (status) {
    case 'overbooked':
      return '⚠️ Over capacity';
    case 'tight':
      return 'High demand';
    case 'balanced':
      return 'On track';
    default:
      return 'Available capacity';
  }
};

const Workload = () => {
  const [workload, setWorkload] = useState<UserWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceTimeline, setResourceTimeline] = useState<ResourceWeek[]>([]);
  const [projectBreakdown, setProjectBreakdown] = useState<Record<number, ProjectAllocation[]>>({});
  const [selectedUserId, setSelectedUserId] = useState<SelectedUser>('all');
  const [capacityAlerts, setCapacityAlerts] = useState<UserWorkload[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchWorkload();
  }, []);

  const fetchWorkload = async () => {
    try {
      setLoading(true);
      // Get all users
      const usersResponse = await api.get('/users');
      const users = usersResponse.data.data || usersResponse.data;

      const [timeEntriesResponse, tasksResponse] = await Promise.all([
        api.get('/time-entries', {
          params: {
            // Current month window
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
            to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
          },
        }),
        api.get('/tasks'),
      ]);

      const timeEntries = timeEntriesResponse.data.data || timeEntriesResponse.data;
      const allTasks = tasksResponse.data.data || tasksResponse.data;

      const engineers = users.filter((u: any) => u.role === 'engineer' && u.is_active);
      const tasksByUser = allTasks.reduce((acc: Record<number, any[]>, task: any) => {
        if (!task.assigned_to) {
          return acc;
        }
        if (!acc[task.assigned_to]) {
          acc[task.assigned_to] = [];
        }
        acc[task.assigned_to].push(task);
        return acc;
      }, {});

      // Calculate workload for each user
      const workloadData: UserWorkload[] = engineers.map((engineer: any) => {
          const userEntries = timeEntries.filter((te: any) => te.user_id === engineer.id);
          const totalHours = userEntries.reduce((sum: number, te: any) => sum + parseFloat(te.duration_hours || 0), 0);
          
          const userTasks = tasksByUser[engineer.id] || [];
          const userProjects = [...new Set(userTasks.map((t: any) => t.project_id))];

          // Assume 160 hours per month capacity (40 hours/week * 4 weeks)
          const capacity = 160;
          const utilization = (totalHours / capacity) * 100;

          return {
            userId: engineer.id,
            userName: `${engineer.first_name} ${engineer.last_name}`,
            totalHours: parseFloat(totalHours.toFixed(2)),
            capacity,
            utilization: parseFloat(utilization.toFixed(1)),
            projects: userProjects.length,
            tasks: userTasks.length,
          };
        });

      setWorkload(workloadData.sort((a, b) => b.utilization - a.utilization));
      setCapacityAlerts(workloadData.filter((member) => member.utilization >= 90));

      const timeline = buildResourceTimeline(engineers, tasksByUser);
      setResourceTimeline(timeline);

      const breakdownMap = buildProjectBreakdown(engineers, tasksByUser);
      setProjectBreakdown(breakdownMap);
      setLastUpdated(format(new Date(), 'MMM d, h:mm a'));
    } catch (error: any) {
      toast.error('Failed to load workload data');
    } finally {
      setLoading(false);
    }
  };

  const buildProjectBreakdown = (engineers: any[], tasksByUser: Record<number, any[]>) => {
    return engineers.reduce((acc, engineer) => {
      const userTasks = tasksByUser[engineer.id] || [];
      if (!userTasks.length) {
        acc[engineer.id] = [];
        return acc;
      }

      const aggregated = userTasks.reduce((projectMap: Record<string, number>, task: any) => {
        const projectName = task.project_name || `Project #${task.project_id}`;
        const estimate = parseFloat(task.estimated_hours || 0);
        const hours = Number.isNaN(estimate) || estimate === 0 ? DEFAULT_TASK_ESTIMATE : estimate;
        projectMap[projectName] = (projectMap[projectName] || 0) + hours;
        return projectMap;
      }, {});

      acc[engineer.id] = Object.entries(aggregated)
        .map(([project, hours]) => ({ project, hours: parseFloat(hours.toFixed(1)) }))
        .sort((a, b) => b.hours - a.hours);
      return acc;
    }, {} as Record<number, ProjectAllocation[]>);
  };

  const buildResourceTimeline = (engineers: any[], tasksByUser: Record<number, any[]>) => {
    const baseWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

    return Array.from({ length: PLANNING_WEEKS }, (_, index) => {
      const weekStart = addWeeks(baseWeek, index);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      const allocations: ResourceAllocation[] = engineers
        .map((engineer) => {
          const userTasks = tasksByUser[engineer.id] || [];
          if (!userTasks.length) {
            return null;
          }

          const hours = userTasks.reduce((sum: number, task: any) => {
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const estimate = parseFloat(task.estimated_hours || 0);
            const taskHours = Number.isNaN(estimate) || estimate === 0 ? DEFAULT_TASK_ESTIMATE : estimate;

            if (dueDate && isWithinInterval(dueDate, { start: weekStart, end: weekEnd })) {
              return sum + taskHours;
            }

            if (!task.due_date && index === 0) {
              return sum + taskHours;
            }

            return sum;
          }, 0);

          if (hours === 0) {
            return null;
          }

          const utilization = Math.round((hours / HOURS_PER_WEEK) * 100);
          return {
            userId: engineer.id,
            userName: `${engineer.first_name} ${engineer.last_name}`,
            hours: parseFloat(hours.toFixed(1)),
            utilization,
            status: getStatusFromUtilization(utilization),
          };
        })
        .filter(Boolean) as ResourceAllocation[];

      const highestUtilization = allocations.reduce((max, entry) => Math.max(max, entry.utilization), 0);

      return {
        id: `week-${index}`,
        label: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`,
        start: weekStart,
        end: weekEnd,
        allocations,
        health: getStatusFromUtilization(highestUtilization),
      };
    }).filter((week) => week.allocations.length > 0);
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 100) return '#ef4444'; // red - over capacity
    if (utilization >= 80) return '#f59e0b'; // orange - high
    if (utilization >= 50) return '#10b981'; // green - good
    return '#6366f1'; // blue - underutilized
  };

  const filteredTimeline =
    selectedUserId === 'all'
      ? resourceTimeline
      : resourceTimeline
          .map((week) => ({
            ...week,
            allocations: week.allocations.filter((allocation) => allocation.userId === selectedUserId),
          }))
          .filter((week) => week.allocations.length > 0);

  const selectedUser = selectedUserId === 'all' ? null : workload.find((member) => member.userId === selectedUserId);
  const selectedBreakdown =
    selectedUserId === 'all' ? [] : projectBreakdown[selectedUserId]?.slice(0, 4) ?? [];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Workload</h1>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <p className="text-gray-600 text-lg">
            Current month capacity and utilization with a 4-week allocation forecast
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-600">
              Focus
              <select
                className="ml-2 rounded-md border border-gray-200 bg-white py-1 px-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={selectedUserId}
                onChange={(event) =>
                  setSelectedUserId(event.target.value === 'all' ? 'all' : Number(event.target.value))
                }
              >
                <option value="all">Entire team</option>
                {workload.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.userName}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={fetchWorkload}
              className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Refresh data
            </button>
            {lastUpdated && <span className="text-xs text-gray-500">Updated {lastUpdated}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Utilization by User</h2>
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 text-lg">📊</span>
            </div>
          </div>
          {workload.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workload}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="userName" angle={-45} textAnchor="end" height={100} />
                <YAxis domain={[0, 120]} label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Legend />
                <Bar dataKey="utilization" name="Utilization %">
                  {workload.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getUtilizationColor(entry.utilization)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-700">No data available</div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Hours by User</h2>
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <span className="text-accent-600 text-lg">⏱️</span>
            </div>
          </div>
          {workload.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workload}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="userName" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: any) => `${value}h`} />
                <Legend />
                <Bar dataKey="totalHours" fill="#6366f1" name="Logged Hours" />
                <Bar dataKey="capacity" fill="#e5e7eb" name="Capacity" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-700">No data available</div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Logged Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Utilization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Projects
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Tasks
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workload.map((user) => (
              <tr key={user.userId} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.userName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {user.totalHours}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {user.capacity}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full`}
                        style={{
                          width: `${Math.min(user.utilization, 100)}%`,
                          backgroundColor: getUtilizationColor(user.utilization),
                        }}
                      ></div>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        user.utilization >= 100
                          ? 'text-red-600'
                          : user.utilization >= 80
                          ? 'text-orange-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {user.utilization}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {user.projects}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {user.tasks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {workload.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-700">No workload data available</p>
          </div>
        )}
      </div>

      <div className="card mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Legend</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-700">Over Capacity (≥100%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-sm text-gray-700">High (80-99%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700">Good (50-79%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-700">Underutilized (&lt;50%)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card xl:col-span-2">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Resource Planning Timeline</h2>
              <p className="text-gray-600 text-sm">Forecasted workload for the next four weeks</p>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-wide text-gray-500">Capacity per week</span>
              <p className="text-gray-900 font-semibold">{HOURS_PER_WEEK}h / engineer</p>
            </div>
          </div>

          {filteredTimeline.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTimeline.map((week) => (
                <div key={week.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Week</p>
                      <p className="text-lg font-semibold text-gray-900">{week.label}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getWeekBadgeStyles(week.health)}`}>
                      {describeStatus(week.health)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {week.allocations.map((allocation) => (
                      <div key={`${week.id}-${allocation.userId}`} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <p className="font-medium text-gray-900">{allocation.userName}</p>
                          <span className="text-gray-600">
                            {allocation.hours}h · {allocation.utilization}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(allocation.utilization, 130)}%`,
                              backgroundColor: getUtilizationColor(allocation.utilization),
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-700">No upcoming allocations for the selected view</div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Capacity Alerts</h3>
            {capacityAlerts.length ? (
              <div className="space-y-3">
                {capacityAlerts.slice(0, 4).map((member) => (
                  <div key={member.userId} className="rounded-lg border border-red-100 bg-red-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium text-red-900">{member.userName}</p>
                      <span className="font-semibold text-red-700">{member.utilization}%</span>
                    </div>
                    <p className="text-xs text-red-700 mt-1">{member.projects} active projects · {member.tasks} tasks</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No one is above 90% utilization this month.</p>
            )}
          </div>

          {selectedUser && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedUser.userName.split(' ')[0]}'s Project Mix
              </h3>
              {selectedBreakdown.length ? (
                <div className="space-y-3">
                  {selectedBreakdown.map((project) => {
                    const share = Math.min(Math.round((project.hours / HOURS_PER_WEEK) * 100), 130);
                    return (
                      <div key={project.project}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-900 font-medium">{project.project}</span>
                          <span className="text-gray-600">{project.hours}h</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                            style={{ width: `${share}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No task estimates available for this team member.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workload;

