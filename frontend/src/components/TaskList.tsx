import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

interface Task {
  id: number;
  title: string;
  description?: string;
  project_name: string;
  project_code: string;
  assignee_name?: string;
  status: string;
  progress_percentage: number;
  due_date?: string;
  priority: number;
  estimated_hours?: number;
}

interface TaskListProps {
  projectId?: number;
  searchQuery?: string;
}

const TaskList = ({ projectId, searchQuery }: TaskListProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
  }, [projectId, searchQuery, pagination.page]);

  const fetchTasks = async () => {
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (projectId) params.projectId = projectId;
      if (searchQuery) params.search = searchQuery;
      const response = await api.get('/tasks', { params });
      if (response.data.data) {
        setTasks(response.data.data);
        setPagination(response.data.pagination);
      } else {
        setTasks(response.data);
      }
    } catch (error: any) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      todo: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      review: 'bg-yellow-100 text-yellow-800',
      done: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600';
    if (priority >= 2) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0 animate-fade-in">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assignee
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Progress
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-gray-50 cursor-pointer transition-colors duration-150">
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {task.description}
                      </div>
                    )}
                  </div>
                  <span className={`ml-2 text-xs font-bold ${getPriorityColor(task.priority)}`}>
                    P{task.priority}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-primary-600 font-medium">{task.project_code}</span>
                <div className="text-xs text-gray-500">{task.project_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {task.assignee_name || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    task.status
                  )}`}
                >
                  {task.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${task.progress_percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{task.progress_percentage}%</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {task.due_date ? (
                  <span
                    className={
                      new Date(task.due_date) < new Date() ? 'text-red-600' : 'text-gray-500'
                    }
                  >
                    {format(new Date(task.due_date), 'MMM dd, yyyy')}
                  </span>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="empty-state-title">No tasks found</div>
          <div className="empty-state-description">Create a new task to get started</div>
        </div>
      )}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
            tasks
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={!pagination.hasPrev}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={!pagination.hasNext}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;

