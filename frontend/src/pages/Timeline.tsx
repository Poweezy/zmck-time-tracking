import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

interface TimelineProject {
  id: number;
  name: string;
  code: string;
  start_date?: string;
  end_date?: string;
  status: string;
  tasks: TimelineTask[];
}

interface TimelineTask {
  id: number;
  title: string;
  due_date?: string;
  status: string;
  assigned_to?: number;
}

const Timeline = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [projects, setProjects] = useState<TimelineProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchProjects();
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      const allProjects = response.data.data || response.data;

      // Fetch tasks for each project
      const projectsWithTasks = await Promise.all(
        allProjects.map(async (project: any) => {
          const tasksResponse = await api.get('/tasks', {
            params: { projectId: project.id },
          });
          const tasks = tasksResponse.data.data || tasksResponse.data;
          return { ...project, tasks };
        })
      );

      // Filter by selected project if any
      const filtered = selectedProject
        ? projectsWithTasks.filter((p) => p.id === selectedProject)
        : projectsWithTasks;

      setProjects(filtered);
    } catch (error: any) {
      toast.error('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getProjectPosition = (project: TimelineProject) => {
    if (!project.start_date) return null;
    const start = new Date(project.start_date);
    const end = project.end_date ? new Date(project.end_date) : new Date();
    
    const daysFromStart = Math.floor((start.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return { start: daysFromStart, duration: Math.max(1, duration) };
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'bg-gray-200',
      active: 'bg-blue-500',
      on_hold: 'bg-yellow-500',
      completed: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-200';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Timeline</h1>
          <p className="text-gray-600 text-lg">
            {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
            className="input text-sm py-2 px-4 w-auto min-w-[200px]"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              className="btn-secondary"
            >
              ← Previous
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="btn-primary"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              className="btn-secondary"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10 border-r">
                  Project
                </th>
                {days.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                  >
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-gray-900 font-normal">{format(day, 'MMM d')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => {
                const position = getProjectPosition(project);
                return (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r">
                      <div className="font-semibold">{project.code}</div>
                      <div className="text-xs text-gray-500">{project.name}</div>
                    </td>
                    {days.map((day, dayIndex) => {
                      const isInRange =
                        position &&
                        dayIndex >= position.start &&
                        dayIndex < position.start + position.duration;
                      const isStart = position && dayIndex === position.start;
                      const isEnd = position && dayIndex === position.start + position.duration - 1;

                      return (
                        <td key={day.toISOString()} className="px-2 py-3 relative">
                          {isInRange && (
                            <div
                              className={`absolute inset-y-1 ${getStatusColor(project.status)} rounded ${
                                isStart ? 'rounded-l-none' : ''
                              } ${isEnd ? 'rounded-r-none' : ''} ${
                                !isStart && !isEnd ? 'rounded-none' : ''
                              } opacity-75 hover:opacity-100 transition-opacity cursor-pointer`}
                              style={{
                                left: isStart ? '4px' : '0',
                                right: isEnd ? '4px' : '0',
                              }}
                              title={`${project.name} (${format(new Date(project.start_date!), 'MMM dd')} - ${project.end_date ? format(new Date(project.end_date), 'MMM dd') : 'Ongoing'})`}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Legend</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <span className="text-sm text-gray-700">Planning</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-700">Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-700">On Hold</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700">Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-700">Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;

