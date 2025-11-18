import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import TaskModal from './TaskModal';
import SearchBar from './SearchBar';

interface Task {
  id: number;
  title: string;
  description?: string;
  project_name: string;
  project_code: string;
  assignee_name?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  progress_percentage: number;
  due_date?: string;
  priority: number;
  estimated_hours?: number;
}

const TaskBoard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const columns = [
    { id: 'todo', title: 'To Do', status: 'todo' as const },
    { id: 'in_progress', title: 'In Progress', status: 'in_progress' as const },
    { id: 'review', title: 'Review', status: 'review' as const },
    { id: 'done', title: 'Done', status: 'done' as const },
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [selectedProject, searchQuery]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      // Handle both paginated and non-paginated responses
      const projectsData = response.data.data || response.data;
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error: any) {
      toast.error('Failed to load projects');
      setProjects([]); // Set empty array on error
    }
  };

  const fetchTasks = async () => {
    try {
      const params: any = {};
      if (selectedProject) params.projectId = selectedProject;
      if (searchQuery) params.search = searchQuery;
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

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'bg-red-100 text-red-800 border-red-300';
    if (priority >= 2) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Task Board</h2>
          <p className="text-sm text-gray-600">Drag and drop tasks between columns</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
            className="input text-sm py-2 px-4 w-auto min-w-[200px]"
            aria-label="Select project to filter tasks"
            title="Select project to filter tasks"
          >
            <option value="">All Projects</option>
            {Array.isArray(projects) && projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
          {(user?.role === 'admin' || user?.role === 'supervisor') && (
            <button
              onClick={() => {
                setSelectedTask(null);
                setIsTaskModalOpen(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search tasks by title, description, or project..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          const columnColors: Record<string, string> = {
            todo: 'from-gray-100 to-gray-50 border-gray-200',
            in_progress: 'from-blue-100 to-blue-50 border-blue-200',
            review: 'from-yellow-100 to-yellow-50 border-yellow-200',
            done: 'from-green-100 to-green-50 border-green-200',
          };
          return (
            <div key={column.id} className="flex-shrink-0 w-full animate-fade-in">
              <div className={`bg-gradient-to-br ${columnColors[column.status]} rounded-xl p-4 mb-3 border shadow-sm`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                    {column.title}
                  </h3>
                  <span className="badge badge-primary text-xs">{columnTasks.length}</span>
                </div>
              </div>
              <div className="space-y-3 min-h-[400px]">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className="card-interactive p-4 group cursor-pointer"
                    onClick={() => {
                      setSelectedTask(task);
                      setIsTaskModalOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        P{task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span className="text-primary-600 font-medium">{task.project_code}</span>
                      {task.due_date && (
                        <span
                          className={
                            new Date(task.due_date) < new Date()
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }
                        >
                          {format(new Date(task.due_date), 'MMM dd')}
                        </span>
                      )}
                    </div>
                    {task.assignee_name && (
                      <div className="text-xs text-gray-500 mb-2">
                        👤 {task.assignee_name}
                      </div>
                    )}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${task.progress_percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex space-x-2">
                      {columns
                        .filter((col) => col.status !== task.status)
                        .map((col) => (
                          <button
                            key={col.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(task.id, col.status);
                            }}
                            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                          >
                            → {col.title}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <div className="empty-state py-12">
                    <div className="empty-state-icon text-gray-300">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="empty-state-title text-sm text-gray-400">No tasks</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        projectId={selectedProject || undefined}
        onSuccess={fetchTasks}
      />
    </div>
  );
};

export default TaskBoard;

