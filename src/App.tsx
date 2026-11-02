import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ComparePage } from './pages/ComparePage';
import { SettingsPage } from './pages/SettingsPage';
import { CreateProjectModal } from './components/projects/CreateProjectModal';
import { fetchProjects } from './services/api';
import type { ProjectSummary } from '../electron/preload/types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const loadProjects = async () => {
    setLoadingProjects(true);
    const res = await fetchProjects();
    if (res.success && res.data) {
      setProjects(res.data);
    }
    setLoadingProjects(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header currentTab={currentTab} />

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigate={setCurrentTab}
              onOpenNewProjectModal={() => setIsCreateModalOpen(true)}
            />
          )}

          {currentTab === 'projects' && (
            <ProjectsPage
              projects={projects}
              loading={loadingProjects}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onSelectProject={(_id) => {
                setCurrentTab('compare');
              }}
            />
          )}

          {currentTab === 'compare' && (
            <ComparePage
              projects={projects}
              onNavigateToProjects={() => setCurrentTab('projects')}
            />
          )}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Modal for creating projects */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadProjects();
        }}
      />
    </div>
  );
};

export default App;
