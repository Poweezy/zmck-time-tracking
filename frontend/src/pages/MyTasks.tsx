import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import TaskModal from '../components/TaskModal';
import SearchBar from '../components/SearchBar';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  priority: number;
  estimated_hours?: number;
  project_name?: string;
  project_code?: string;
}

const MyTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'review' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
  }, [filter, searchQuery]);

  const fetchTasks = async () => {
    try {
      const params: any = { assignedTo: user?.id };
      if (filter !== 'all') {
        params.status = filter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await api.get('/tasks', { params });
      setTasks(response.data.data || response.data);
    } catch (error: any) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      toast.success('Task updated');
      fetchTasks();
    } catch (error: any) {
      toast.error('Failed to update task');
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
    if (priority >= 2) return 'text-orange-600';
    return 'text-gray-600';
  };

  const filterButtons = [
    { key: 'all', label: 'All Tasks' },
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'Done' },
  ];

  if (loading) {
    return <LoadingSkeleton type="list" count={5} />;
  }

  const filteredTasks = tasks;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Tasks</h1>
        <p className="text-gray-600">All tasks assigned to you</p>
      </div>

      <div className="mb-6">
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search tasks..."
        />
      </div>

      <div className="mb-4 flex space-x-2 overflow-x-auto pb-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              filter === btn.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="bg-white shadow-card rounded-xl overflow-hidden border border-gray-100">
        <div className="divide-y divide-gray-200">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-700">No tasks found</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-5 hover:bg-gray-50 transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary-500"
                onClick={() => {
                  setSelectedTask(task);
                  setIsTaskModalOpen(true);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.priority > 0 && (
                        <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority === 5 ? '🔥' : task.priority === 4 ? '⚡' : '⭐'}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-700">
                      {task.project_name && (
                        <span>
                          <span className="font-medium">{task.project_code}</span> - {task.project_name}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={new Date(task.due_date) < new Date() ? 'text-red-600' : ''}>
                          Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
                        </span>
                      )}
                      {task.estimated_hours && (
                        <span>Est: {task.estimated_hours}h</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <select
                      value={task.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onSuccess={fetchTasks}
      />
    </div>
  );
};

export default MyTasks;

