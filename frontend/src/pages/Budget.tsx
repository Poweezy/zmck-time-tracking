import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface BudgetData {
  project: {
    id: number;
    name: string;
    code: string;
    status: string;
  };
  budget: {
    amount: number;
    hours: number;
  };
  actual: {
    cost: number;
    hours: number;
  };
  variance: {
    cost: number;
    hours: number;
    costPercent: number;
    hoursPercent: number;
  };
}

const Budget = () => {
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [projectDetail, setProjectDetail] = useState<any>(null);

  useEffect(() => {
    fetchBudgetData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectDetail(selectedProject);
    }
  }, [selectedProject]);

  const fetchBudgetData = async () => {
    try {
      const response = await api.get('/budget/all');
      setBudgetData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetail = async (projectId: number) => {
    try {
      const response = await api.get(`/budget/project/${projectId}`);
      setProjectDetail(response.data);
    } catch (error: any) {
      toast.error('Failed to load project budget details');
    }
  };

  const getVarianceColor = (variance: number, isPercent: boolean = false) => {
    if (isPercent) {
      if (variance > 10) return '#ef4444'; // red - over budget
      if (variance > 5) return '#f59e0b'; // orange - warning
      if (variance < -10) return '#10b981'; // green - under budget
      return '#6366f1'; // blue - within range
    } else {
      if (variance > 0) return '#ef4444'; // red - over
      return '#10b981'; // green - under
    }
  };

  const chartData = budgetData.map((item) => ({
    name: item.project.code,
    budget: item.budget.amount,
    actual: item.actual.cost,
    variance: item.variance.cost,
  }));

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Budget vs Actual</h1>
        <p className="text-gray-600 dark:text-gray-400">Track project budgets and cost variances</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="card-interactive bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-600 uppercase tracking-wider mb-2">
            Total Budget
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            E{budgetData.reduce((sum, item) => sum + item.budget.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-interactive bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-600 uppercase tracking-wider mb-2">
            Total Actual
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            E{budgetData.reduce((sum, item) => sum + item.actual.cost, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-interactive bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-600 uppercase tracking-wider mb-2">
            Total Variance
          </h3>
          <p className={`text-3xl font-bold ${budgetData.reduce((sum, item) => sum + item.variance.cost, 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            E{budgetData.reduce((sum, item) => sum + item.variance.cost, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-interactive bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-600 uppercase tracking-wider mb-2">
            Projects Tracked
          </h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{budgetData.length}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Budget vs Actual by Project</h2>
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 text-lg">📊</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                formatter={(value: any) => `E${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              />
              <Legend />
              <Bar dataKey="budget" fill="#6366f1" name="Budget" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Project Budget Table */}
      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Budget
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actual
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Variance
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Variance %
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {budgetData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="empty-state">
                    <div className="empty-state-icon text-gray-600 dark:text-gray-400">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-12 h-12">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="empty-state-title text-gray-900 dark:text-gray-100">No budget data available</div>
                    <div className="empty-state-description text-gray-700 dark:text-gray-400">
                      Set budget amounts on projects to track budget vs actual costs
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              budgetData.map((item) => (
                <tr
                  key={item.project.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => setSelectedProject(item.project.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.project.name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{item.project.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                    E{item.budget.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                    E{item.actual.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`text-sm font-semibold ${
                        item.variance.cost > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {item.variance.cost > 0 ? '+' : ''}
                      E{item.variance.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`text-sm font-semibold ${
                        item.variance.costPercent > 10
                          ? 'text-red-600 dark:text-red-400'
                          : item.variance.costPercent > 5
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {item.variance.costPercent > 0 ? '+' : ''}
                      {item.variance.costPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.variance.costPercent > 10
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : item.variance.costPercent > 5
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      }`}
                    >
                      {item.variance.costPercent > 10
                        ? 'Over Budget'
                        : item.variance.costPercent > 5
                        ? 'Warning'
                        : 'On Track'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && projectDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {projectDetail.project.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{projectDetail.project.code}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedProject(null);
                    setProjectDetail(null);
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Budget Amount</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    E{projectDetail.project.budget_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Actual Cost</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    E{projectDetail.actual.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Allocated Hours</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {projectDetail.project.allocated_hours.toFixed(2)}h
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Actual Hours</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {projectDetail.actual.hours.toFixed(2)}h
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cost Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Time Costs</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      E{projectDetail.breakdown.timeCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Expense Costs</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      E{projectDetail.breakdown.expenseCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Variance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Cost Variance</span>
                    <span
                      className={`text-sm font-semibold ${
                        projectDetail.variance.cost > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {projectDetail.variance.cost > 0 ? '+' : ''}
                      E{projectDetail.variance.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({projectDetail.variance.costPercent > 0 ? '+' : ''}
                      {projectDetail.variance.costPercent.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Hours Variance</span>
                    <span
                      className={`text-sm font-semibold ${
                        projectDetail.variance.hours > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {projectDetail.variance.hours > 0 ? '+' : ''}
                      {projectDetail.variance.hours.toFixed(2)}h ({projectDetail.variance.hoursPercent > 0 ? '+' : ''}
                      {projectDetail.variance.hoursPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  to={`/projects`}
                  className="btn-primary"
                  onClick={() => {
                    setSelectedProject(null);
                    setProjectDetail(null);
                  }}
                >
                  View Project
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;

