import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
        <p className="text-gray-600 text-lg">Deep insights into your time tracking data</p>
      </div>
      <div className="card bg-gradient-to-br from-primary-50 via-white to-accent-50 border-primary-200">
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl">
            📈
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Analytics Dashboard</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Advanced analytics and reporting features coming soon. Stay tuned for detailed insights into your time tracking data!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

