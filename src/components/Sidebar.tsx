import { useState } from "react";
import {
  LayoutDashboard,
  Home,
  Calendar,
  CalendarDays,
  CheckSquare,
  User,
  CreditCard,
  Ban,
  LogOut,
  Menu,
  X,
  FileText,
} from "lucide-react";
import { fr } from "../lib/i18n/fr";
import { SupportButton } from "./SupportButton";
import { AppPage } from "../lib/navigation";

interface SidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  hostName?: string;
}

export function Sidebar({ currentPage, onNavigate, onLogout, hostName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems: Array<{
    id: AppPage;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: "dashboard", label: fr.sidebar.menu.dashboard, icon: LayoutDashboard },
    { id: "properties", label: fr.sidebar.menu.properties, icon: Home },
    { id: "reservations", label: fr.sidebar.menu.reservations, icon: Calendar },
    { id: "checkins", label: fr.sidebar.menu.checkins, icon: CheckSquare },
    { id: "calendar", label: fr.sidebar.menu.calendar, icon: CalendarDays },
    { id: "contracts", label: fr.sidebar.menu.contracts, icon: FileText },
    { id: "profile", label: fr.sidebar.menu.profile, icon: User },
    { id: "blacklist", label: fr.sidebar.menu.blacklist, icon: Ban },
    { id: "pricing", label: fr.sidebar.menu.pricing, icon: CreditCard },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? fr.sidebar.closeMenuAria : fr.sidebar.openMenuAria}
        className={`fixed top-4 left-4 z-50 lg:hidden p-2.5 bg-slate-900 text-white rounded-lg shadow-lg active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <Menu size={22} />
      </button>

      <aside
        className={`
          fixed lg:static left-0 top-0 h-screen w-64 bg-slate-900
          transform lg:transform-none transition-transform duration-300 z-40
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          shadow-2xl
        `}
      >
        <div className="h-full flex flex-col">
          <div className="relative p-6 border-b border-slate-700">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={fr.sidebar.closeMenuAria}
              className="absolute right-4 top-4 lg:hidden rounded-lg p-1.5 text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <X size={20} />
            </button>
            <h1 className="text-2xl font-bold text-white">{fr.app.brand}</h1>
            <p className="text-slate-300 text-sm mt-2">
              {hostName || fr.app.hostFallbackName}
            </p>
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
                      ? "bg-white text-slate-900 shadow-lg"
                      : "text-slate-200 hover:bg-slate-700/50"
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-700 space-y-3">
            <SupportButton />
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-slate-200 hover:bg-red-600/20 hover:text-red-200 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <LogOut size={20} />
              <span>{fr.sidebar.logout}</span>
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
