import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { FormField } from './FormField';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  onSuccess: () => void;
}

const InvoiceModal = ({ isOpen, onClose, projectId, onSuccess }: InvoiceModalProps) => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(projectId || null);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [selectedTimeEntries, setSelectedTimeEntries] = useState<number[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    taxRate: '0',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      if (selectedProject) {
        fetchTimeEntriesAndExpenses(selectedProject);
      }
    }
  }, [isOpen, selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      const projectsData = response.data.data || response.data;
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      console.error('Failed to load projects');
    }
  };

  const fetchTimeEntriesAndExpenses = async (projId: number) => {
    try {
      const [timeEntriesRes, expensesRes] = await Promise.all([
        api.get('/time-entries', { params: { projectId: projId, approvalStatus: 'approved' } }),
        api.get('/expenses', { params: { projectId: projId, status: 'approved' } }),
      ]);

      const timeEntriesData = timeEntriesRes.data.data || timeEntriesRes.data;
      const expensesData = expensesRes.data.data || expensesRes.data;

      setTimeEntries(Array.isArray(timeEntriesData) ? timeEntriesData.filter((te: any) => !te.invoiced) : []);
      setExpenses(Array.isArray(expensesData) ? expensesData.filter((e: any) => !e.invoiced) : []);
    } catch (error) {
      console.error('Failed to load time entries and expenses');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTimeEntries.length === 0 && selectedExpenses.length === 0) {
      toast.error('Please select at least one time entry or expense');
      return;
    }

    setLoading(true);

    try {
      await api.post('/invoices', {
        projectId: selectedProject,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        timeEntryIds: selectedTimeEntries,
        expenseIds: selectedExpenses,
        taxRate: parseFloat(formData.taxRate),
        notes: formData.notes || null,
      });

      toast.success('Invoice created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const toggleTimeEntry = (id: number) => {
    setSelectedTimeEntries((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  const toggleExpense = (id: number) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  const calculateTotal = () => {
    let total = 0;

    selectedTimeEntries.forEach((id) => {
      const entry = timeEntries.find((te) => te.id === id);
      if (entry) {
        const rate = parseFloat(entry.hourly_rate || '0');
        total += entry.duration_hours * rate;
      }
    });

    selectedExpenses.forEach((id) => {
      const expense = expenses.find((e) => e.id === id);
      if (expense) {
        total += parseFloat(expense.amount.toString());
      }
    });

    const tax = total * (parseFloat(formData.taxRate) / 100);
    return { subtotal: total, tax, total: total + tax };
  };

  const totals = calculateTotal();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Invoice" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField label="Project" name="projectId" required>
          <select
            value={selectedProject || ''}
            onChange={(e) => {
              const projId = e.target.value ? parseInt(e.target.value) : null;
              setSelectedProject(projId);
              setSelectedTimeEntries([]);
              setSelectedExpenses([]);
            }}
            className="input"
            required
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Invoice Date" name="invoiceDate" required>
            <input
              type="date"
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              className="input"
              required
            />
          </FormField>

          <FormField label="Due Date" name="dueDate" required>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="input"
              required
            />
          </FormField>
        </div>

        {selectedProject && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Entries
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                {timeEntries.length === 0 ? (
                  <p className="p-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                    No approved time entries available
                  </p>
                ) : (
                  timeEntries.map((entry) => (
                    <label
                      key={entry.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTimeEntries.includes(entry.id)}
                        onChange={() => toggleTimeEntry(entry.id)}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {entry.task_title || 'No task'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {entry.duration_hours.toFixed(2)}h @ E{parseFloat(entry.hourly_rate || '0').toFixed(2)}/hr
                          = E{(entry.duration_hours * parseFloat(entry.hourly_rate || '0')).toFixed(2)}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expenses
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                {expenses.length === 0 ? (
                  <p className="p-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                    No approved expenses available
                  </p>
                ) : (
                  expenses.map((expense) => (
                    <label
                      key={expense.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedExpenses.includes(expense.id)}
                        onChange={() => toggleExpense(expense.id)}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {expense.category} - {expense.description || 'No description'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          E{parseFloat(expense.amount.toString()).toFixed(2)}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tax Rate (%)" name="taxRate">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
              className="input"
            />
          </FormField>
        </div>

        <FormField label="Notes" name="notes">
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="input"
            rows={3}
          />
        </FormField>

        {(selectedTimeEntries.length > 0 || selectedExpenses.length > 0) && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">E{totals.subtotal.toFixed(2)}</span>
            </div>
            {parseFloat(formData.taxRate) > 0 && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-700 dark:text-gray-300">Tax ({formData.taxRate}%):</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">E{totals.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300 dark:border-gray-600">
              <span className="text-gray-900 dark:text-gray-100">Total:</span>
              <span className="text-gray-900 dark:text-gray-100">E{totals.total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading || !selectedProject || (selectedTimeEntries.length === 0 && selectedExpenses.length === 0)} className="btn-primary">
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InvoiceModal;

