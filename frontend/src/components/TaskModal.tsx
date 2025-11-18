import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from './Modal';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: any;
  projectId?: number;
  onSuccess: () => void;
}

const TaskModal = ({ isOpen, onClose, task, projectId, onSuccess }: TaskModalProps) => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    projectId: projectId?.toString() || '',
    title: '',
    description: '',
    assignedTo: '',
    estimatedHours: '',
    status: 'todo' as 'todo' | 'in_progress' | 'review' | 'done',
    dueDate: '',
    priority: '0',
    progressPercentage: '0',
  });

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      fetchUsers();
      if (task) {
        setFormData({
          projectId: task.project_id?.toString() || '',
          title: task.title || '',
          description: task.description || '',
          assignedTo: task.assigned_to?.toString() || '',
          estimatedHours: task.estimated_hours?.toString() || '',
          status: task.status || 'todo',
          dueDate: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
          priority: task.priority?.toString() || '0',
          progressPercentage: task.progress_percentage?.toString() || '0',
        });
      }
    }
  }, [task, isOpen, projectId]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error: any) {
      toast.error('Failed to load projects');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error: any) {
      // Silently fail - users endpoint might not be accessible
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        projectId: parseInt(formData.projectId),
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        status: formData.status,
        dueDate: formData.dueDate || null,
        priority: parseInt(formData.priority),
        progressPercentage: parseInt(formData.progressPercentage),
      };

      if (task) {
        await api.put(`/tasks/${task.id}`, payload);
        toast.success('Task updated successfully');
      } else {
        await api.post('/tasks', payload);
        toast.success('Task created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'New Task'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Project *</label>
          <select
            required
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            disabled={!!projectId}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-100"
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Title *</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Enter task title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Enter task description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Assignee</label>
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Estimated Hours</label>
            <input
              type="number"
              step="0.1"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Priority (0-5)</label>
            <input
              type="number"
              min="0"
              max="5"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Progress (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.progressPercentage}
              onChange={(e) => setFormData({ ...formData, progressPercentage: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Due Date</label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : task ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;

