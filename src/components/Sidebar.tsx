import { useState } from 'react';
import { LayoutDashboard, Home, Calendar, CalendarDays, CheckSquare, User, LogOut, Menu, X, FileText } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  hostName?: string;
}

export function Sidebar({ currentPage, onNavigate, onLogout, hostName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'properties', label: 'Propriétés', icon: Home },
    { id: 'reservations', label: 'Reservations', icon: Calendar },
    { id: 'checkins', label: 'Check-ins', icon: CheckSquare },
    { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
    { id: 'contracts', label: 'Contrats', icon: FileText },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 bg-blue-600 text-white rounded-lg shadow-lg active:scale-95 transition-transform"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <aside
        className={`
          fixed lg:static left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-blue-900
          transform lg:transform-none transition-transform duration-300 z-40
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-2xl
        `}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-700">
            <h1 className="text-2xl font-bold text-white">HostCheckIn</h1>
            <p className="text-slate-300 text-sm mt-2">{hostName || 'Host'}</p>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3.5 rounded-lg font-medium
                    transition-all duration-200
                    ${isActive
                      ? 'bg-white text-slate-900 shadow-lg'
                      : 'text-slate-200 hover:bg-slate-700/50'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-700">
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-slate-200 hover:bg-red-600/20 hover:text-red-200 font-medium transition-all duration-200"
            >
              <LogOut size={20} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
