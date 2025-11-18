import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

interface CalendarEvent {
  id: number;
  type: 'task' | 'project';
  title: string;
  date: string;
  status?: string;
  project_name?: string;
}

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      // Fetch tasks with due dates
      const tasksResponse = await api.get('/tasks', {
        params: {
          assignedTo: user?.role === 'engineer' ? user.id : undefined,
          from: format(start, 'yyyy-MM-dd'),
          to: format(end, 'yyyy-MM-dd'),
        },
      });

      const tasks = tasksResponse.data.data || tasksResponse.data;
      const taskEvents: CalendarEvent[] = tasks
        .filter((task: any) => task.due_date)
        .map((task: any) => ({
          id: task.id,
          type: 'task' as const,
          title: task.title,
          date: task.due_date,
          status: task.status,
          project_name: task.project_name,
        }));

      // Fetch projects with start/end dates
      const projectsResponse = await api.get('/projects');
      const projects = projectsResponse.data.data || projectsResponse.data;
      const projectEvents: CalendarEvent[] = projects
        .filter((project: any) => project.start_date || project.end_date)
        .flatMap((project: any) => {
          const events: CalendarEvent[] = [];
          if (project.start_date) {
            events.push({
              id: project.id,
              type: 'project' as const,
              title: `${project.code} - Start`,
              date: project.start_date,
              project_name: project.name,
            });
          }
          if (project.end_date) {
            events.push({
              id: project.id + 10000,
              type: 'project' as const,
              title: `${project.code} - End`,
              date: project.end_date,
              project_name: project.name,
            });
          }
          return events;
        });

      setEvents([...taskEvents, ...projectEvents]);
    } catch (error: any) {
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week for the month
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.date), day));
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === 'project') {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    const statusColors: Record<string, string> = {
      done: 'bg-green-100 text-green-800 border-green-300',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      review: 'bg-orange-100 text-orange-800 border-orange-300',
      todo: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return statusColors[event.status || 'todo'] || 'bg-gray-100 text-gray-800 border-gray-300';
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar</h1>
          <p className="text-gray-600 text-lg">{format(currentDate, 'MMMM yyyy')}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
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
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="btn-secondary"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="px-4 py-4 text-center text-sm font-bold text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[100px] border-r border-b border-gray-200"></div>
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] border-r border-b border-gray-200 p-2 ${
                  isToday ? 'bg-blue-50' : ''
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs px-2 py-1 rounded border ${getEventColor(event)} truncate`}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Legend</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-sm text-gray-700">Project</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-sm text-gray-700">Task (Done)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-sm text-gray-700">Task (In Progress)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span className="text-sm text-gray-700">Task (To Do)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;

