import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Milestones from '../components/Milestones';
import MilestoneModal from '../components/MilestoneModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Project {
  id: number;
  name: string;
  code: string;
  client: string;
  type: string;
  status: string;
  allocated_hours?: number;
  budget_amount?: number;
  description?: string;
  manager_name?: string;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [budgetData, setBudgetData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchBudgetData();
      fetchTasks();
      fetchTimeEntries();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
    } catch (error: any) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetData = async () => {
    try {
      const response = await api.get(`/budget/project/${id}`);
      setBudgetData(response.data);
    } catch (error) {
      // Budget data might not be available
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks', { params: { projectId: id } });
      const tasksData = response.data.data || response.data;
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error('Failed to load tasks');
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const response = await api.get('/time-entries', { params: { projectId: id } });
      const entriesData = response.data.data || response.data;
      setTimeEntries(Array.isArray(entriesData) ? entriesData : []);
    } catch (error) {
      console.error('Failed to load time entries');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-700 dark:text-gray-300">Project not found</p>
        <Link to="/projects" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to Projects
        </Link>
      </div>
    );
  }

  const taskStatusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [
    { name: 'To Do', value: taskStatusCounts['todo'] || 0 },
    { name: 'In Progress', value: taskStatusCounts['in_progress'] || 0 },
    { name: 'Review', value: taskStatusCounts['review'] || 0 },
    { name: 'Done', value: taskStatusCounts['done'] || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/projects')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{project.name}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{project.code}</p>
        </div>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
          {project.status.replace('_', ' ')}
        </span>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="card-interactive bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-600 uppercase tracking-wider mb-2">
            Client
          </h3>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{project.client}</p>
        </div>
        <div className="card-interactive bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-600 uppercase tracking-wider mb-2">
            Type
          </h3>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{project.type}</p>
        </div>
        {project.allocated_hours && (
          <div className="card-interactive bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-600 uppercase tracking-wider mb-2">
              Allocated Hours
            </h3>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{project.allocated_hours.toFixed(1)}h</p>
          </div>
        )}
        {project.budget_amount && (
          <div className="card-interactive bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-600 uppercase tracking-wider mb-2">
              Budget
            </h3>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              E{project.budget_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>

      {/* Budget vs Actual */}
      {budgetData && (
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Budget vs Actual</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Budget</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                E{budgetData.project.budget_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Actual</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                E{budgetData.actual.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Variance</p>
              <p
                className={`text-lg font-semibold ${
                  budgetData.variance.cost > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {budgetData.variance.cost > 0 ? '+' : ''}
                E{budgetData.variance.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Variance %</p>
              <p
                className={`text-lg font-semibold ${
                  budgetData.variance.costPercent > 10
                    ? 'text-red-600 dark:text-red-400'
                    : budgetData.variance.costPercent > 5
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {budgetData.variance.costPercent > 0 ? '+' : ''}
                {budgetData.variance.costPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tasks Overview</h2>
            <Link
              to={`/tasks?projectId=${id}`}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              View All →
            </Link>
          </div>
          {tasks.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              <p>No tasks yet</p>
              <Link
                to={`/tasks?projectId=${id}`}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mt-2 inline-block"
              >
                Create first task
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Time Entries</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Entries</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{timeEntries.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Hours</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {timeEntries.reduce((sum, entry) => sum + parseFloat(entry.duration_hours || 0), 0).toFixed(2)}h
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Approved</span>
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                {timeEntries.filter((e) => e.approval_status === 'approved').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
              <span className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                {timeEntries.filter((e) => e.approval_status === 'pending').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Milestones</h2>
          {(user?.role === 'admin' || user?.role === 'supervisor') && (
            <button
              onClick={() => setIsMilestoneModalOpen(true)}
              className="btn-primary text-sm"
            >
              + Add Milestone
            </button>
          )}
        </div>
        {id && <Milestones projectId={parseInt(id)} onMilestoneComplete={fetchProject} />}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to={`/tasks?projectId=${id}`}
            className="btn-secondary text-center"
          >
            View Tasks
          </Link>
          <Link
            to={`/time-tracking?projectId=${id}`}
            className="btn-secondary text-center"
          >
            Log Time
          </Link>
          {(user?.role === 'admin' || user?.role === 'supervisor') && (
            <>
              <Link
                to={`/expenses?projectId=${id}`}
                className="btn-secondary text-center"
              >
                Add Expense
              </Link>
              <Link
                to={`/budget`}
                className="btn-secondary text-center"
              >
                View Budget
              </Link>
            </>
          )}
        </div>
      </div>

      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        projectId={parseInt(id || '0')}
        onSuccess={() => {
          fetchProject();
          setIsMilestoneModalOpen(false);
        }}
      />
    </div>
  );
};

export default ProjectDetail;

