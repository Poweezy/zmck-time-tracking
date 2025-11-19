import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { FormField } from './FormField';

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  milestone?: any;
  onSuccess: () => void;
}

const MilestoneModal = ({ isOpen, onClose, projectId, milestone, onSuccess }: MilestoneModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
  });

  useEffect(() => {
    if (milestone) {
      setFormData({
        name: milestone.name || '',
        description: milestone.description || '',
        targetDate: milestone.target_date ? new Date(milestone.target_date).toISOString().split('T')[0] : '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }
  }, [milestone, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (milestone) {
        // Update milestone (if update endpoint exists)
        toast.info('Milestone update coming soon');
      } else {
        await api.post('/milestones', {
          projectId,
          name: formData.name,
          description: formData.description || null,
          targetDate: formData.targetDate,
        });
        toast.success('Milestone created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save milestone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={milestone ? 'Edit Milestone' : 'New Milestone'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Milestone Name" name="name" required>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            required
            maxLength={200}
          />
        </FormField>

        <FormField label="Description" name="description">
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={3}
          />
        </FormField>

        <FormField label="Target Date" name="targetDate" required>
          <input
            type="date"
            value={formData.targetDate}
            onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            className="input"
            required
          />
        </FormField>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : milestone ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MilestoneModal;

