import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  Lightbulb,
  Network,
  NotebookPen,
  Target,
  Users,
} from 'lucide-react';

const MODULES = [
  { to: '/m/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/m/objectives', label: 'Objectifs', icon: Target },
  { to: '/m/strategy', label: 'Stratégie', icon: Lightbulb },
  { to: '/m/projects', label: 'Projets', icon: FolderKanban },
  { to: '/m/crm', label: 'CRM', icon: Users },
  { to: '/m/opportunities', label: 'Opportunités', icon: CalendarDays },
  { to: '/m/journal', label: 'Journal', icon: NotebookPen },
  { to: '/m/graph', label: 'Graphe', icon: Network },
];

export function ModuleNav() {
  return (
    <nav className="px-2 pb-2">
      {MODULES.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
              isActive
                ? 'bg-notion-hover font-medium dark:bg-notion-hover-dark'
                : 'text-notion-text/90 hover:bg-notion-hover dark:text-notion-text-dark/90 dark:hover:bg-notion-hover-dark'
            }`
          }
        >
          <Icon size={16} className="text-notion-accent" /> {label}
        </NavLink>
      ))}
    </nav>
  );
}
