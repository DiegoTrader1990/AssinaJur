'use client';

import { useState, useEffect } from 'react';
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
  Scale
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  rg?: string;
  issuingOrgan?: string;
  birthDate?: string;
  nationality?: string;
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
  financialResponsible?: string;
  notes?: string;
  legalArea?: string;
  processNumber?: string;
  lawyerInCharge?: { id: string; name: string; oabNumber?: string };
  createdAt: string;
}

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  // Estados dos Modais e Ficha do Cliente
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'resumo' | 'pessoais' | 'documentos' | 'historico'>('resumo');

  // Formulário do Cliente
  const [formData, setFormData] = useState({
    name: '',
    cpfCnpj: '',
    rg: '',
    issuingOrgan: '',
    birthDate: '',
    nationality: 'Brasileira',
    maritalStatus: '',
    profession: '',
    phone: '',
    whatsapp: '',
    email: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    legalRepresentative: '',
    financialResponsible: '',
    notes: '',
    legalArea: 'Previdenciário',
    processNumber: '',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchClients();
    if (searchParams.get('novo') === 'true') {
      setShowModal(true);
    }
  }, [searchParams]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/clients', window.location.origin);
      if (searchQuery) url.searchParams.set('q', searchQuery);
      if (areaFilter) url.searchParams.set('legalArea', areaFilter);

      const res = await fetch(url.toString());
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar cliente.');
      }

      setShowModal(false);
      setFormData({
        name: '',
        cpfCnpj: '',
        rg: '',
        issuingOrgan: '',
        birthDate: '',
        nationality: 'Brasileira',
        maritalStatus: '',
        profession: '',
        phone: '',
        whatsapp: '',
        email: '',
        cep: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        legalRepresentative: '',
        financialResponsible: '',
        notes: '',
        legalArea: 'Previdenciário',
        processNumber: '',
      });
      fetchClients();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
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
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-xs transition-all font-heading"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          Novo Cliente
        </button>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors font-medium"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold font-heading">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Área:</span>
          </div>
          <select
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value);
              fetchClients();
            }}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600 font-heading"
          >
            <option value="">Todas as Áreas</option>
            <option value="Previdenciário">Previdenciário</option>
            <option value="Trabalhista">Trabalhista</option>
            <option value="Família">Família</option>
            <option value="Cível">Cível</option>
            <option value="Empresarial">Empresarial</option>
          </select>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Carregando lista de clientes...
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-heading text-slate-800 font-extrabold text-base">Nenhum cliente encontrado</p>
            <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">Cadastre os clientes para iniciar os kits de contratação eletrônica.</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 font-heading shadow-md"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              Cadastrar Cliente Agora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-heading">
                <tr>
                  <th className="px-6 py-3.5">Nome do Cliente</th>
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
                      {client.cpfCnpj}
                    </td>
                    <td className="px-6 py-4 text-xs space-y-0.5 font-medium">
                      <div className="font-bold text-slate-800">{client.phone}</div>
                      {client.email && <div className="text-slate-400">{client.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100">
                        {client.legalArea || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#071B3A] hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-all font-heading"
                      >
                        Abrir Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">Cadastrar Novo Cliente</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClient} className="mt-6 space-y-4 text-xs">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="João da Silva"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">
                    CPF ou CNPJ * (Único por Escritório)
                  </label>
                  <input
                    type="text"
                    name="cpfCnpj"
                    required
                    value={formData.cpfCnpj}
                    onChange={handleFormChange}
                    placeholder="000.000.000-00"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">RG</label>
                  <input
                    type="text"
                    name="rg"
                    value={formData.rg}
                    onChange={handleFormChange}
                    placeholder="MG-12.345.678"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Órgão Expedidor</label>
                  <input
                    type="text"
                    name="issuingOrgan"
                    value={formData.issuingOrgan}
                    onChange={handleFormChange}
                    placeholder="SSP/SP"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Data Nascimento</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Estado Civil</label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:border-blue-600 focus:outline-none font-heading"
                  >
                    <option value="">Selecione...</option>
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                    <option value="União Estável">União Estável</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Profissão</label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleFormChange}
                    placeholder="Comerciante"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Área Jurídica</label>
                  <select
                    name="legalArea"
                    value={formData.legalArea}
                    onChange={handleFormChange}
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:border-blue-600 focus:outline-none font-heading"
                  >
                    <option value="Previdenciário">Previdenciário</option>
                    <option value="Trabalhista">Trabalhista</option>
                    <option value="Família">Família</option>
                    <option value="Cível">Cível</option>
                    <option value="Empresarial">Empresarial</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="(11) 99999-9999"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder="cliente@email.com"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Endereço Residencial</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleFormChange}
                    placeholder="Rua das Flores, nº 100"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Cidade / UF</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    placeholder="São Paulo / SP"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Observações Internas</label>
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Informações adicionais do cliente para a equipe do escritório..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-bold text-xs font-heading"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center gap-2 font-heading"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Salvar Cadastro do Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ficha Detalhada do Cliente */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-md font-heading">
                  {selectedClient.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">{selectedClient.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">CPF/CNPJ: {selectedClient.cpfCnpj}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Abas Internas da Ficha do Cliente */}
            <div className="flex border-b border-slate-200 mt-4 font-heading">
              <button
                onClick={() => setActiveTab('resumo')}
                className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors ${
                  activeTab === 'resumo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Resumo
              </button>
              <button
                onClick={() => setActiveTab('pessoais')}
                className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors ${
                  activeTab === 'pessoais' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Dados Pessoais
              </button>
              <button
                onClick={() => setActiveTab('documentos')}
                className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors ${
                  activeTab === 'documentos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Kits & Assinaturas (0)
              </button>
              <button
                onClick={() => setActiveTab('historico')}
                className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition-colors ${
                  activeTab === 'historico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Histórico
              </button>
            </div>

            <div className="py-6 text-xs">
              {activeTab === 'resumo' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
                    <h3 className="font-heading text-xs font-extrabold text-[#071B3A] uppercase tracking-wider">Contato Principal</h3>
                    <div className="text-xs space-y-2 text-slate-700 font-medium">
                      <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-blue-600" /> {selectedClient.phone}</p>
                      <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-600" /> {selectedClient.email || 'Não informado'}</p>
                      <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /> {selectedClient.address || 'Sem endereço'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
                    <h3 className="font-heading text-xs font-extrabold text-[#071B3A] uppercase tracking-wider">Dados Jurídicos</h3>
                    <div className="text-xs space-y-2 text-slate-700 font-medium">
                      <p><span className="font-bold text-slate-500">Área:</span> {selectedClient.legalArea || 'Geral'}</p>
                      <p><span className="font-bold text-slate-500">Profissão:</span> {selectedClient.profession || 'Não informada'}</p>
                      <p><span className="font-bold text-slate-500">Estado Civil:</span> {selectedClient.maritalStatus || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pessoais' && (
                <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-700 font-medium bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
                  <p><strong>RG:</strong> {selectedClient.rg || '—'}</p>
                  <p><strong>Órgão Expedidor:</strong> {selectedClient.issuingOrgan || '—'}</p>
                  <p><strong>Nacionalidade:</strong> {selectedClient.nationality || 'Brasileira'}</p>
                  <p><strong>Data Nasc.:</strong> {selectedClient.birthDate || '—'}</p>
                  <p className="col-span-2"><strong>Observações:</strong> {selectedClient.notes || 'Sem observações'}</p>
                </div>
              )}

              {activeTab === 'documentos' && (
                <div className="text-center py-8 text-slate-500 text-xs font-medium">
                  <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  Nenhum kit jurídico enviado para este cliente ainda.
                </div>
              )}

              {activeTab === 'historico' && (
                <div className="space-y-3 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800 font-heading">Cliente cadastrado no sistema</p>
                      <p className="text-[10px] text-slate-400">{new Date(selectedClient.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-5 py-2.5 bg-[#071B3A] text-white font-bold rounded-xl text-xs hover:bg-[#0B1D3D] transition-colors font-heading shadow-xs"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
