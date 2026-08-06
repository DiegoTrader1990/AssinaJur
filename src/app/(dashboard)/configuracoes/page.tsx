'use client';

import { useState, useEffect } from 'react';
import { Settings, Building2, Palette, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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
    primaryColor: '#0B1D3D',
    secondaryColor: '#D4AF37',
    welcomeMessage: '',
    defaultFooter: '',
    clientEmailMessage: '',
    address: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
            primaryColor: data.office.primaryColor || '#0B1D3D',
            secondaryColor: data.office.secondaryColor || '#D4AF37',
            welcomeMessage: data.office.welcomeMessage || '',
            defaultFooter: data.office.defaultFooter || '',
            clientEmailMessage: data.office.clientEmailMessage || '',
            address: data.office.address || '',
          });
        }
      })
      .catch((err) => console.error('Erro ao carregar dados do escritório:', err))
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
        Carregando configurações institucionais...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D3D] tracking-tight">Cadastro e Configurações do Escritório</h1>
        <p className="text-sm text-slate-500 mt-1">Defina a identidade visual, rodapés institucionais e mensagens enviadas aos clientes.</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Configurações salvas com sucesso!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seção 1: Dados Cadastrais */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#0B1D3D] font-bold border-b border-slate-100 pb-3">
            <Building2 className="w-5 h-5 text-gold-500" />
            <span>Dados Institucionais</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Razão Social / Nome do Escritório *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">CPF ou CNPJ *</label>
              <input
                type="text"
                required
                value={formData.cpfCnpj}
                onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Registro OAB da Sociedade</label>
              <input
                type="text"
                value={formData.oabNumber}
                onChange={(e) => setFormData({ ...formData, oabNumber: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://escritorio.adv.br"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Telefone Comercial *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">WhatsApp</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">E-mail Institucional *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Seção 2: Identidade Visual */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#0B1D3D] font-bold border-b border-slate-100 pb-3">
            <Palette className="w-5 h-5 text-gold-500" />
            <span>Identidade Visual na Página do Cliente</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cor Primária</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-xs font-semibold text-slate-700">{formData.primaryColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cor Secundária / Destaque</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-xs font-semibold text-slate-700">{formData.secondaryColor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 3: Mensagens e Rodapé */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#0B1D3D] font-bold border-b border-slate-100 pb-3">
            <FileText className="w-5 h-5 text-gold-500" />
            <span>Mensagens Padrão e Assinatura Institucional</span>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mensagem de Apresentação ao Cliente</label>
              <textarea
                rows={2}
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                placeholder="Prezado cliente, por favor revise e assine os documentos abaixo para darmos início ao seu processo..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Rodapé Padrão dos Documentos</label>
              <textarea
                rows={2}
                value={formData.defaultFooter}
                onChange={(e) => setFormData({ ...formData, defaultFooter: e.target.value })}
                placeholder="Rodrigues & Soares Advocacia • OAB/SP 123.456 • Contato: (11) 99999-9999"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Salvar Configurações do Escritório
          </button>
        </div>
      </form>
    </div>
  );
}
