import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import TimerModal from '../components/TimerModal';
import SearchBar from '../components/SearchBar';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface TimeEntry {
  id: number;
  start_time: string;
  duration_hours: number;
  notes?: string;
  project_name: string;
  task_title?: string;
  approval_status: string;
}

const TimeTracking = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [timerDisplay, setTimerDisplay] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; entry: TimeEntry | null }>({
    isOpen: false,
    entry: null,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchEntries();
  }, [searchQuery, pagination.page]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerStart) {
      interval = setInterval(() => {
        setTimerDisplay(Math.floor((new Date().getTime() - timerStart.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerStart]);

  const fetchEntries = async () => {
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (searchQuery) params.search = searchQuery;
      const response = await api.get('/time-entries', { params });
      if (response.data.data) {
        setEntries(response.data.data);
        setPagination(response.data.pagination);
      } else {
        setEntries(response.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.entry) return;

    try {
      await api.delete(`/time-entries/${deleteConfirm.entry.id}`);
      toast.success('Time entry deleted successfully');
      fetchEntries();
      setDeleteConfirm({ isOpen: false, entry: null });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete time entry');
    }
  };

  const startTimer = () => {
    setTimerRunning(true);
    setTimerStart(new Date());
    setTimerDisplay(0);
  };

  const stopTimer = () => {
    if (!timerStart) return;
    setTimerRunning(false);
    setIsModalOpen(true);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationHours = () => {
    if (!timerStart) return 0;
    return (new Date().getTime() - timerStart.getTime()) / (1000 * 60 * 60);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-white shadow-card rounded-xl border border-gray-100 animate-pulse"></div>
        <LoadingSkeleton type="table" count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Time Tracking</h1>
        <p className="text-gray-600">Track your work time with a timer or manual entry</p>
      </div>

      <div className="bg-white shadow-card rounded-xl p-8 mb-6 border border-primary-200 bg-gradient-to-br from-primary-50/50 to-white">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Timer</h2>
          <div className="text-6xl font-mono font-bold text-primary-600 mb-6">
            {formatTime(timerDisplay)}
          </div>
          <div className="flex justify-center space-x-4">
            {!timerRunning ? (
              <button
                onClick={startTimer}
                className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-xl"
              >
                ▶ Start Timer
              </button>
            ) : (
              <button
                onClick={stopTimer}
                className="bg-red-600 text-white px-8 py-3 rounded-xl hover:bg-red-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-xl"
              >
                ⏹ Stop Timer
              </button>
            )}
          </div>
          {timerRunning && (
            <p className="mt-4 text-sm text-gray-500">
              Timer started at {timerStart?.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white shadow-card rounded-xl overflow-hidden border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Time Entries</h2>
          </div>
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search by project, task, notes, or user..."
          />
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(entry.start_time), 'MMM dd, yyyy HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {entry.project_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.task_title || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {entry.duration_hours.toFixed(2)}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      entry.approval_status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : entry.approval_status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : entry.approval_status === 'changes_requested'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {entry.approval_status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {entry.approval_status === 'pending' && (
                    <button
                      onClick={() => setDeleteConfirm({ isOpen: true, entry })}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No time entries yet. Start the timer to track your time!</p>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
              entries
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={!pagination.hasPrev}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={!pagination.hasNext}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <TimerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTimerStart(null);
          setTimerDisplay(0);
        }}
        startTime={timerStart || new Date()}
        endTime={new Date()}
        durationHours={getDurationHours()}
        onSave={fetchEntries}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, entry: null })}
        onConfirm={handleDelete}
        title="Delete Time Entry"
        message={`Are you sure you want to delete this time entry (${deleteConfirm.entry?.duration_hours.toFixed(2)}h)? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};

export default TimeTracking;

