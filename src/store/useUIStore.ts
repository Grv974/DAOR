import { create } from 'zustand';

const THEME_KEY = 'daor:theme';

type ThemeMode = 'light' | 'dark';

function initialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

interface UIState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  searchOpen: boolean;
  helpOpen: boolean;
  trashOpen: boolean;
  captureOpen: boolean;
  copilotOpen: boolean;
  syncOpen: boolean;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setTrashOpen: (open: boolean) => void;
  setCaptureOpen: (open: boolean) => void;
  setCopilotOpen: (open: boolean) => void;
  setSyncOpen: (open: boolean) => void;
}

function initialSidebar(): boolean {
  try {
    return window.matchMedia('(min-width: 768px)').matches;
  } catch {
    return true;
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme(),
  sidebarOpen: initialSidebar(),
  searchOpen: false,
  helpOpen: false,
  trashOpen: false,
  captureOpen: false,
  copilotOpen: false,
  syncOpen: false,

  toggleTheme() {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    set({ theme: next });
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setTrashOpen: (open) => set({ trashOpen: open }),
  setCaptureOpen: (open) => set({ captureOpen: open }),
  setCopilotOpen: (open) => set({ copilotOpen: open }),
  setSyncOpen: (open) => set({ syncOpen: open }),
}));
