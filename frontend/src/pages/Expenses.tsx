import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import FilterSort from '../components/FilterSort';
import ExpenseModal from '../components/ExpenseModal';

interface Expense {
  id: number;
  amount: number;
  category: string;
  description?: string;
  expense_date: string;
  approval_status: string;
  receipt_file_path?: string;
  project_name: string;
  project_code: string;
  task_title?: string;
  user_name: string;
  rejection_reason?: string;
}

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; expense: Expense | null }>({
    isOpen: false,
    expense: null,
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchExpenses();
  }, [searchQuery, statusFilter, categoryFilter]);

  const fetchExpenses = async () => {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const response = await api.get('/expenses', { params });
      setExpenses(response.data.data || response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/expenses/${id}/approve`);
      toast.success('Expense approved');
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve expense');
    }
  };

  const handleReject = async (id: number, reason: string) => {
    try {
      await api.put(`/expenses/${id}/reject`, { rejectionReason: reason });
      toast.success('Expense rejected');
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject expense');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.expense) return;

    try {
      await api.delete(`/expenses/${deleteConfirm.expense.id}`);
      toast.success('Expense deleted successfully');
      fetchExpenses();
      setDeleteConfirm({ isOpen: false, expense: null });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete expense');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      changes_requested: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const clearFilters = () => {
    setStatusFilter('');
    setCategoryFilter('');
  };

  if (loading) {
    return <LoadingSkeleton type="table" count={10} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Expenses</h1>
          <p className="text-gray-600 dark:text-gray-400">Track and manage project expenses</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>New Expense</span>
          </button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search expenses by description, category, or project..."
          />
        </div>
        <FilterSort
          filters={[
            {
              label: 'Status',
              key: 'status',
              options: [
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'changes_requested', label: 'Changes Requested' },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
            {
              label: 'Category',
              key: 'category',
              options: [
                { value: 'Travel', label: 'Travel' },
                { value: 'Materials', label: 'Materials' },
                { value: 'Equipment', label: 'Equipment' },
                { value: 'Other', label: 'Other' },
              ],
              value: categoryFilter,
              onChange: setCategoryFilter,
            },
          ]}
          sortOptions={[
            { value: 'date_desc', label: 'Newest First' },
            { value: 'date_asc', label: 'Oldest First' },
            { value: 'amount_desc', label: 'Highest Amount' },
            { value: 'amount_asc', label: 'Lowest Amount' },
          ]}
          sortValue="date_desc"
          onSortChange={() => {}}
          onClear={clearFilters}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-card rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="empty-state">
                    <div className="empty-state-icon text-gray-600 dark:text-gray-400">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-12 h-12">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="empty-state-title text-gray-900 dark:text-gray-100">No expenses found</div>
                    <div className="empty-state-description text-gray-700 dark:text-gray-400">
                      {user?.role === 'engineer' ? 'You haven\'t submitted any expenses yet' : 'No expenses match your filters'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.project_name}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{expense.project_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {expense.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                    {expense.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                    E{parseFloat(expense.amount.toString()).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.approval_status)}`}>
                      {expense.approval_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {(user?.role === 'admin' || user?.role === 'supervisor') && expense.approval_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(expense.id)}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Rejection reason:');
                              if (reason) handleReject(expense.id, reason);
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {expense.receipt_file_path && (
                        <a
                          href={`/api/attachments/${expense.receipt_file_path.split('/').pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                        >
                          Receipt
                        </a>
                      )}
                      {(user?.role === 'engineer' && expense.approval_status === 'pending') || (user?.role !== 'engineer') && (
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, expense })}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense}
        onSuccess={fetchExpenses}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, expense: null })}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};

export default Expenses;

