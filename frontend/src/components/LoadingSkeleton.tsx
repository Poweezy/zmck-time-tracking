interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'list' | 'dashboard';
  count?: number;
}

const LoadingSkeleton = ({ type = 'card', count = 1 }: LoadingSkeletonProps) => {
  if (type === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white shadow-card rounded-xl p-6 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white shadow-card rounded-xl p-6 border border-gray-100 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-40 mb-6"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-white shadow-card rounded-xl overflow-hidden border border-gray-100">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-50 border-b border-gray-200"></div>
          {[...Array(count)].map((_, i) => (
            <div key={i} className="h-16 border-b border-gray-200 bg-white">
              <div className="px-6 py-4 flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-4"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="bg-white shadow-card rounded-xl p-6 border border-gray-100 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  // Default card type
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white shadow-card rounded-xl p-6 border border-gray-100 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;

