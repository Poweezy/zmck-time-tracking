import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface UserWorkload {
  userId: number;
  userName: string;
  totalHours: number;
  capacity: number;
  utilization: number;
  projects: number;
  tasks: number;
}

const Workload = () => {
  const [workload, setWorkload] = useState<UserWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchWorkload();
  }, []);

  const fetchWorkload = async () => {
    try {
      // Get all users
      const usersResponse = await api.get('/users');
      const users = usersResponse.data.data || usersResponse.data;

      // Get time entries for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const timeEntriesResponse = await api.get('/time-entries', {
        params: {
          from: startOfMonth.toISOString(),
          to: endOfMonth.toISOString(),
        },
      });
      const timeEntries = timeEntriesResponse.data.data || timeEntriesResponse.data;

      // Get tasks for each user
      const tasksResponse = await api.get('/tasks');
      const allTasks = tasksResponse.data.data || tasksResponse.data;

      // Calculate workload for each user
      const workloadData: UserWorkload[] = users
        .filter((u: any) => u.role === 'engineer' && u.is_active)
        .map((user: any) => {
          const userEntries = timeEntries.filter((te: any) => te.user_id === user.id);
          const totalHours = userEntries.reduce((sum: number, te: any) => sum + parseFloat(te.duration_hours || 0), 0);
          
          const userTasks = allTasks.filter((t: any) => t.assigned_to === user.id);
          const userProjects = [...new Set(userTasks.map((t: any) => t.project_id))];

          // Assume 160 hours per month capacity (40 hours/week * 4 weeks)
          const capacity = 160;
          const utilization = (totalHours / capacity) * 100;

          return {
            userId: user.id,
            userName: `${user.first_name} ${user.last_name}`,
            totalHours: parseFloat(totalHours.toFixed(2)),
            capacity,
            utilization: parseFloat(utilization.toFixed(1)),
            projects: userProjects.length,
            tasks: userTasks.length,
          };
        });

      setWorkload(workloadData.sort((a, b) => b.utilization - a.utilization));
    } catch (error: any) {
      toast.error('Failed to load workload data');
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 100) return '#ef4444'; // red - over capacity
    if (utilization >= 80) return '#f59e0b'; // orange - high
    if (utilization >= 50) return '#10b981'; // green - good
    return '#6366f1'; // blue - underutilized
  };

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
        <p className="text-gray-600 text-lg">Current month capacity and utilization</p>
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
    </div>
  );
};

export default Workload;

