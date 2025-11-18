import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  hourly_rate?: number;
  is_active: boolean;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Users</h1>
          <p className="text-gray-600">Manage team members and their access</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <span className="text-lg">+</span>
          <span>New User</span>
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hourly Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                      {user.first_name[0]}{user.last_name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="badge badge-primary capitalize">{user.role}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                  {user.hourly_rate ? `E${user.hourly_rate}` : <span className="text-gray-400">-</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`badge ${
                      user.is_active ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;

