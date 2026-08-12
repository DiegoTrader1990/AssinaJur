'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderArchive,
  FileText,
  Plus,
  Send,
  CheckCircle2,
  Edit3,
  Copy,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  ArrowRight,
  Search,
  Sparkles,
  Layers,
  Eye
} from 'lucide-react';
import dynamic from 'next/dynamic';

const DocumentRichEditor = dynamic(
  () => import('@/components/DocumentRichEditor').then((mod) => mod.DocumentRichEditor),
  { ssr: false }
);

const SAMPLE_VALUES: Record<string, string> = { cliente_nome: 'MARIA APARECIDA DA SILVA', cliente_cpf: '123.456.789-09', cliente_rg: '12.345.678-9', cliente_nacionalidade: 'brasileira', cliente_estado_civil: 'solteira', cliente_profissao: 'aposentada', cliente_endereco: 'Rua das Acácias, nº 120, Centro, Porto Seguro/BA, CEP 45810-000', advogado_nome: 'DR. DIEGO DOS SANTOS RODRIGUES', advogado_oab: 'OAB/BA nº 51.881', escritorio_nome: 'Rodrigues & Soares - Advogados', valor_honorarios: 'R$ 3.000,00', percentual_exito: '30%', cidade: 'Porto Seguro', data_atual: '12 de agosto de 2026' };
const showSamples = (html: string) => Object.entries(SAMPLE_VALUES).reduce((text, [key, value]) => text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), value), html);
const restoreVariables = (html: string) => Object.entries(SAMPLE_VALUES).reduce((text, [key, value]) => text.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `{{${key}}}`), html);

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
  category: string;
  documentType: string;
  contentHtml: string;
  description?: string;
  version: number;
}

export default function KitsAndTemplatesPage() {
  const [activeTab, setActiveTab] = useState<'kits' | 'templates'>('kits');

  // State para Kits
  const [kits, setKits] = useState<LegalKit[]>([]);
  const [showKitModal, setShowKitModal] = useState(false);
  const [editingKit, setEditingKit] = useState<LegalKit | null>(null);
  const [kitFormData, setKitFormData] = useState({
    name: '',
    category: 'Previdenciário',
    description: '',
    selectedTemplateIds: [] as string[],
  });

  // State para Templates (Modelos)
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    title: '',
    category: 'Previdenciário',
    documentType: 'CONTRATO',
    contentHtml: '',
    description: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const openPdfPreview = async () => {
    setPreviewing(true);
    try {
      const response = await fetch('/api/templates/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: templateFormData.title, documentType: templateFormData.documentType, contentHtml: templateFormData.contentHtml }) });
      if (!response.ok) throw new Error();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(await response.blob()));
    } catch { setError('Não foi possível gerar a prévia em PDF.'); } finally { setPreviewing(false); }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const urlTpls = new URL('/api/templates', window.location.origin);
      if (categoryFilter) urlTpls.searchParams.set('category', categoryFilter);

      const [resKits, resTpls] = await Promise.all([
        fetch('/api/kits'),
        fetch(urlTpls.toString()),
      ]);

      const dataKits = await resKits.json();
      const dataTpls = await resTpls.json();

      if (dataKits.kits) setKits(dataKits.kits);
      if (dataTpls.templates) setTemplates(dataTpls.templates);
    } catch (err) {
      console.error('Erro ao carregar kits e modelos:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS PARA KITS ---
  const handleOpenNewKitModal = () => {
    setEditingKit(null);
    setKitFormData({
      name: '',
      category: 'Previdenciário',
      description: '',
      selectedTemplateIds: [],
    });
    setShowKitModal(true);
  };

  const handleOpenEditKitModal = (kit: LegalKit) => {
    setEditingKit(kit);
    setKitFormData({
      name: kit.name,
      category: kit.category,
      description: kit.description || '',
      selectedTemplateIds: kit.items.map((i) => i.template.id),
    });
    setShowKitModal(true);
  };

  const handleToggleTemplateInKit = (templateId: string) => {
    if (kitFormData.selectedTemplateIds.includes(templateId)) {
      setKitFormData({
        ...kitFormData,
        selectedTemplateIds: kitFormData.selectedTemplateIds.filter((id) => id !== templateId),
      });
    } else {
      setKitFormData({
        ...kitFormData,
        selectedTemplateIds: [...kitFormData.selectedTemplateIds, templateId],
      });
    }
  };

  const handleSaveKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kitFormData.selectedTemplateIds.length === 0) {
      setError('Selecione ao menos 1 modelo para compor o kit.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const isEditing = !!editingKit;
      const url = isEditing ? `/api/kits/${editingKit.id}` : '/api/kits';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: kitFormData.name,
          category: kitFormData.category,
          description: kitFormData.description,
          templateIds: kitFormData.selectedTemplateIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar kit jurídico.');

      setShowKitModal(false);
      setEditingKit(null);
      setKitFormData({
        name: '',
        category: 'Previdenciário',
        description: '',
        selectedTemplateIds: [],
      });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKit = async (kitId: string, kitName: string) => {
    if (!confirm(`Deseja realmente remover o kit "${kitName}"?`)) return;
    try {
      const res = await fetch(`/api/kits/${kitId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir kit.');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- HANDLERS PARA TEMPLATES (MODELOS) ---
  const handleOpenNewTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      title: '',
      category: 'Previdenciário',
      documentType: 'CONTRATO',
      contentHtml: '',
      description: '',
    });
    setShowTemplateModal(true);
  };

  const handleOpenEditTemplateModal = (tpl: Template) => {
    setEditingTemplate(tpl);
    setTemplateFormData({
      title: tpl.title,
      category: tpl.category,
      documentType: tpl.documentType,
      contentHtml: tpl.contentHtml,
      description: tpl.description || '',
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const isEditing = !!editingTemplate;
      const url = isEditing ? `/api/templates/${editingTemplate.id}` : '/api/templates';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar modelo.');

      setShowTemplateModal(false);
      setEditingTemplate(null);
      setTemplateFormData({
        title: '',
        category: 'Previdenciário',
        documentType: 'CONTRATO',
        contentHtml: '',
        description: '',
      });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, title: string) => {
    if (!confirm(`Deseja realmente excluir a minuta "${title}"?`)) return;
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir minuta.');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const installStarterLibrary = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starterLibrary: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível instalar a biblioteca inicial.');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Unificado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">
            Kits Jurídicos & Modelos de Documentos
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Gerencie seus pacotes completos de contratação (Kits) e ajuste as minutas padrão do escritório.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'kits' ? (
            <>
              <button
                onClick={handleOpenNewKitModal}
                className="px-4 py-2.5 bg-[#071B3A] hover:bg-blue-900 text-white font-bold rounded-xl flex items-center gap-2 text-xs transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4 text-gold-400" /> Novo Kit Jurídico
              </button>
              <Link
                href="/kits/enviar"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 text-xs transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" /> Disparar Kit para Cliente
              </Link>
            </>
          ) : (
            <button
              onClick={handleOpenNewTemplateModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 text-xs transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" /> Novo Modelo de Documento
            </button>
          )}
        </div>
      </div>

      {/* Navegação de Abas Unificadas */}
      <div className="flex border-b border-slate-200 text-xs font-bold font-heading">
        <button
          onClick={() => setActiveTab('kits')}
          className={`px-6 py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'kits'
              ? 'border-blue-600 text-blue-600 font-extrabold bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          <span>Kits Jurídicos ({kits.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-600 font-extrabold bg-blue-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Minutas & Modelos de Documentos ({templates.length})</span>
        </button>
      </div>

      {/* --- ABA 1: KITS JURÍDICOS --- */}
      {activeTab === 'kits' && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              Carregando pacotes de kits jurídicos...
            </div>
          ) : kits.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <FolderArchive className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#071B3A]">Nenhum Kit Jurídico Cadastrado</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Kits jurídicos agrupam Procuração, Contrato de Honorários e Declaração em um único link para o cliente assinar tudo de uma vez.
              </p>
              <button
                onClick={handleOpenNewKitModal}
                className="px-6 py-3 bg-[#071B3A] text-white text-xs font-bold rounded-xl hover:bg-blue-900 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-gold-400" /> Criar Meu Primeiro Kit
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {kits.map((kit) => (
                <div
                  key={kit.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold rounded-lg text-[10px] uppercase font-heading tracking-wider">
                        {kit.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditKitModal(kit)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Editar Kit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteKit(kit.id, kit.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Excluir Kit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-heading font-extrabold text-base text-[#071B3A]">{kit.name}</h3>
                      {kit.description && <p className="text-xs text-slate-500 mt-1">{kit.description}</p>}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-heading">
                        Modelos Incluídos ({kit.items.length}):
                      </div>
                      <ul className="space-y-1 text-xs">
                        {kit.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-2 text-slate-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">{item.template.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Link
                    href={`/kits/enviar?kitId=${kit.id}`}
                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-colors font-heading"
                  >
                    <span>Disparar este Kit</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- ABA 2: MINUTAS & MODELOS DE DOCUMENTOS --- */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="font-bold text-slate-700 font-heading">Filtrar Categoria:</span>
              <div className="flex flex-wrap gap-1">
                {['', 'Previdenciário', 'Trabalhista', 'Família', 'Cível', 'Consumidor'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      categoryFilter === cat
                        ? 'bg-[#071B3A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat || 'Todas'}
                  </button>
                ))}
              </div>
            </div>

            {templates.length === 0 && (
              <button
                onClick={installStarterLibrary}
                disabled={saving}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Instalar 3 Minutas Padrão da Biblioteca
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              Carregando minutas e modelos...
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#071B3A]">Nenhum Modelo Encontrado</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Crie modelos de minutas para Procurações, Contratos e Declarações para agilizar a confecção de kits e documentos individuais.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={installStarterLibrary}
                  className="px-5 py-2.5 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Instalar Minutas Padrão
                </button>
                <button
                  onClick={handleOpenNewTemplateModal}
                  className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Criar Novo Modelo
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold rounded-lg text-[10px] uppercase font-heading tracking-wider">
                          {tpl.category}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-mono text-[10px] font-bold rounded-md">
                          v{tpl.version}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditTemplateModal(tpl)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Editar Minuta"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.title)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Excluir Minuta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-heading font-extrabold text-base text-[#071B3A]">{tpl.title}</h3>
                      {tpl.description && <p className="text-xs text-slate-500 mt-1">{tpl.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEditTemplateModal(tpl)}
                      className="flex-1 py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors font-heading"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar Minuta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL 1: CRIAR / EDITAR KIT JURÍDICO --- */}
      {showKitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 font-sans animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#071B3A] font-extrabold font-heading">
                <FolderArchive className="w-5 h-5 text-blue-600" />
                <span>{editingKit ? 'Editar Kit Jurídico' : 'Novo Kit Jurídico'}</span>
              </div>
              <button onClick={() => setShowKitModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveKit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Nome do Kit *</label>
                <input
                  type="text"
                  required
                  value={kitFormData.name}
                  onChange={(e) => setKitFormData({ ...kitFormData, name: e.target.value })}
                  placeholder="Ex: Kit Consumidor - Negativação Indevida"
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Área / Categoria</label>
                  <select
                    value={kitFormData.category}
                    onChange={(e) => setKitFormData({ ...kitFormData, category: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none bg-white"
                  >
                    <option value="Previdenciário">Previdenciário</option>
                    <option value="Trabalhista">Trabalhista</option>
                    <option value="Família">Família</option>
                    <option value="Cível">Cível</option>
                    <option value="Consumidor">Consumidor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Descrição Breve</label>
                  <input
                    type="text"
                    value={kitFormData.description}
                    onChange={(e) => setKitFormData({ ...kitFormData, description: e.target.value })}
                    placeholder="Pacote completo..."
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 font-heading">
                  Selecione as Minutas que Compõem o Kit: *
                </label>

                <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  {templates.map((tpl) => {
                    const isSelected = kitFormData.selectedTemplateIds.includes(tpl.id);
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleToggleTemplateInKit(tpl.id)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="accent-blue-600 rounded"
                          />
                          <span className="truncate">{tpl.title}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono uppercase font-bold shrink-0">
                          {tpl.category}
                        </span>
                      </div>
                    );
                  })}

                  {templates.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs font-medium">
                      Nenhum modelo cadastrado ainda. Cadastre um modelo na Aba "Minutas & Modelos" primeiro.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKitModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Salvar Kit Jurídico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CRIAR / EDITAR MINUTA (TEMPLATE) --- */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 font-sans animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#071B3A] font-extrabold font-heading">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>{editingTemplate ? 'Editar Minuta do Modelo' : 'Novo Modelo de Minuta'}</span>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Título do Modelo *</label>
                  <input
                    type="text"
                    required
                    value={templateFormData.title}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, title: e.target.value })}
                    placeholder="Ex: Contrato de Honorários - Êxito"
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Categoria / Área</label>
                  <select
                    value={templateFormData.category}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none bg-white"
                  >
                    <option value="Previdenciário">Previdenciário</option>
                    <option value="Trabalhista">Trabalhista</option>
                    <option value="Família">Família</option>
                    <option value="Cível">Cível</option>
                    <option value="Consumidor">Consumidor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Documento</label>
                  <select
                    value={templateFormData.documentType}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, documentType: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none bg-white"
                  >
                    <option value="CONTRATO">Contrato de Honorários</option>
                    <option value="PROCURACAO">Procuração Ad Judicia</option>
                    <option value="DECLARACAO">Declaração de Hipossuficiência</option>
                    <option value="OUTRO">Outro Documento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Descrição Breve do Modelo</label>
                <input
                  type="text"
                  value={templateFormData.description}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                  placeholder="Ex: Contrato previdenciário completo com cláusula de êxito e proteção de dados."
                  className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Conteúdo da Minuta (Com Tags Dinâmicas e Copilot de IA): *
                </label>
                <DocumentRichEditor
                  key={`${editingTemplate?.id || 'novo'}-${showTemplateModal}`}
                  value={showSamples(templateFormData.contentHtml)}
                  onChange={(html) => setTemplateFormData({ ...templateFormData, contentHtml: restoreVariables(html) })}
                  showAiCopilot={true}
                  showTags={false}
                  placeholder="Escreva a minuta jurídica..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button type="button" onClick={openPdfPreview} disabled={previewing || !templateFormData.contentHtml} className="px-5 py-2.5 border border-[#071B3A] text-[#071B3A] font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"><Eye className="w-4 h-4" /> {previewing ? 'Gerando...' : 'Prévia PDF'}</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Salvar Modelo de Minuta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {previewUrl && <div className="fixed inset-0 z-[60] bg-slate-950/70 flex items-center justify-center p-4"><div className="w-full max-w-5xl h-[88vh] bg-white rounded-2xl overflow-hidden flex flex-col"><div className="px-5 py-3 bg-[#071B3A] text-white flex justify-between"><strong>Prévia do modelo</strong><button type="button" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>Fechar</button></div><iframe src={previewUrl} title="Prévia PDF" className="w-full flex-1" /></div></div>}
    </div>
  );
}
