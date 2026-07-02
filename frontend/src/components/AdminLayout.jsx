import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Scale,
  Calendar,
  Wallet,
  UserCog,
  LogOut,
  Scale as GavelIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/clientes", label: "Clientes", icon: Users, testid: "nav-clientes" },
  { to: "/processos", label: "Processos", icon: Scale, testid: "nav-processos" },
  { to: "/agenda", label: "Agenda", icon: Calendar, testid: "nav-agenda" },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, testid: "nav-financeiro" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleLabel = {
    advogado: "Advogado (Admin)",
    estagiario: "Estagiário",
    secretaria: "Secretaria",
  }[user?.role] || "";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="gj-gradient-navy w-72 min-h-screen flex flex-col text-slate-300 border-r border-[#112240]">
        <div className="px-6 py-8 border-b border-[#112240]">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-md bg-[#C5A059]/10 border border-[#C5A059]/40 flex items-center justify-center">
              <GavelIcon className="h-5 w-5 text-[#C5A059]" />
            </div>
            <div>
              <div className="font-serif-gj text-xl text-white leading-none">Guardian Juri</div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#C5A059] mt-1">
                Advocacia · Gestão
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testid}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-[#112240] text-[#C5A059] border-l-4 border-[#C5A059] pl-3"
                    : "text-slate-300 hover:bg-[#112240] hover:text-white"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
          {user?.role === "advogado" && (
            <NavLink
              to="/usuarios"
              data-testid="nav-usuarios"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#112240] text-[#C5A059] border-l-4 border-[#C5A059] pl-3"
                    : "text-slate-300 hover:bg-[#112240] hover:text-white"
                }`
              }
            >
              <UserCog className="h-4 w-4" />
              Usuários
            </NavLink>
          )}
        </nav>

        <div className="p-4 border-t border-[#112240]">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="h-9 w-9 rounded-full bg-[#C5A059] text-[#0A192F] flex items-center justify-center font-semibold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-white truncate" data-testid="current-user-name">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#C5A059]">{roleLabel}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center justify-center gap-2 text-sm rounded-md py-2 border border-[#C5A059]/40 text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0A192F] transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-8 py-10 gj-fade-in">
          <Outlet />
        </div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
