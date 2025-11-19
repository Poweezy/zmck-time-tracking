import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import NotificationBell from './NotificationBell';
import { useCommonShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

const Layout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Enable keyboard shortcuts
  useCommonShortcuts();

  const navigation = [
    { name: 'Home', href: '/dashboard', icon: '🏠', action: null },
    { name: 'My Tasks', href: '/my-tasks', icon: '✓', action: null },
    { name: 'Inbox', href: '#', icon: '📬', action: () => {
      // Open notifications dropdown - handled by NotificationBell
      const bellButton = document.querySelector('[aria-label*="notification"]') as HTMLElement;
      if (bellButton) bellButton.click();
    } },
  ];

  const projectsNav = [
    { name: 'Projects', href: '/projects', icon: '📁' },
    { name: 'Tasks', href: '/tasks', icon: '📋' },
    { name: 'Calendar', href: '/calendar', icon: '📅' },
    { name: 'Timeline', href: '/timeline', icon: '📊' },
  ];

  const adminNav = [
    { name: 'Time Tracking', href: '/time-tracking', icon: '⏱️' },
    { name: 'Approvals', href: '/approvals', icon: '✅' },
    { name: 'Analytics', href: '/analytics', icon: '📈' },
    { name: 'Workload', href: '/workload', icon: '⚖️' },
    { name: 'Users', href: '/users', icon: '👥' },
  ];

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };


  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Dark Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-sidebar-dark text-white transition-all duration-300 flex-shrink-0 flex flex-col border-r border-sidebar-hover`}>
        {/* Sidebar Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-sidebar-hover">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold text-sm">
                Z
              </div>
              <span className="font-bold text-lg">ZMCK Time</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1 mb-6">
            {navigation.map((item) => {
              if (item.action) {
                return (
                  <button
                    key={item.name}
                    onClick={item.action}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group w-full text-left text-gray-600 hover:bg-sidebar-hover hover:text-white"
                    title={!sidebarOpen ? item.name : undefined}
                    aria-label={item.name}
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    {sidebarOpen && <span className="text-sm">{item.name}</span>}
                  </button>
                );
              }
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group w-full text-left ${
                    isActive(item.href)
                      ? 'bg-sidebar-active text-white font-medium'
                      : 'text-gray-600 hover:bg-sidebar-hover hover:text-white'
                  }`}
                  title={!sidebarOpen ? item.name : undefined}
                  aria-label={item.name}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {sidebarOpen && <span className="text-sm">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          {/* Projects Section */}
          <div className="mb-6">
            {sidebarOpen && (
              <div className="flex items-center justify-between px-3 py-2 mb-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Projects</div>
                <div className="flex items-center gap-1">
                  <button 
                    className="p-1 hover:bg-sidebar-hover rounded text-gray-600 hover:text-white"
                    aria-label="Project options"
                    title="Project options"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  <button 
                    className="p-1 hover:bg-sidebar-hover rounded text-gray-600 hover:text-white"
                    aria-label="Add project"
                    title="Add project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              {projectsNav.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive(item.href)
                      ? 'bg-sidebar-active text-white font-medium'
                      : 'text-gray-600 hover:bg-sidebar-hover hover:text-white'
                  }`}
                  title={!sidebarOpen ? item.name : undefined}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {sidebarOpen && <span className="text-sm">{item.name}</span>}
                </Link>
              ))}
            </div>
          </div>

          {/* Admin Navigation */}
          {(user?.role === 'admin' || user?.role === 'supervisor') && (
            <div className="mb-6">
              {sidebarOpen && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  Management
                </div>
              )}
              <div className="space-y-1">
                {adminNav.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                      isActive(item.href)
                        ? 'bg-sidebar-active text-white font-medium'
                        : 'text-gray-600 hover:bg-sidebar-hover hover:text-white'
                    }`}
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    {sidebarOpen && <span className="text-sm">{item.name}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-sidebar-hover">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {getInitials(user?.firstName, user?.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-gray-600 capitalize">{user?.role}</div>
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors text-gray-600 hover:text-white"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {getInitials(user?.firstName, user?.lastName)}
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-sidebar-hover rounded-lg transition-colors text-gray-600 hover:text-white"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => navigate('/tasks/new')}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create</span>
            </button>
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white"
              aria-label="Toggle dark mode"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold shadow-md cursor-pointer hover:shadow-lg transition-shadow">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-8">
          <Outlet />
        </main>
      </div>
      <KeyboardShortcutsHelp />
    </div>
  );
};

export default Layout;
