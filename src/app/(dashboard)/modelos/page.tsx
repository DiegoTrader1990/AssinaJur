'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Edit3, Copy, X, CheckCircle, AlertCircle, Loader2, Eye } from 'lucide-react';
import dynamic from 'next/dynamic';

const DocumentRichEditor = dynamic(() => import('@/components/DocumentRichEditor').then(mod => mod.DocumentRichEditor), { ssr: false });

const SAMPLE_VALUES: Record<string, string> = { cliente_nome: 'MARIA APARECIDA DA SILVA', cliente_cpf: '123.456.789-09', cliente_rg: '12.345.678-9', cliente_nacionalidade: 'brasileira', cliente_estado_civil: 'solteira', cliente_profissao: 'aposentada', cliente_endereco: 'Rua das Acácias, nº 120, Centro, Porto Seguro/BA, CEP 45810-000', advogado_nome: 'DR. DIEGO DOS SANTOS RODRIGUES', advogado_oab: 'OAB/BA nº 51.881', advogada_nome: 'DRA. DOMINICK QUINTO SOARES', advogada_oab: 'OAB/BA nº 62.443', escritorio_nome: 'Rodrigues & Soares - Advogados', valor_honorarios: 'R$ 3.000,00', percentual_exito: '30%', cidade: 'Porto Seguro', data_atual: '12 de agosto de 2026' };
const showSamples = (html: string) => Object.entries(SAMPLE_VALUES).reduce((text, [key, value]) => text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), value), html);
const restoreVariables = (html: string) => Object.entries(SAMPLE_VALUES).reduce((text, [key, value]) => text.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `{{${key}}}`), html);

interface Template {
  id: string;
  title: string;
  category: string;
  documentType: string;
  contentHtml: string;
  description?: string;
  version: number;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Previdenciário',
    documentType: 'CONTRATO',
    contentHtml: '',
    description: '',
  });

  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/templates', window.location.origin);
      if (categoryFilter) url.searchParams.set('category', categoryFilter);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.templates) setTemplates(data.templates);
    } catch (err) {
      console.error('Erro ao carregar modelos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
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
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar modelo.');

      setShowModal(false);
      setEditingTemplate(null);
      setFormData({
        title: '',
        category: 'Previdenciário',
        documentType: 'CONTRATO',
        contentHtml: '',
        description: '',
      });
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const installStarterLibrary = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ starterLibrary: true }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível instalar a biblioteca inicial.');
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openPdfPreview = async () => {
    setPreviewing(true);
    try {
      const response = await fetch('/api/templates/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: formData.title, contentHtml: formData.contentHtml }) });
      if (!response.ok) throw new Error();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(await response.blob()));
    } catch { setError('Não foi possível gerar a prévia em PDF.'); } finally { setPreviewing(false); }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3D] tracking-tight">Modelos Jurídicos Próprios</h1>
          <p className="text-sm text-slate-500 mt-1">Cadastre minutas com tags de preenchimento automático para reutilização em contratos e procurações.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-sm text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Modelo Jurídico
        </button>
      </div>

      {/* Tabela de Modelos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
            Carregando modelos...
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-bold text-base">Nenhum modelo cadastrado.</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Crie modelos para automatizar o preenchimento dos contratos do escritório.</p>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={installStarterLibrary} disabled={saving} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Instalar Biblioteca Inicial
              </button>
              <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-gold-500 text-[#0B1D3D] font-bold rounded-xl text-xs inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Criar Modelo Próprio
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 p-6">
            {templates.map((tpl) => (
              <div key={tpl.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] uppercase">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] text-slate-400">v{tpl.version}</span>
                  </div>
                  <h2 className="text-base font-bold text-[#0B1D3D] mt-2">{tpl.title}</h2>
                  <p className="text-xs text-slate-600 line-clamp-3 mt-1 font-serif">
                    {tpl.contentHtml.replace(/<[^>]*>/g, '')}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">{tpl.documentType}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setFormData({
                          title: tpl.title,
                          category: tpl.category,
                          documentType: tpl.documentType,
                          contentHtml: tpl.contentHtml,
                          description: tpl.description || '',
                        });
                        setEditingTemplate(tpl);
                        setShowModal(true);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 flex items-center gap-1 text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Editar
                    </button>
                    <button
                      onClick={() => {
                        setFormData({
                          title: `${tpl.title} (Cópia)`,
                          category: tpl.category,
                          documentType: tpl.documentType,
                          contentHtml: tpl.contentHtml,
                          description: tpl.description || '',
                        });
                        setEditingTemplate(null);
                        setShowModal(true);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5 text-gold-600" /> Duplicar Modelo
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Cadastro de Modelo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 relative my-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold-500" />
                <h2 className="text-lg font-bold text-[#0B1D3D]">{editingTemplate ? 'Editar Modelo' : 'Novo Modelo Jurídico'}</h2>
              </div>
              <button onClick={() => { setShowModal(false); setEditingTemplate(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateTemplate} className="mt-4 space-y-4 text-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Título do Modelo *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contrato de Honorários Previdenciário"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Doc. *</label>
                    <select
                      value={formData.documentType}
                      onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-xs"
                    >
                      <option value="CONTRATO">Contrato</option>
                      <option value="PROCURACAO">Procuração</option>
                      <option value="DECLARACAO">Declaração</option>
                      <option value="TERMO">Termo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Texto do Modelo *</label>
                <DocumentRichEditor
                  key={`${editingTemplate?.id || 'novo'}-${showModal}`}
                  value={showSamples(formData.contentHtml)}
                  onChange={(html) => setFormData({ ...formData, contentHtml: restoreVariables(html) })}
                  showAiCopilot={true}
                  showTags={false}
                  placeholder="Escreva a minuta do modelo jurídico..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingTemplate(null); }}
                  className="px-4 py-2.5 text-slate-600 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button type="button" onClick={openPdfPreview} disabled={previewing || !formData.contentHtml} className="px-5 py-2.5 border border-[#0B1D3D] text-[#0B1D3D] font-bold rounded-xl text-xs flex items-center gap-2 disabled:opacity-50"><Eye className="w-4 h-4" /> {previewing ? 'Gerando...' : 'Prévia PDF'}</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-sm text-xs transition-all flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Salvar Modelo Jurídico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {previewUrl && <div className="fixed inset-0 z-[60] bg-slate-950/70 flex items-center justify-center p-4"><div className="w-full max-w-5xl h-[88vh] bg-white rounded-2xl overflow-hidden flex flex-col"><div className="px-5 py-3 bg-[#0B1D3D] text-white flex justify-between"><strong>Prévia do modelo</strong><button type="button" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>Fechar</button></div><iframe src={previewUrl} title="Prévia PDF" className="w-full flex-1" /></div></div>}
    </div>
  );
}
