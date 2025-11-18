import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TaskBoard from '../components/TaskBoard';
import TaskList from '../components/TaskList';
import SearchBar from '../components/SearchBar';

const Tasks = () => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const projectId = searchParams.get('projectId');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tasks</h1>
          <p className="text-gray-600">Manage and track all your project tasks</p>
        </div>
        <div className="flex items-center space-x-2 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode('board')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === 'board'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="mb-4">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search tasks by title, description, or project..."
          />
        </div>
      )}

      {viewMode === 'board' ? <TaskBoard /> : <TaskList projectId={projectId ? parseInt(projectId) : undefined} searchQuery={searchQuery} />}
    </div>
  );
};

export default Tasks;

