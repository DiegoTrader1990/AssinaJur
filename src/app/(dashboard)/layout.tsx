'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileCheck2,
  FolderArchive,
  FileText,
  UserCheck,
  BarChart3,
  Settings,
  CreditCard,
  LogOut,
  Shield,
  Building2,
  Menu,
  X,
  ChevronRight,
  Plus,
  Search,
  Bell,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  MessageSquare
} from 'lucide-react';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  officeName: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlan, setActivePlan] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetch('/api/office/plan')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setActivePlan(data?.plan || ''))
      .catch(() => setActivePlan(''));
  }, []);

  const displayPlan = activePlan === 'SOLO'
    ? 'Essencial'
    : activePlan === 'PROFISSIONAL'
      ? 'Profissional'
      : activePlan === 'ESCRITORIO'
        ? 'Escritório'
        : activePlan || 'Ativo';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navCategories = [
    {
      group: 'PRINCIPAL',
      items: [
        { label: 'Início', href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'CONTRATAÇÃO E ASSINATURA',
      items: [
        { label: 'Documentos', href: '/documentos', icon: FileCheck2 },
        { label: 'WhatsApp IA', href: '/whatsapp', icon: MessageSquare, badge: 'IA Robô' },
        { label: 'Kits & Modelos', href: '/kits', icon: FolderArchive, badge: 'Diferencial' },
      ],
    },
    {
      group: 'GESTÃO DO ESCRITÓRIO',
      items: [
        { label: 'Clientes', href: '/clientes', icon: Users },
        { label: 'Processos', href: '/processos', icon: FolderArchive },
        { label: 'Equipe', href: '/equipe', icon: UserCheck },
        { label: 'Relatórios', href: '/relatorios', icon: BarChart3 },
        { label: 'Plano e Cobrança', href: '/plano', icon: CreditCard },
        { label: 'Configurações', href: '/configuracoes', icon: Settings },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#071B3A] flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white text-[#071B3A] font-heading font-extrabold flex items-center justify-center text-2xl animate-pulse shadow-xl">
            AJ
          </div>
          <p className="text-xs font-bold text-slate-300 font-heading">Carregando painel do escritório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col md:flex-row font-sans text-slate-800">
      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar de Navegação Premium */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#071B3A] text-white flex flex-col justify-between transition-transform duration-300 shadow-2xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header da Sidebar */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                router.push('/dashboard');
              }}
              className="flex items-center gap-3 text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-heading font-extrabold flex items-center justify-center text-lg shadow-md shrink-0 border border-white/10">
                AJ
              </div>
              <div className="overflow-hidden">
                <span className="font-heading font-extrabold text-white text-lg tracking-tight block leading-none">
                  Assina<span className="text-blue-400">Jur</span>
                </span>
                <p className="text-[10px] text-slate-300 font-medium truncate max-w-[130px] mt-0.5">
                  {user?.officeName || 'Escritório de Advocacia'}
                </p>
              </div>
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Botão de Destaque Primário */}
          <div className="p-4">
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                router.push('/kits/enviar');
              }}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-lg hover:shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-xs tracking-wide uppercase font-heading cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Novo Documento / Kit
            </button>
          </div>

          {/* Categorias de Menu */}
          <nav className="px-3 py-2 space-y-6 flex-1">
            {navCategories.map((group) => (
              <div key={group.group} className="space-y-1">
                <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5 font-heading">
                  {group.group}
                </span>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSidebarOpen(false);
                        router.push(item.href);
                      }}
                      className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600/25 text-white font-extrabold border-l-4 border-blue-500 shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold text-[9px] uppercase border border-blue-400/30">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User Card no Rodapé da Sidebar */}
          <div className="p-4 border-t border-white/10 bg-[#041228]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-md">
                  {user?.name?.substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                  <span className="text-[10px] text-slate-400 block truncate uppercase font-semibold">
                    {user?.role === 'OFFICE_ADMIN' ? 'Advogado Admin' : 'Advogado'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Encerrar sessão"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Banner Superior de Status do Plano */}
        <div className="bg-[#071B3A] text-white px-6 py-2 flex items-center justify-between text-xs border-b border-white/10 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-medium text-slate-200">
              ⚡ <strong>Plano {displayPlan} ativo</strong> — Consulte aqui o consumo mensal do escritório.
            </span>
          </div>
          <Link
            href="/plano"
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-lg text-[11px] transition-colors shadow-xs"
          >
            Gerenciar Plano →
          </Link>
        </div>

        {/* Top Header com Barra de Busca e Perfil */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Global Search Input */}
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    router.push(`/documentos?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                placeholder="Busque por um documento, cliente ou CPF..."
                className="w-full bg-slate-50/80 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notificações */}
            <button className="relative p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5" />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            {/* Perfil do Advogado */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#071B3A] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                {user?.name?.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <span className="font-extrabold text-[#071B3A] text-xs block leading-none font-heading">{user?.name}</span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">{user?.officeName}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Container das Páginas */}
        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto flex-1 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
