import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ComparePage } from './pages/ComparePage';
import { SettingsPage } from './pages/SettingsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CreateProjectModal } from './components/projects/CreateProjectModal';
import { fetchProjects } from './services/api';
import { api } from './services/api';
import type { ProjectSummary } from '../electron/preload/types';

export const App: React.FC = () => {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const removeProject = async (project: ProjectSummary) => {
    const confirmation = window.confirm(t('projects.deleteConfirm', { name: project.name, warning: t('projects.deleteWarning') }));
    if (!confirmation) return;
    let result;
    try { result = await api.deleteProject(project.id); }
    catch (error) { setNotice({ type: 'error', message: error instanceof Error ? error.message : t('projects.deleteError') }); return; }
    if (!result.success) { setNotice({ type: 'error', message: result.error || t('projects.deleteError') }); return; }
    if (activeProjectId === project.id) { setActiveProjectId(null); setCurrentTab('dashboard'); }
    await loadProjects();
    setNotice({ type: 'success', message: t('projects.deleteSuccess', { name: project.name }) });
    window.setTimeout(() => setNotice(null), 5000);
  };

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
          {notice && <div role="status" className={`mx-6 mt-4 rounded-lg border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'}`}>{notice.message}</div>}
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigate={setCurrentTab}
              onOpenNewProjectModal={() => { setEditingProject(null); setIsCreateModalOpen(true); }}
            />
          )}

          {currentTab === 'projects' && (
            <ProjectsPage
              projects={projects}
              loading={loadingProjects}
              onOpenCreateModal={() => { setEditingProject(null); setIsCreateModalOpen(true); }}
              onEditProject={(project) => { setEditingProject(project); setIsCreateModalOpen(true); }}
              onDeleteProject={(project) => void removeProject(project)}
              onSelectProject={(id) => {
                setActiveProjectId(id);
                setCurrentTab('compare');
              }}
            />
          )}
          {currentTab === 'suppliers' && <SuppliersPage />}

          {currentTab === 'compare' && (
            <ComparePage
              projects={projects}
              activeProjectId={activeProjectId}
              onManageSuppliers={(project) => { setEditingProject(project); setIsCreateModalOpen(true); }}
              onImportComplete={loadProjects}
              onNavigateToProjects={() => setCurrentTab('projects')}
            />
          )}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Modal for creating projects */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setEditingProject(null); }}
        editingProject={editingProject}
        onSuccess={() => {
          loadProjects();
          setEditingProject(null);
        }}
      />
    </div>
  );
};

export default App;
