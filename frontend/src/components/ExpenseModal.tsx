import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { FormField } from './FormField';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: any;
  projectId?: number;
  onSuccess: () => void;
}

const ExpenseModal = ({ isOpen, onClose, expense, projectId, onSuccess }: ExpenseModalProps) => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    projectId: projectId?.toString() || '',
    taskId: '',
    amount: '',
    category: 'Travel',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    receipt: null as File | null,
  });

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      if (formData.projectId) {
        fetchTasks(parseInt(formData.projectId));
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.projectId) {
      fetchTasks(parseInt(formData.projectId));
    } else {
      setTasks([]);
    }
  }, [formData.projectId]);

  useEffect(() => {
    if (expense) {
      setFormData({
        projectId: expense.project_id?.toString() || '',
        taskId: expense.task_id?.toString() || '',
        amount: expense.amount?.toString() || '',
        category: expense.category || 'Travel',
        description: expense.description || '',
        expenseDate: expense.expense_date || new Date().toISOString().split('T')[0],
        receipt: null,
      });
    } else {
      setFormData({
        projectId: projectId?.toString() || '',
        taskId: '',
        amount: '',
        category: 'Travel',
        description: '',
        expenseDate: new Date().toISOString().split('T')[0],
        receipt: null,
      });
    }
  }, [expense, projectId, isOpen]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      const projectsData = response.data.data || response.data;
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (error) {
      console.error('Failed to load projects');
    }
  };

  const fetchTasks = async (projId: number) => {
    try {
      const response = await api.get('/tasks', { params: { projectId: projId } });
      const tasksData = response.data.data || response.data;
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error('Failed to load tasks');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('projectId', formData.projectId);
      if (formData.taskId) formDataToSend.append('taskId', formData.taskId);
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('category', formData.category);
      if (formData.description) formDataToSend.append('description', formData.description);
      formDataToSend.append('expenseDate', formData.expenseDate);
      if (formData.receipt) formDataToSend.append('receipt', formData.receipt);

      if (expense) {
        await api.put(`/expenses/${expense.id}`, formDataToSend);
        toast.success('Expense updated successfully');
      } else {
        await api.post('/expenses', formDataToSend);
        toast.success('Expense created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'Edit Expense' : 'New Expense'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Project" name="projectId" required>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value, taskId: '' })}
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

        <FormField label="Task (Optional)" name="taskId">
          <select
            value={formData.taskId}
            onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
            className="input"
            disabled={!formData.projectId}
          >
            <option value="">No task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount (E)" name="amount" required>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input"
              required
            />
          </FormField>

          <FormField label="Category" name="category" required>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="input"
              required
            >
              <option value="Travel">Travel</option>
              <option value="Materials">Materials</option>
              <option value="Equipment">Equipment</option>
              <option value="Other">Other</option>
            </select>
          </FormField>
        </div>

        <FormField label="Expense Date" name="expenseDate" required>
          <input
            type="date"
            value={formData.expenseDate}
            onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
            className="input"
            required
          />
        </FormField>

        <FormField label="Description" name="description">
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={3}
            maxLength={500}
          />
        </FormField>

        <FormField label="Receipt (Optional)" name="receipt">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFormData({ ...formData, receipt: e.target.files?.[0] || null })}
            className="input"
          />
          {expense?.receipt_file_path && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Current receipt: {expense.receipt_file_path.split('/').pop()}
            </p>
          )}
        </FormField>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : expense ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ExpenseModal;

