import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from './Modal';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: any;
  onSuccess: () => void;
}

const ProjectModal = ({ isOpen, onClose, project, onSuccess }: ProjectModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    client: '',
    type: 'OPEN' as 'FIXED' | 'OPEN' | 'HYBRID',
    status: 'planning' as string,
    allocatedHours: '',
    budgetAmount: '',
    description: '',
    managerId: '',
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        code: project.code || '',
        client: project.client || '',
        type: project.type || 'OPEN',
        status: project.status || 'planning',
        allocatedHours: project.allocated_hours?.toString() || '',
        budgetAmount: project.budget_amount?.toString() || '',
        description: project.description || '',
        managerId: project.manager_id?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        client: '',
        type: 'OPEN',
        status: 'planning',
        allocatedHours: '',
        budgetAmount: '',
        description: '',
        managerId: '',
      });
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        client: formData.client,
        type: formData.type,
        status: formData.status,
        allocatedHours: formData.allocatedHours ? parseFloat(formData.allocatedHours) : null,
        budgetAmount: formData.budgetAmount ? parseFloat(formData.budgetAmount) : null,
        description: formData.description,
        managerId: formData.managerId ? parseInt(formData.managerId) : null,
      };

      if (project) {
        await api.put(`/projects/${project.id}`, payload);
        toast.success('Project updated successfully');
      } else {
        await api.post('/projects', payload);
        toast.success('Project created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={project ? 'Edit Project' : 'New Project'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Code *</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Client *</label>
          <input
            type="text"
            required
            value={formData.client}
            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type *</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="OPEN">Open</option>
              <option value="FIXED">Fixed</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status *</label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Allocated Hours</label>
            <input
              type="number"
              step="0.01"
              value={formData.allocatedHours}
              onChange={(e) => setFormData({ ...formData, allocatedHours: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Budget Amount</label>
            <input
              type="number"
              step="0.01"
              value={formData.budgetAmount}
              onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
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
            {loading ? 'Saving...' : project ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectModal;

