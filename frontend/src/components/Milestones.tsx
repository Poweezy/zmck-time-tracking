import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format, isPast, isToday } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

interface Milestone {
  id: number;
  name: string;
  description?: string;
  target_date: string;
  completed_date?: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'overdue';
  project_name?: string;
  project_code?: string;
}

interface MilestonesProps {
  projectId: number;
  onMilestoneComplete?: () => void;
}

const Milestones = ({ projectId, onMilestoneComplete }: MilestonesProps) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const fetchMilestones = async () => {
    try {
      const response = await api.get('/milestones', { params: { projectId } });
      setMilestones(response.data);
    } catch (error: any) {
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.put(`/milestones/${id}/complete`);
      toast.success('Milestone marked as completed');
      fetchMilestones();
      if (onMilestoneComplete) onMilestoneComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to complete milestone');
    }
  };

  const getStatusColor = (status: string, targetDate: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'overdue' || (status !== 'completed' && isPast(new Date(targetDate)) && !isToday(new Date(targetDate)))) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    if (status === 'in_progress') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return <div className="animate-pulse space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      ))}
    </div>;
  }

  if (milestones.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        <p className="text-sm">No milestones for this project</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          className={`p-4 rounded-lg border-2 transition-all duration-200 ${getStatusColor(milestone.status, milestone.target_date)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{milestone.name}</h4>
                {milestone.status === 'completed' && (
                  <span className="text-green-600 dark:text-green-400">✓</span>
                )}
              </div>
              {milestone.description && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{milestone.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span>Target: {format(new Date(milestone.target_date), 'MMM dd, yyyy')}</span>
                {milestone.completed_date && (
                  <span>Completed: {format(new Date(milestone.completed_date), 'MMM dd, yyyy')}</span>
                )}
              </div>
            </div>
            {(user?.role === 'admin' || user?.role === 'supervisor') && milestone.status !== 'completed' && (
              <button
                onClick={() => handleComplete(milestone.id)}
                className="ml-4 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Mark Complete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Milestones;

