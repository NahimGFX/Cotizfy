import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  FolderKanban,
  Users,
  Layers,
  ExternalLink,
  Trash2,
  Pencil,
} from "lucide-react";
import type { ProjectSummary } from "../../electron/preload/types";
import { formatDate } from "../utils/formatters";
import { PageHeader } from "../components/common/PageHeader";

interface ProjectsPageProps {
  projects: ProjectSummary[];
  loading: boolean;
  onOpenCreateModal: () => void;
  onSelectProject: (projectId: string) => void;
  onEditProject: (project: ProjectSummary) => void;
  onDeleteProject: (project: ProjectSummary) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  loading,
  onOpenCreateModal,
  onSelectProject,
  onEditProject,
  onDeleteProject,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = projects.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.client && p.client.toLowerCase().includes(term))
    );
  });

  return (
    <div className="page-content space-y-6">
      <PageHeader
        title={t("projects.title")}
        description={t("projects.subtitle")}
        action={
          <button
            onClick={onOpenCreateModal}
            className="action-primary w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t("projects.createButton")}</span>
          </button>
        }
      />

      {/* Filter and search bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          aria-label={t("projects.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("projects.searchPlaceholder")}
          className="control w-full py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-400"
        />
      </div>

      {/* Projects Table */}
      <div className="surface-card overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            {t("common.loading")}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {t("projects.noProjects")}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("dashboard.createFirstProject")}
            </p>
            <button
              onClick={onOpenCreateModal}
              className="mt-4 inline-flex items-center space-x-2 px-3.5 py-2 bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t("projects.createButton")}</span>
            </button>
          </div>
        ) : (
          <table className="data-table w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800">
                <th className="py-3 px-4">{t("projects.table.name")}</th>
                <th className="py-3 px-4">{t("projects.table.client")}</th>
                <th className="py-3 px-4">{t("projects.table.currency")}</th>
                <th className="py-3 px-4 text-center">
                  {t("projects.table.suppliers")}
                </th>
                <th className="py-3 px-4 text-center">
                  {t("projects.table.items")}
                </th>
                <th className="py-3 px-4">{t("projects.table.lastUpdate")}</th>
                <th className="py-3 px-4 text-right">
                  {t("projects.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                >
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => onSelectProject(project.id)}
                      className="text-left font-semibold text-slate-900 hover:text-teal-700 focus-visible:rounded dark:text-slate-100 dark:hover:text-teal-300"
                    >
                      {project.name}
                    </button>
                    {project.description && (
                      <div className="text-xs text-slate-400 truncate max-w-xs">
                        {project.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-600 dark:text-slate-300">
                    {project.client || "-"}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {project.currency}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center space-x-1 text-xs text-slate-600 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{project.suppliersCount}</span>
                    </span>
                    {project.supplierNames.length > 0 && (
                      <div
                        className="mt-1 max-w-40 truncate text-[10px] text-slate-400"
                        title={project.supplierNames.join(", ")}
                      >
                        {project.supplierNames.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center space-x-1 text-xs text-slate-600 font-medium">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{project.itemsCount}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {formatDate(project.updatedAt, "short")}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProject(project);
                      }}
                      className="icon-button mr-1"
                      title={t("common.edit")}
                      aria-label={`${t("common.edit")}: ${project.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project);
                      }}
                      className="icon-button mr-1 text-red-600 hover:border-red-100 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:border-red-900 dark:hover:bg-red-950/40"
                      title={t("common.delete")}
                      aria-label={`${t("common.delete")}: ${project.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(project.id);
                      }}
                      className="icon-button"
                      title={t("common.view")}
                      aria-label={`${t("common.view")}: ${project.name}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
