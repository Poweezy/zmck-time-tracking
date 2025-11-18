import { useState, useEffect } from 'react';
import api from '../utils/api';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'supervisor' | 'engineer';
  hourlyRate?: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Verify token is still valid
      api
        .get('/auth/me')
        .then((response) => {
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return { token, user };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return { user, loading, login, logout };
};

