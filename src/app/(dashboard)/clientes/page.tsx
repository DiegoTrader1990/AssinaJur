'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  UserPlus,
  Filter,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  FileText,
  Clock,
  History,
  AlertCircle,
  Loader2,
  CheckCircle,
  FolderOpen,
  Scale,
  Upload,
  Sparkles,
  Eye,
  Check,
  Zap,
  Camera,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Pencil,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { maskCpfCnpj, maskPhone } from '@/lib/formatters';
import { createPortal } from 'react-dom';
import NovoClienteModal, { type ClienteEditavel } from '@/components/clientes/NovoClienteModal';

interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  rg?: string;
  issuingOrgan?: string;
  birthDate?: string;
  nationality?: string;
  gender?: string;
  maritalStatus?: string;
  profession?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  legalRepresentative?: string;
  representativeCpf?: string;
  representativeRg?: string;
  representativePhone?: string;
  representativeRole?: string;
  financialResponsible?: string;
  notes?: string;
  legalArea?: string;
  processNumber?: string;
  lawyerInCharge?: { id: string; name: string; oabNumber?: string };
  processes?: Array<{ id: string; title: string; legalArea?: string; status: string; priority: string; dueDate?: string | null; protocolNumber?: string | null; lastActivityAt: string; _count: { documents: number; attachments: number } }>;
  documents?: Array<{ id: string; title: string; status: string; createdAt: string; completedAt?: string | null; process?: { id: string; title: string } | null }>;
  createdAt: string;
}

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [modalInitialName, setModalInitialName] = useState('');
  const [modalInitialArea, setModalInitialArea] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeTab, setActiveTab] = useState<'resumo' | 'pessoais' | 'documentos' | 'historico'>('resumo');

  useEffect(() => {
    // Deep-link vindo da Home (ex: CTA "Iniciar documentação" / "Completar cadastro") já filtra o cliente certo
    const deepLinkQuery = searchParams.get('q');
    if (deepLinkQuery) {
      setSearchQuery(deepLinkQuery);
      fetchClients(deepLinkQuery);
    } else {
      fetchClients();
    }

    if (searchParams.get('novo') === 'true') {
      setEditingClient(null);
      setModalInitialName(searchParams.get('nome') || '');
      setModalInitialArea(searchParams.get('area') || 'Previdenciário');
      setShowModal(true);
    }

    // Atualização em tempo real para exibir novos cadastros vindos do WhatsApp
    const interval = setInterval(fetchClients, 6000);
    const onFocus = () => fetchClients();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchClients = async (queryOverride?: string) => {
    try {
      const url = new URL('/api/clients', window.location.origin);
      url.searchParams.set('_t', Date.now().toString());
      const effectiveQuery = queryOverride !== undefined ? queryOverride : searchQuery;
      if (effectiveQuery) url.searchParams.set('q', effectiveQuery);
      if (areaFilter) url.searchParams.set('legalArea', areaFilter);

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.clients) {
        setClients(data.clients);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients();
  };

  const closeClientForm = () => {
    setShowModal(false);
    setEditingClient(null);
    setModalInitialName('');
    setModalInitialArea('');
  };

  const openCreateClient = () => {
    setEditingClient(null);
    setModalInitialName('');
    setModalInitialArea('');
    setFormError('');
    setShowModal(true);
  };

  const openEditClient = (client: Client) => {
    setEditingClient(client);
    setFormError('');
    setShowModal(true);
  };

  const openClientDossier = async (client: Client) => {
    setSelectedClient(client);
    setActiveTab('resumo');
    try {
      const response = await fetch(`/api/clients/${client.id}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.client) setSelectedClient(data.client);
    } catch {
      // A ficha básica continua disponível mesmo que os dados complementares falhem.
    }
  };

  // Chamado pelo NovoClienteModal apos salvar com sucesso (criar ou editar).
  const handleClientSaved = async (savedClient: Client) => {
    if (editingClient && savedClient) {
      setSelectedClient(savedClient);
    }
    await fetchClients();
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete || deleteConfirmation.trim().toUpperCase() !== 'EXCLUIR') return;

    setDeleting(true);
    setFormError('');
    try {
      const res = await fetch(`/api/clients/${clientToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir cliente.');

      setClients((current) => current.filter((client) => client.id !== clientToDelete.id));
      if (selectedClient?.id === clientToDelete.id) setSelectedClient(null);
      setClientToDelete(null);
      setDeleteConfirmation('');
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">Cadastro de Clientes</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Gerencie os dados e documentos centralizados dos clientes do seu escritório.</p>
        </div>

        <button
          onClick={openCreateClient}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-xs transition-all font-heading"
        >
          <UserPlus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Nome, CPF/CNPJ ou Telefone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
          />
        </form>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600 font-heading"
            >
              <option value="">Todas as Áreas</option>
              <option value="Previdenciário">Previdenciário</option>
              <option value="Trabalhista">Trabalhista</option>
              <option value="Família">Família</option>
              <option value="Cível">Cível</option>
              <option value="Empresarial">Empresarial</option>
            </select>
            <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={() => void fetchClients()}
            className="px-4 py-2 bg-[#071B3A] text-white rounded-xl text-xs font-bold font-heading hover:bg-[#0B1D3D] transition-colors"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Carregando lista de clientes...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-heading font-extrabold text-slate-800 text-base">Nenhum cliente cadastrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Cadastre seus clientes para reutilizar os dados em contratos, procurações e pacotes de documentos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-heading font-extrabold text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Cliente</th>
                  <th className="px-6 py-3.5">CPF / CNPJ</th>
                  <th className="px-6 py-3.5">Contato</th>
                  <th className="px-6 py-3.5">Área Jurídica</th>
                  <th className="px-6 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 font-heading">{client.name}</div>
                      {client.profession && <div className="text-xs text-slate-400 font-medium">{client.profession}</div>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">
                      {maskCpfCnpj(client.cpfCnpj)}
                    </td>
                    <td className="px-6 py-4 text-xs space-y-0.5 font-medium">
                      <div className="font-bold text-slate-800">{maskPhone(client.phone)}</div>
                      {client.email && <div className="text-slate-400">{client.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100">
                        {client.legalArea || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openClientDossier(client)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#071B3A] hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-all font-heading"
                        >
                          Abrir Ficha
                        </button>
                        <button
                          onClick={() => openEditClient(client)}
                          title="Editar cliente"
                          aria-label={`Editar ${client.name}`}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setClientToDelete(client);
                            setDeleteConfirmation('');
                            setFormError('');
                          }}
                          title="Excluir cliente"
                          aria-label={`Excluir ${client.name}`}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NovoClienteModal
        open={showModal}
        editingClient={editingClient as unknown as ClienteEditavel | null}
        initialName={modalInitialName}
        initialArea={modalInitialArea}
        onClose={closeClientForm}
        onSaved={handleClientSaved}
      />

      {/* Modal: Ficha Detalhada do Cliente */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 font-heading font-extrabold flex items-center justify-center text-base">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">{selectedClient.name}</h2>
                  <p className="text-xs text-slate-400 font-medium">CPF/CNPJ: {maskCpfCnpj(selectedClient.cpfCnpj)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditClient(selectedClient)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold font-heading"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => {
                    setClientToDelete(selectedClient);
                    setDeleteConfirmation('');
                    setFormError('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold font-heading"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
                <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navegação de Abas da Ficha */}
            <div className="flex border-b border-slate-200 mt-4 text-xs font-heading font-bold">
              <button
                onClick={() => setActiveTab('resumo')}
                className={`py-2.5 px-4 border-b-2 transition-all ${
                  activeTab === 'resumo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Resumo do Cliente
              </button>
              <button
                onClick={() => setActiveTab('pessoais')}
                className={`py-2.5 px-4 border-b-2 transition-all ${
                  activeTab === 'pessoais' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Dados Pessoais
              </button>
              <button
                onClick={() => setActiveTab('documentos')}
                className={`py-2.5 px-4 border-b-2 transition-all ${
                  activeTab === 'documentos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Processos e documentos
              </button>
            </div>

            {/* Conteúdo da Aba */}
            <div className="py-6 space-y-4 text-xs">
              {activeTab === 'resumo' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading">Contato Principal</div>
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Phone className="w-4 h-4 text-blue-600" /> {maskPhone(selectedClient.phone)}
                    </div>
                    {selectedClient.email && (
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Mail className="w-4 h-4 text-slate-400" /> {selectedClient.email}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading">Classificação Jurídica</div>
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Scale className="w-4 h-4 text-blue-600" /> Área: {selectedClient.legalArea || 'Geral'}
                    </div>
                    {selectedClient.profession && (
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Briefcase className="w-4 h-4 text-slate-400" /> Profissão: {selectedClient.profession}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'pessoais' && (
                <div className="grid md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">RG</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedClient.rg || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Órgão Expedidor</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedClient.issuingOrgan || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Estado Civil</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedClient.maritalStatus || 'Não informado'}</p>
                  </div>
                </div>
              )}

              {activeTab === 'documentos' && (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">Visão 360º</p>
                      <p className="mt-1 text-xs text-slate-600">Processos, arquivos e formalizações vinculados a este cliente.</p>
                    </div>
                    <a href={`/processos?clienteId=${selectedClient.id}`} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#071B3A] px-3 py-2.5 text-xs font-bold text-white"><FolderOpen className="h-3.5 w-3.5" /> Novo processo</a>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Processos</p><span className="text-[11px] font-bold text-slate-500">{selectedClient.processes?.length || 0} em acompanhamento</span></div>
                    <div className="space-y-2">
                      {selectedClient.processes?.map((process) => <a key={process.id} href={`/processos?clienteId=${selectedClient.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:bg-slate-50"><span className={`h-2.5 w-2.5 rounded-full ${process.status === 'CONCLUIDO' ? 'bg-emerald-500' : process.priority === 'ALTA' ? 'bg-rose-500' : 'bg-blue-500'}`} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-[#071B3A]">{process.title}</span><span className="mt-0.5 block text-[11px] text-slate-500">{process.legalArea || 'Geral'} · {process._count.documents} documentos · {process._count.attachments} arquivos</span></span><span className="text-[10px] font-bold text-slate-400">{process.dueDate ? new Date(process.dueDate).toLocaleDateString('pt-BR') : process.status.replaceAll('_', ' ')}</span></a>)}
                      {!selectedClient.processes?.length && <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-500">Nenhum processo criado para este cliente.</div>}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Documentos e assinaturas</p><a href="/documentos" className="text-[11px] font-bold text-blue-700">Abrir central</a></div>
                    <div className="space-y-2">
                      {selectedClient.documents?.map((document) => <a key={document.id} href="/documentos" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:bg-slate-50"><FileText className={`h-4 w-4 shrink-0 ${document.status === 'CONCLUIDO' ? 'text-emerald-600' : 'text-amber-500'}`} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-[#071B3A]">{document.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{document.process?.title || 'Sem processo vinculado'}</span></span><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${document.status === 'CONCLUIDO' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{document.status === 'CONCLUIDO' ? 'ASSINADO' : document.status.replaceAll('_', ' ')}</span></a>)}
                      {!selectedClient.documents?.length && <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-500">Nenhum documento vinculado a este cliente.</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs font-heading"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação segura de exclusão */}
      {clientToDelete && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] bg-[#071B3A]/55 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-rose-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">Excluir cliente?</h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              O cadastro de <strong>{clientToDelete.name}</strong> será removido. Documentos já emitidos e suas evidências permanecem preservados no sistema.
            </p>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-5 mb-1.5">
              Digite EXCLUIR para confirmar
            </label>
            <input
              autoFocus
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              placeholder="EXCLUIR"
            />
            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setClientToDelete(null);
                  setDeleteConfirmation('');
                  setFormError('');
                }}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold font-heading"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                disabled={deleting || deleteConfirmation.trim().toUpperCase() !== 'EXCLUIR'}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold font-heading transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
