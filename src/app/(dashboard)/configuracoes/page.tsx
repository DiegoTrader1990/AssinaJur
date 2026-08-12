'use client';

import { useState, useEffect } from 'react';
import { Settings, Building2, Palette, FileText, CheckCircle, AlertCircle, Loader2, Upload, UserCheck, UserPlus, Plus, Trash2, Pencil, X } from 'lucide-react';

interface LawyerMember {
  id: string;
  name: string;
  email: string;
  role: string;
  oabNumber?: string;
  phone?: string;
  active: boolean;
}

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
    cpfCnpj: '',
    oabNumber: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    primaryColor: '#071B3A',
    secondaryColor: '#155EEF',
    welcomeMessage: '',
    defaultFooter: '',
    clientEmailMessage: '',
    address: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [letterhead, setLetterhead] = useState<{id: string; originalName: string; sizeBytes: number} | null>(null);
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);

  const [lawyers, setLawyers] = useState<LawyerMember[]>([]);
  const [showAddLawyerModal, setShowAddLawyerModal] = useState(false);
  const [newLawyer, setNewLawyer] = useState({
    name: '',
    oabNumber: '',
    email: '',
    phone: '',
  });
  const [addingLawyer, setAddingLawyer] = useState(false);
  const [removingLawyerId, setRemovingLawyerId] = useState<string | null>(null);
  const [editingLawyer, setEditingLawyer] = useState<LawyerMember | null>(null);
  const [savingLawyer, setSavingLawyer] = useState(false);

  useEffect(() => {
    fetch('/api/office')
      .then((res) => res.json())
      .then((data) => {
        if (data.office) {
          setFormData({
            name: data.office.name || '',
            tradeName: data.office.tradeName || '',
            cpfCnpj: data.office.cpfCnpj || '',
            oabNumber: data.office.oabNumber || '',
            phone: data.office.phone || '',
            whatsapp: data.office.whatsapp || '',
            email: data.office.email || '',
            website: data.office.website || '',
            primaryColor: data.office.primaryColor || '#071B3A',
            secondaryColor: data.office.secondaryColor || '#155EEF',
            welcomeMessage: data.office.welcomeMessage || '',
            defaultFooter: data.office.defaultFooter || '',
            clientEmailMessage: data.office.clientEmailMessage || '',
            address: data.office.address || '',
          });
        }
      })
      .catch((err) => console.error('Erro ao carregar dados do escritório:', err))
      .finally(() => setLoading(false));

    fetch('/api/office/letterhead')
      .then((res) => res.json())
      .then((data) => {
        if (data.letterhead || data.file) {
          setLetterhead(data.letterhead || data.file);
        }
      })
      .catch((err) => console.error('Erro ao carregar papel timbrado:', err));

    fetchLawyers();
  }, []);

  const fetchLawyers = () => {
    fetch('/api/office/team')
      .then((res) => res.json())
      .then((data) => {
        if (data.members) {
          setLawyers(data.members);
        }
      })
      .catch((err) => console.error('Erro ao carregar advogados:', err));
  };

  const handleAddLawyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLawyer.name || !newLawyer.oabNumber) {
      alert('Por favor, preencha o Nome e o Número da OAB do Advogado(a).');
      return;
    }
    setAddingLawyer(true);
    try {
      const res = await fetch('/api/office/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLawyer.name,
          oabNumber: newLawyer.oabNumber,
          email: newLawyer.email || `${newLawyer.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@escritorio.com`,
          password: 'AdvogadoPassword123!',
          role: 'LAWYER',
          phone: newLawyer.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao adicionar advogado');
      setShowAddLawyerModal(false);
      setNewLawyer({ name: '', oabNumber: '', email: '', phone: '' });
      fetchLawyers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingLawyer(false);
    }
  };

  const handleRemoveLawyer = async (lawyer: LawyerMember) => {
    const confirmed = window.confirm(
      `Excluir o advogado ${lawyer.name}? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setRemovingLawyerId(lawyer.id);
    try {
      const res = await fetch(`/api/office/team?id=${encodeURIComponent(lawyer.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível excluir o advogado.');
      setLawyers((current) => current.filter((item) => item.id !== lawyer.id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRemovingLawyerId(null);
    }
  };

  const handleEditLawyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLawyer) return;
    setSavingLawyer(true);
    try {
      const res = await fetch('/api/office/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLawyer),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível atualizar o advogado.');
      setLawyers((current) => current.map((item) => item.id === data.member.id ? data.member : item));
      setEditingLawyer(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingLawyer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/office', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar configurações.');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLetterhead = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo PDF.');
      return;
    }

    setUploadingLetterhead(true);
    const formDataObj = new FormData();
    formDataObj.append('file', file);

    try {
      const res = await fetch('/api/office/letterhead', {
        method: 'POST',
        body: formDataObj,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar papel timbrado');
      if (data.letterhead || data.file) {
        setLetterhead(data.letterhead || data.file);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingLetterhead(false);
    }
  };

  const handleRemoveLetterhead = async () => {
    if (!confirm('Deseja realmente remover o papel timbrado?')) return;
    try {
      const res = await fetch('/api/office/letterhead', { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover papel timbrado');
      setLetterhead(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2 font-sans">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        Carregando configurações institucionais...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">Cadastro e Configurações do Escritório</h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">Defina a identidade visual, rodapés institucionais e mensagens enviadas aos clientes.</p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Configurações salvas com sucesso!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3 font-medium">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção 1: Dados Cadastrais */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#071B3A] font-extrabold border-b border-slate-100 pb-3 font-heading">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Dados Institucionais</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-xs font-medium">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Razão Social / Nome do Escritório *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Nome Fantasia</label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2 text-xs font-medium">
            <label className="block text-xs font-extrabold text-[#071B3A] uppercase tracking-wider font-heading">
              Tipo de Inscrição e Registro de Atuação
            </label>
            <div className="flex flex-wrap items-center gap-4 text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="radio"
                  name="docType"
                  checked={!formData.cpfCnpj || formData.cpfCnpj.replace(/\D/g, '').length <= 11}
                  onChange={() => {}}
                  className="accent-blue-600"
                />
                Pessoa Física / Advocacia em Conjunto (CPF / OAB dos Patronos)
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="radio"
                  name="docType"
                  checked={formData.cpfCnpj.replace(/\D/g, '').length > 11}
                  onChange={() => {}}
                  className="accent-blue-600"
                />
                Pessoa Jurídica (CNPJ da Sociedade de Advogados)
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-xs font-medium">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">CPF do Advogado ou CNPJ da Sociedade</label>
              <input
                type="text"
                value={formData.cpfCnpj}
                onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                placeholder="Ex: 034.230.445-35 ou 12.345.678/0001-90"
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Registro OAB da Sociedade</label>
              <input
                type="text"
                value={formData.oabNumber}
                onChange={(e) => setFormData({ ...formData, oabNumber: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://escritorio.adv.br"
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-xs font-medium">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Telefone Comercial *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">WhatsApp</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">E-mail Institucional *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">
              Endereço Completo do Escritório (Sede / Matriz - Usado em Contratos e Procurações) *
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ex: Rua José Rodrigues, nº 219, Centro, Porto Seguro/BA, CEP 45810-000"
              className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Seção 1B: Advogados Integrantes do Escritório */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#071B3A] font-extrabold font-heading">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span>Advogados Patronos Integrantes (Usados nas Qualificações Automáticas)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddLawyerModal(true)}
              className="px-3.5 py-1.5 bg-[#071B3A] hover:bg-blue-900 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-gold-400" /> Adicionar Advogado
            </button>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Cadastre os advogados integrantes da banca. As qualificações conjuntas <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono">{"{{patronos_qualificacao_conjunta}}"}</code> nos contratos e procurações incluirão automaticamente estes profissionais.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            {lawyers.map((lawyer) => (
              <div key={lawyer.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-extrabold text-[#071B3A] text-xs flex items-center gap-1.5">
                    <span>{lawyer.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[10px]">Ativo</span>
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    {lawyer.oabNumber ? `Inscrição: ${lawyer.oabNumber}` : 'OAB não informada'}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingLawyer({ ...lawyer })}
                    aria-label={`Editar ${lawyer.name}`}
                    title="Editar advogado"
                    className="p-2 rounded-xl text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveLawyer(lawyer)}
                    disabled={removingLawyerId === lawyer.id}
                    aria-label={`Excluir ${lawyer.name}`}
                    title="Excluir advogado"
                    className="p-2 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {removingLawyerId === lawyer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}

            {lawyers.length === 0 && (
              <div className="col-span-2 p-4 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Nenhum advogado integrante cadastrado ainda. Clique em "+ Adicionar Advogado" para cadastrar.
              </div>
            )}
          </div>
        </div>

        {/* Seção 2: Identidade Visual */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#071B3A] font-extrabold border-b border-slate-100 pb-3 font-heading">
            <Palette className="w-5 h-5 text-blue-600" />
            <span>Identidade Visual na Página do Cliente</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-xs font-medium">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Cor Primária</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-slate-700">{formData.primaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Cor Secundária / Destaque</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-slate-700">{formData.secondaryColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Papel Timbrado Oficial */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#071B3A] font-extrabold border-b border-slate-100 pb-3 font-heading">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Papel Timbrado Oficial do Escritório</span>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Envie um PDF com o papel timbrado oficial do escritório. Ele será aplicado automaticamente como plano de fundo em todos os contratos, procurações e declarações gerados pelo sistema.
          </p>

          {!letterhead ? (
            <div className="border-2 border-dashed rounded-2xl p-6 text-center border-slate-300 hover:border-blue-600 transition-colors relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleUploadLetterhead}
                disabled={uploadingLetterhead}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex flex-col items-center gap-2">
                {uploadingLetterhead ? (
                  <>
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <span className="text-xs font-bold text-slate-700 font-heading">Enviando papel timbrado...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 font-heading">Clique ou arraste o PDF aqui</span>
                    <span className="text-[10px] text-slate-500">Apenas arquivos PDF são aceitos</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 font-heading">{letterhead.originalName}</p>
                  <p className="text-[10px] text-slate-500">{(letterhead.sizeBytes / 1024).toFixed(1)} KB</p>
                </div>
                <div className="ml-4 flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold">
                  <CheckCircle className="w-3 h-3" />
                  Ativo
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleUploadLetterhead}
                    disabled={uploadingLetterhead}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <button type="button" disabled={uploadingLetterhead} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-colors pointer-events-none">
                    Substituir
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLetterhead}
                  disabled={uploadingLetterhead}
                  className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors"
                >
                  Remover
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Seção 3: Mensagens e Rodapé */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#071B3A] font-extrabold border-b border-slate-100 pb-3 font-heading">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Mensagens Padrão e Assinatura Institucional</span>
          </div>

          <div className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Mensagem de Apresentação ao Cliente</label>
              <textarea
                rows={2}
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                placeholder="Prezado cliente, por favor revise e assine os documentos abaixo para darmos início ao seu processo..."
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Rodapé Padrão dos Documentos</label>
              <textarea
                rows={2}
                value={formData.defaultFooter}
                onChange={(e) => setFormData({ ...formData, defaultFooter: e.target.value })}
                placeholder="Rodrigues & Soares Advocacia • OAB/SP 123.456 • Contato: (11) 99999-9999"
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-xs font-heading"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Salvar Configurações do Escritório
          </button>
        </div>
      </form>

      {/* Modal de Cadastro de Advogado */}
      {showAddLawyerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 font-sans animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#071B3A] font-extrabold font-heading">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Adicionar Advogado Patrono</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLawyerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLawyer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Nome Completo do Advogado(a) *</label>
                <input
                  type="text"
                  required
                  value={newLawyer.name}
                  onChange={(e) => setNewLawyer({ ...newLawyer, name: e.target.value })}
                  placeholder="Ex: Dr. Diego dos Santos Rodrigues ou Dra. Dominick Quinto Soares"
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Inscrição OAB *</label>
                <input
                  type="text"
                  required
                  value={newLawyer.oabNumber}
                  onChange={(e) => setNewLawyer({ ...newLawyer, oabNumber: e.target.value })}
                  placeholder="Ex: OAB/BA 51.881 ou OAB/BA 62.443"
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">E-mail Profissional (Opcional)</label>
                <input
                  type="email"
                  value={newLawyer.email}
                  onChange={(e) => setNewLawyer({ ...newLawyer, email: e.target.value })}
                  placeholder="advogado@escritorio.adv.br"
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Telefone / WhatsApp (Opcional)</label>
                <input
                  type="text"
                  value={newLawyer.phone}
                  onChange={(e) => setNewLawyer({ ...newLawyer, phone: e.target.value })}
                  placeholder="(73) 98825-0201"
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLawyerModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addingLawyer}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  {addingLawyer ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Salvar Advogado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingLawyer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#071B3A] font-extrabold font-heading">
                <Pencil className="w-5 h-5 text-blue-600" /> <span>Editar Advogado Patrono</span>
              </div>
              <button type="button" onClick={() => setEditingLawyer(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditLawyer} className="space-y-3 text-xs">
              <div><label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Nome Completo *</label><input required value={editingLawyer.name} onChange={(e) => setEditingLawyer({ ...editingLawyer, name: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none" /></div>
              <div><label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Inscrição OAB</label><input value={editingLawyer.oabNumber || ''} onChange={(e) => setEditingLawyer({ ...editingLawyer, oabNumber: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none" /></div>
              <div><label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">E-mail Profissional *</label><input type="email" required value={editingLawyer.email} onChange={(e) => setEditingLawyer({ ...editingLawyer, email: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none" /></div>
              <div><label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Telefone / WhatsApp</label><input value={editingLawyer.phone || ''} onChange={(e) => setEditingLawyer({ ...editingLawyer, phone: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none" /></div>
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEditingLawyer(null)} className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Cancelar</button><button type="submit" disabled={savingLawyer} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2">{savingLawyer ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Salvar alterações</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
