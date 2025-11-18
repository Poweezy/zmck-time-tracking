import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import ProjectModal from '../components/ProjectModal';
import SearchBar from '../components/SearchBar';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSkeleton from '../components/LoadingSkeleton';

interface Project {
  id: number;
  name: string;
  code: string;
  client: string;
  type: 'FIXED' | 'OPEN' | 'HYBRID';
  status: string;
  allocated_hours?: number;
  budget_amount?: number;
  manager_name?: string;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; project: Project | null }>({
    isOpen: false,
    project: null,
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
    fetchProjects();
  }, [searchQuery, pagination.page]);

  const fetchProjects = async () => {
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await api.get('/projects', { params });
      if (response.data.data) {
        // Paginated response
        setProjects(response.data.data);
        setPagination(response.data.pagination);
      } else {
        // Legacy response (backward compatibility)
        setProjects(response.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.project) return;

    try {
      await api.delete(`/projects/${deleteConfirm.project.id}`);
      toast.success('Project deleted successfully');
      fetchProjects();
      setDeleteConfirm({ isOpen: false, project: null });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete project');
    }
  };

  const handleCreate = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <LoadingSkeleton type="card" count={6} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Projects</h1>
          <p className="text-gray-600">Manage all your engineering projects</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <button
            onClick={handleCreate}
            className="bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
          >
            <span className="text-lg">+</span>
            <span>New Project</span>
          </button>
        )}
      </div>

      <div className="mb-6">
        <SearchBar
          onSearch={setSearchQuery}
          placeholder="Search projects by name, code, or client..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-xl shadow-card border border-gray-100 p-6 hover:shadow-hover hover:border-primary-200 transition-all duration-200 cursor-pointer"
            onClick={() => handleEdit(project)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <p className="text-sm text-primary-600 font-medium">{project.code}</p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                  project.status
                )}`}
              >
                {project.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <span className="font-medium mr-2">Client:</span>
                <span>{project.client}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-2">Type:</span>
                <span>{project.type}</span>
              </div>
              {project.manager_name && (
                <div className="flex items-center">
                  <span className="font-medium mr-2">Manager:</span>
                  <span>{project.manager_name}</span>
                </div>
              )}
              {project.allocated_hours && (
                <div className="flex items-center">
                  <span className="font-medium mr-2">Allocated:</span>
                  <span>{project.allocated_hours.toFixed(1)}h</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Link
                to={`/tasks?projectId=${project.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View Tasks →
              </Link>
              {(user?.role === 'admin' || user?.role === 'supervisor') && (
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(project);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ isOpen: true, project });
                    }}
                    className="text-sm text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">No projects found</p>
          {(user?.role === 'admin' || user?.role === 'supervisor') && (
            <button
              onClick={handleCreate}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Create your first project
            </button>
          )}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
            projects
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

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={selectedProject}
        onSuccess={fetchProjects}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, project: null })}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteConfirm.project?.name}"? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};

export default Projects;

