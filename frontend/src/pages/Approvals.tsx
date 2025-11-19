import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface TimeEntry {
  id: number;
  start_time: string;
  duration_hours: number;
  notes?: string;
  user_name: string;
  project_name: string;
  task_title?: string;
}

const Approvals = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);
  const [rejectConfirm, setRejectConfirm] = useState<{ isOpen: boolean; entryId: number | null }>({
    isOpen: false,
    entryId: null,
  });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const response = await api.get('/approvals/pending');
      setEntries(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/approvals/${id}/approve`);
      toast.success('Time entry approved');
      fetchPending();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectConfirm.entryId || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await api.put(`/approvals/${rejectConfirm.entryId}/reject`, {
        rejectionReason: rejectReason,
      });
      toast.success('Time entry rejected');
      setRejectConfirm({ isOpen: false, entryId: null });
      setRejectReason('');
      fetchPending();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedEntries.length === 0) {
      toast.error('Please select at least one entry');
      return;
    }

    try {
      await api.post('/approvals/bulk-approve', { entryIds: selectedEntries });
      toast.success(`${selectedEntries.length} entries approved`);
      setSelectedEntries([]);
      fetchPending();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve');
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedEntries((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEntries.length === entries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(entries.map((e) => e.id));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-gray-200 rounded-xl w-64 animate-pulse"></div>
        <LoadingSkeleton type="table" count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending Approvals</h1>
          <p className="text-gray-600">Review and approve time entries</p>
        </div>
        {selectedEntries.length > 0 && (
          <button
            onClick={handleBulkApprove}
            className="bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            Approve Selected ({selectedEntries.length})
          </button>
        )}
      </div>

      <div className="bg-white shadow-card rounded-xl overflow-hidden border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedEntries.length === entries.length && entries.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  aria-label="Select all entries"
                  title="Select all entries"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id} className={selectedEntries.includes(entry.id) ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedEntries.includes(entry.id)}
                    onChange={() => toggleSelection(entry.id)}
                    aria-label={`Select entry for ${entry.user_name || 'user'}`}
                    title={`Select entry for ${entry.user_name || 'user'}`}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {format(new Date(entry.start_time), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {entry.user_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {entry.project_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {entry.duration_hours.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleApprove(entry.id)}
                    className="text-green-600 hover:text-green-900"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectConfirm({ isOpen: true, entryId: entry.id })}
                    className="text-red-600 hover:text-red-900"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-700">No pending approvals</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={rejectConfirm.isOpen}
        onClose={() => {
          setRejectConfirm({ isOpen: false, entryId: null });
          setRejectReason('');
        }}
        onConfirm={handleReject}
        title="Reject Time Entry"
        message="Please provide a reason for rejection:"
        variant="danger"
        confirmText="Reject"
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Enter rejection reason..."
          rows={3}
          className="w-full mt-4 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
      </ConfirmDialog>
    </div>
  );
};

export default Approvals;

