import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { Link, useNavigate } from 'react-router-dom';

interface DashboardData {
  totalHours: number;
  hoursByProject: any[];
  hoursByUser: any[];
  pendingApprovals: number;
  projectProgress: any[];
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  priority: number;
  project_name?: string;
  project_code?: string;
  project_color?: string;
}

interface Project {
  id: number;
  name: string;
  code: string;
  status: string;
  tasks_due_soon?: number;
  color?: string;
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [prioritiesTab, setPrioritiesTab] = useState<'upcoming' | 'overdue' | 'completed'>('upcoming');
  const [projectsTab, setProjectsTab] = useState<'projects' | 'recents'>('projects');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'supervisor') {
      fetchDashboard();
    }
    fetchTasks();
    fetchProjects();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const params: any = { assignedTo: user?.id, limit: 10 };
      const response = await api.get('/tasks', { params });
      const tasksData = response.data.data || response.data;
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error: any) {
      toast.error('Failed to load tasks');
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      const projectsData = response.data.data || response.data;
      const projectsArray = Array.isArray(projectsData) ? projectsData : [];
      // Add color to each project
      const projectsWithColors = projectsArray.slice(0, 6).map((project: Project) => ({
        ...project,
        color: getProjectColor(project.name),
        tasks_due_soon: Math.floor(Math.random() * 5), // Mock data - replace with actual count
      }));
      setProjects(projectsWithColors);
    } catch (error: any) {
      toast.error('Failed to load projects');
    }
  };

  const getProjectColor = (projectName: string) => {
    const colors = [
      'bg-red-500', 'bg-purple-500', 'bg-green-500', 'bg-blue-500',
      'bg-pink-500', 'bg-orange-500', 'bg-teal-500', 'bg-yellow-500',
      'bg-indigo-500', 'bg-cyan-500'
    ];
    const index = projectName.length % colors.length;
    return colors[index];
  };

  const getTaskIcon = (projectName: string) => {
    const icons = ['🚀', '📝', '💻', '🎨', '📊', '🔧', '📱', '🌐', '⚡', '🎯'];
    const index = projectName?.length % icons.length || 0;
    return icons[index];
  };

  const formatDueDate = (date: string) => {
    const taskDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    if (taskDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (taskDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (taskDate <= weekFromNow) {
      return format(taskDate, 'EEEE'); // Day name
    } else {
      return format(taskDate, 'MMM dd');
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (prioritiesTab === 'completed') {
      return task.status === 'done';
    } else if (prioritiesTab === 'overdue') {
      return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
    } else {
      // Upcoming
      return task.status !== 'done' && (!task.due_date || new Date(task.due_date) >= new Date());
    }
  });

  if (user?.role === 'engineer') {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Home</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-1">
            {format(new Date(), 'EEEE, MMMM dd')}
          </p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.firstName}!
          </h2>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-600 dark:text-gray-400">My weekly stats</span>
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium">17 tasks completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary-600 dark:text-primary-400">👥</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium">42 collaborated with</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Priorities Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-card dark:shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">My Priorities</h3>
                </div>
              </div>
              <button 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="My Priorities settings"
                title="My Priorities settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setPrioritiesTab('upcoming')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  prioritiesTab === 'upcoming'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setPrioritiesTab('overdue')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  prioritiesTab === 'overdue'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Overdue ({tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length})
              </button>
              <button
                onClick={() => setPrioritiesTab('completed')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  prioritiesTab === 'completed'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Completed
              </button>
            </div>

            {/* Tasks List */}
            <div className="space-y-2">
              {tasksLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                      <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p className="text-sm mb-2">Click here to create a task...</p>
                  <button
                    onClick={() => navigate('/tasks/new')}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-sm"
                  >
                    Create Task
                  </button>
                </div>
              ) : (
                filteredTasks.slice(0, 7).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={(e) => {
                        e.stopPropagation();
                        // Handle checkbox change
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Mark "${task.title}" as ${task.status === 'done' ? 'incomplete' : 'complete'}`}
                      title={`Mark "${task.title}" as ${task.status === 'done' ? 'incomplete' : 'complete'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {task.title}
                        </p>
                        {task.project_code && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                            {task.project_code}
                          </span>
                        )}
                      </div>
                      {task.due_date && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDueDate(task.due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredTasks.length > 7 && (
              <div className="mt-4 text-center">
                <Link to="/my-tasks" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Show more
                </Link>
              </div>
            )}
          </div>

          {/* Projects Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-card dark:shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Projects</h3>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  onClick={() => setProjectsTab('projects')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    projectsTab === 'projects'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Projects
                </button>
                <button
                  onClick={() => setProjectsTab('recents')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    projectsTab === 'recents'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Recents
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* New Project Card */}
              <Link
                to="/projects/new"
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 flex items-center justify-center mb-3 transition-colors">
                    <svg className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-primary-700 dark:group-hover:text-primary-400">New Project</span>
              </Link>

              {/* Project Cards */}
              {projects.slice(0, 3).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md dark:hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-600 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 ${project.color || getProjectColor(project.name)} rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        {getTaskIcon(project.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {project.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{project.code}</p>
                      </div>
                    </div>
                    {project.tasks_due_soon !== undefined && project.tasks_due_soon > 0 && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {project.tasks_due_soon} tasks due soon
                      </p>
                    )}
                </Link>
              ))}
            </div>

            {projects.length > 3 && (
              <div className="mt-4 text-center">
                <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Show more
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Customize Button */}
        <div className="flex justify-end">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Customize
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  if (!data) {
    return <div className="text-center py-8">No data available</div>;
  }

  // Admin/Supervisor Dashboard - Keep the analytics view but make it cleaner
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Dashboard</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">Overview of your time tracking and project performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card-interactive group bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white text-xl font-bold shadow-md group-hover:scale-110 transition-transform duration-200">
              ⏱️
            </div>
          </div>
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Total Hours</h3>
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">{data.totalHours.toFixed(2)}</p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Hours tracked</p>
        </div>
        <div className="card-interactive group bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center text-white text-xl font-bold shadow-md group-hover:scale-110 transition-transform duration-200">
              ⏳
            </div>
          </div>
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Pending Approvals</h3>
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">{data.pendingApprovals}</p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Awaiting review</p>
        </div>
        <div className="card-interactive group bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-white text-xl font-bold shadow-md group-hover:scale-110 transition-transform duration-200">
              📁
            </div>
          </div>
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Active Projects</h3>
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">{data.hoursByProject.length}</p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Currently active</p>
        </div>
        <div className="card-interactive group bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-md group-hover:scale-110 transition-transform duration-200">
              👥
            </div>
          </div>
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">Active Users</h3>
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1">{data.hoursByUser.length}</p>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Team members</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Hours by Project</h2>
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 text-lg">📊</span>
            </div>
          </div>
          {data.hoursByProject.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.hoursByProject.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  formatter={(value: any) => `${parseFloat(value).toFixed(2)}h`}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Legend />
                <Bar dataKey="hours" fill="#6366f1" name="Hours" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No data available</div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Hours by User</h2>
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <span className="text-accent-600 text-lg">👤</span>
            </div>
          </div>
          {data.hoursByUser.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.hoursByUser.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  formatter={(value: any) => `${parseFloat(value).toFixed(2)}h`}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Legend />
                <Bar dataKey="hours" fill="#a855f7" name="Hours" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">No data available</div>
          )}
        </div>
      </div>

      {/* Project Progress */}
      {data.projectProgress.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Project Progress (Fixed Projects)</h2>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-lg">📈</span>
            </div>
          </div>
          <div className="space-y-5">
            {data.projectProgress.map((project: any) => (
              <div key={project.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-base font-semibold text-gray-900">{project.name}</span>
                  <span className="text-sm font-medium text-gray-600">
                    {parseFloat(project.logged_hours).toFixed(2)}h / {parseFloat(project.allocated_hours).toFixed(2)}h
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      project.progress_percentage > 100
                        ? 'bg-red-500'
                        : project.progress_percentage > 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(project.progress_percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600">
                    {project.progress_percentage.toFixed(1)}% complete
                  </span>
                  {project.variance !== 0 && (
                    <span
                      className={`text-xs font-semibold ${
                        project.variance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {project.variance > 0 ? '+' : ''}
                      {project.variance.toFixed(2)}h variance
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
