'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FolderArchive, Plus, Send, CheckCircle2, FileText, X, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface KitItem {
  id: string;
  displayOrder: number;
  template: {
    id: string;
    title: string;
    documentType: string;
  };
}

interface LegalKit {
  id: string;
  name: string;
  category: string;
  description?: string;
  items: KitItem[];
}

interface Template {
  id: string;
  title: string;
}

export default function KitsPage() {
  const [kits, setKits] = useState<LegalKit[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Previdenciário',
    description: '',
    selectedTemplateIds: [] as string[],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchKitsAndTemplates();
  }, []);

  const fetchKitsAndTemplates = async () => {
    setLoading(true);
    try {
      const [resKits, resTpls] = await Promise.all([
        fetch('/api/kits'),
        fetch('/api/templates'),
      ]);

      const dataKits = await resKits.json();
      const dataTpls = await resTpls.json();

      if (dataKits.kits) setKits(dataKits.kits);
      if (dataTpls.templates) setTemplates(dataTpls.templates);
    } catch (err) {
      console.error('Erro ao carregar kits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTemplate = (templateId: string) => {
    if (formData.selectedTemplateIds.includes(templateId)) {
      setFormData({
        ...formData,
        selectedTemplateIds: formData.selectedTemplateIds.filter((id) => id !== templateId),
      });
    } else {
      setFormData({
        ...formData,
        selectedTemplateIds: [...formData.selectedTemplateIds, templateId],
      });
    }
  };

  const handleCreateKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selectedTemplateIds.length === 0) {
      setError('Selecione ao menos 1 modelo para compor o kit.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          description: formData.description,
          templateIds: formData.selectedTemplateIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar kit.');

      setShowModal(false);
      setFormData({
        name: '',
        category: 'Previdenciário',
        description: '',
        selectedTemplateIds: [],
      });
      fetchKitsAndTemplates();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3D] tracking-tight">Kits de Contratação Jurídica</h1>
          <p className="text-sm text-slate-500 mt-1">Combine múltiplos modelos (Contrato, Procuração e Declarações) para envio em 1 único link.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/kits/enviar"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-sm text-sm transition-all"
          >
            <Send className="w-4 h-4" />
            Enviar Kit em 1 Link
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B1D3D] text-white font-bold rounded-xl shadow-sm text-sm transition-all"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            Novo Kit Jurídico
          </button>
        </div>
      </div>

      {/* Lista de Kits */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
            Carregando kits jurídicos...
          </div>
        ) : kits.length === 0 ? (
          <div className="p-12 text-center">
            <FolderArchive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-bold text-base">Nenhum kit jurídico cadastrado.</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Cadastre um pacote de modelos por área jurídica (ex: Kit Previdenciário).</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-gold-500 text-[#0B1D3D] font-bold rounded-xl text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Primeiro Kit
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {kits.map((kit) => (
              <div key={kit.id} className="p-6 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-gold-100 text-[#0B1D3D] font-extrabold text-[11px] uppercase border border-gold-300">
                      {kit.category}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{kit.items.length} Documentos</span>
                  </div>

                  <h2 className="text-lg font-extrabold text-[#0B1D3D] mt-3">{kit.name}</h2>
                  {kit.description && <p className="text-xs text-slate-600 mt-1">{kit.description}</p>}

                  {/* Lista de Documentos Inclusos */}
                  <div className="mt-4 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Modelos do Pacote:</span>
                    <div className="space-y-1.5">
                      {kit.items.map((item) => (
                        <div key={item.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center gap-2 font-semibold text-slate-800">
                          <FileText className="w-4 h-4 text-gold-500 shrink-0" />
                          <span>{item.displayOrder}. {item.template.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <Link
                    href={`/kits/enviar?kitId=${kit.id}`}
                    className="px-4 py-2 bg-[#0B1D3D] hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
                  >
                    Disparar para Cliente em 1 Link
                    <ArrowRight className="w-4 h-4 text-gold-400" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Novo Kit */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative my-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-gold-500" />
                <h2 className="text-lg font-bold text-[#0B1D3D]">Novo Kit de Contratação Jurídica</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateKit} className="mt-4 space-y-4 text-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nome do Kit *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Kit Previdenciário Completo"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Área Jurídica *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-xs"
                  >
                    <option value="Previdenciário">Previdenciário</option>
                    <option value="Trabalhista">Trabalhista</option>
                    <option value="Família">Família</option>
                    <option value="Cível">Cível</option>
                    <option value="Empresarial">Empresarial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Inclui Contrato, Procuração e Declaração de Hipossuficiência..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none text-xs"
                />
              </div>

              {/* Seleção dos Modelos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Selecione os Modelos Jurídicos do Kit *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {templates.map((tpl) => {
                    const isChecked = formData.selectedTemplateIds.includes(tpl.id);
                    return (
                      <label key={tpl.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-gold-500 text-xs font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTemplate(tpl.id)}
                          className="w-4 h-4 text-gold-500 rounded border-slate-300"
                        />
                        <span>{tpl.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-slate-600 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-sm text-xs transition-all flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Salvar Kit Jurídico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
