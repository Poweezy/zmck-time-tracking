import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from './Modal';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  startTime: Date;
  endTime: Date;
  durationHours: number;
  onSave: () => void;
}

const TimerModal = ({ isOpen, onClose, startTime, endTime, durationHours, onSave }: TimerModalProps) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    taskId: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.projectId) {
      fetchTasks(parseInt(formData.projectId));
    } else {
      setTasks([]);
    }
  }, [formData.projectId]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error: any) {
      toast.error('Failed to load projects');
    }
  };

  const fetchTasks = async (projectId: number) => {
    try {
      const response = await api.get('/tasks', { params: { projectId } });
      setTasks(response.data);
    } catch (error: any) {
      toast.error('Failed to load tasks');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) {
      toast.error('Please select a project');
      return;
    }

    setLoading(true);
    try {
      await api.post('/time-entries', {
        projectId: parseInt(formData.projectId),
        taskId: formData.taskId ? parseInt(formData.taskId) : null,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationHours,
        notes: formData.notes,
      });

      toast.success('Time entry saved successfully');
      onSave();
      onClose();
      setFormData({ projectId: '', taskId: '', notes: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save time entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Time Entry" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Duration:</span>
              <span className="ml-2 font-semibold text-gray-900">{durationHours.toFixed(2)} hours</span>
            </div>
            <div>
              <span className="text-gray-600">Start:</span>
              <span className="ml-2 font-semibold text-gray-900">
                {startTime.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project *
          </label>
          <select
            required
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value, taskId: '' })}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task (Optional)
          </label>
          <select
            value={formData.taskId}
            onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
            disabled={!formData.projectId || tasks.length === 0}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-100"
          >
            <option value="">No task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="What did you work on?"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
            {loading ? 'Saving...' : 'Save Time Entry'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TimerModal;

