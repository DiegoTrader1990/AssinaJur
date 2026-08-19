'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Edit3, Copy, X, CheckCircle, AlertCircle, Loader2, Eye, Upload, FileType2, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { DocumentRichEditor } from '@/components/DocumentRichEditor';
import { ensureClientQualificationTokens } from '@/lib/kitTemplateNormalization';

const WordTemplateEditor = dynamic(() => import('@/components/WordTemplateEditor').then(mod => mod.WordTemplateEditor), { ssr: false });

const SAMPLE_VALUES: Record<string, string> = { cliente_nome: 'MARIA APARECIDA DA SILVA', cliente_cpf: '123.456.789-09', cliente_rg: '12.345.678-9', cliente_nacionalidade: 'brasileira', cliente_estado_civil: 'solteira', cliente_profissao: 'aposentada', cliente_endereco: 'Rua das Acácias, nº 120, Centro, Porto Seguro/BA, CEP 45810-000', advogado_nome: 'DR. DIEGO DOS SANTOS RODRIGUES', advogado_oab: 'OAB/BA nº 51.881', advogada_nome: 'DRA. DOMINICK QUINTO SOARES', advogada_oab: 'OAB/BA nº 62.443', escritorio_nome: 'Rodrigues & Soares - Advogados', valor_honorarios: 'R$ 3.000,00', percentual_exito: '30%', cidade: 'Porto Seguro', data_atual: '12 de agosto de 2026' };
const showSamples = (html: string) => Object.entries(SAMPLE_VALUES).reduce((text, [key, value]) => text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), value), html);
const restoreVariables = (html: string) => Object.entries(SAMPLE_VALUES).reduce((text, [key, value]) => text.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `{{${key}}}`), html);

const showEditorPreview = (html: string, documentType: string, values: Record<string, string>) => {
  const samples = { ...SAMPLE_VALUES, ...values };
  const label = /PROCUR/i.test(documentType) ? 'OUTORGADOS' : 'CONTRATADOS';
  const withPatronos = /PROCUR|CONTRAT/i.test(documentType) && samples.patronos_qualificacao_conjunta
    ? html.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attributes, innerHtml) => {
        const text = String(innerHtml).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
        return new RegExp(`^${label}?S?\\s*:`, 'i').test(text) ? `<${tag}${attributes}><strong>${label}:</strong> ${samples.patronos_qualificacao_conjunta}.</${tag}>` : block;
      })
    : html;
  // Destacamos em amarelo o valor de amostra que entra no lugar de cada
  // {{variável}}, para o advogado enxergar de cara o que é dado dinâmico
  // (troca por cliente) e o que é texto fixo do modelo. O <mark> é só visual:
  // restoreEditorPreview() SEMPRE remove esse envoltório ao converter de volta
  // para {{...}}, então ele nunca fica gravado no modelo salvo - a mesma
  // armadilha do negrito automático (comentário abaixo) foi evitada de propósito.
  const withValues = Object.entries(samples).reduce(
    (text, [key, value]) => value
      ? text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), `<mark class="aj-var-preview" style="background-color:#fef08a;color:#78350f;border-radius:2px;padding:0 2px;" title="Variável: {{${key}}} — este texto será substituído pelos dados de cada cliente">${value}</mark>`)
      : text,
    withPatronos
  );
  // Antes negritávamos os nomes de amostra aqui só para deixar a prévia mais
  // bonita - mas isso quebrava o "{{cliente_nome}}" ao envolver o texto do
  // valor de amostra com <strong>, tornando o trecho contínuo esperado por
  // restoreEditorPreview() incompleto. Resultado: ao salvar, o nome de
  // amostra ficava gravado como texto fixo no modelo, em vez de voltar a ser
  // a variável {{cliente_nome}} - exatamente o "o código some ao salvar"
  // relatado. O PDF final já negrita os nomes por conta própria (na geração
  // real, via emphasizeDocumentNames), então esse negrito aqui era só
  // cosmético e arriscado. Dessa vez usamos <mark> (não <strong>/<b>) e
  // garantimos, em restoreEditorPreview(), que o envoltório é sempre removido
  // junto com o texto, então esse mesmo problema não se repete.
  return withValues;
};
const restoreEditorPreview = (html: string, values: Record<string, string>) => {
  const withTokensRestored = Object.entries({ ...SAMPLE_VALUES, ...values })
    .sort(([, left], [, right]) => right.length - left.length)
    .reduce((text, [key, value]) => value ? text.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `{{${key}}}`) : text, html);
  // Remove o <mark> de destaque que envolvia o valor de amostra - ele nunca
  // deve sobrar no HTML salvo, só serve para a prévia visual do editor.
  return withTokensRestored.replace(/<mark[^>]*class="aj-var-preview"[^>]*>([\s\S]*?)<\/mark>/gi, '$1');
};

interface Template {
  id: string;
  title: string;
  category: string;
  documentType: string;
  contentHtml: string;
  description?: string;
  version: number;
  sourceFormat?: 'HTML' | 'DOCX';
  sourceFileId?: string | null;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [wordEditorTemplate, setWordEditorTemplate] = useState<Template | null>(null);
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [wordForm, setWordForm] = useState({ title: '', category: 'Previdenciário', documentType: 'PROCURACAO' });

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
  const [autoDetectMessage, setAutoDetectMessage] = useState('');
  const [detectingVariables, setDetectingVariables] = useState(false);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchTemplates();
    fetch('/api/templates/preview').then((response) => response.ok ? response.json() : null).then((data) => { if (data?.variables) setSampleValues(data.variables); }).catch(() => undefined);
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

  // Rede de segurança: se por qualquer motivo um valor de amostra (ex.: o
  // nome "MARIA APARECIDA DA SILVA" usado só para a prévia) ainda estiver
  // gravado como texto fixo no conteúdo na hora de salvar - em vez de ter
  // voltado a ser a variável {{...}} -, avisamos antes de gravar, para nunca
  // salvar silenciosamente um modelo com dados de amostra fixos no lugar da
  // variável dinâmica.
  const findLeftoverSampleValues = (html: string, values: Record<string, string>) =>
    Object.entries({ ...SAMPLE_VALUES, ...values })
      .filter(([, value]) => value && value.trim().length >= 6)
      .filter(([, value]) => html.includes(value))
      .map(([key]) => key);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();

    const leftover = findLeftoverSampleValues(formData.contentHtml, sampleValues);
    if (leftover.length > 0) {
      setError(`Não foi possível salvar: o texto de amostra da prévia ficou gravado no lugar da(s) variável(is) ${leftover.join(', ')}. Volte ao trecho afetado, apague o texto fixo e reinsira a tag {{${leftover[0]}}} antes de salvar.`);
      return;
    }

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

  // Ajuda quem cola um texto pronto (ou sobe um Word) com nome/CPF/RG/endereço já
  // preenchidos de um cliente antigo: procura o parágrafo de qualificação
  // (OUTORGANTE:/CONTRATANTE:/CPF.../RG.../residente e domiciliado) e o de
  // assinatura no rodapé, e reconstrói os dois usando as variáveis {{...}}, sem
  // precisar que a pessoa ache e troque cada dado fixo manualmente.
  const AUTO_DETECT_AI_COMMAND = 'Remova todos os dados fixos de uma cliente específica que aparecerem neste texto (nome completo, CPF, RG, nacionalidade, estado civil, profissão, endereço, telefone) e troque cada um pela variável correspondente do sistema AssinaJur ({{cliente_nome}}, {{cliente_cpf}}, {{cliente_rg}}, {{cliente_nacionalidade}}, {{cliente_estado_civil}}, {{cliente_profissao}}, {{cliente_endereco}}, {{cliente_telefone}}), tanto na qualificação inicial quanto no rodapé de assinatura (nome antes de "OUTORGANTE"/"CONTRATANTE"/"DECLARANTE", ou o nome sozinho acima da linha de assinatura). Também troque a cidade/data do fechamento por {{cidade}}, {{data_atual}}. Não altere mais nada no texto: mantenha exatamente a mesma redação, formatação e tags HTML, só troque os dados fixos da cliente pelas variáveis.';

  // Tenta primeiro com IA (já configurada no AssinaJur, mesmo motor do "copiloto"
  // do editor) para reconhecer nome/CPF/RG/endereço mesmo em textos com redação
  // diferente do padrão - sem exigir que o advogado saiba o que é uma "variável"
  // ou tenha que clicar tag por tag. Se a IA não responder (ex: indisponível),
  // caímos para a busca por padrão de texto (OUTORGANTE:/CPF/RG/etc) como reserva.
  const handleAutoDetectVariables = async () => {
    const before = formData.contentHtml;
    setDetectingVariables(true);
    setAutoDetectMessage('Analisando o texto com IA...');
    try {
      const response = await fetch('/api/templates/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentHtml: before, command: AUTO_DETECT_AI_COMMAND }),
      });
      const data = await response.json();
      const aiResult: string = data?.contentHtml || data?.html || '';
      if (response.ok && aiResult && aiResult.trim() && aiResult !== before) {
        setFormData((current) => ({ ...current, contentHtml: aiResult }));
        setAutoDetectMessage('A IA trocou os dados fixos da cliente (nome, CPF, RG, endereço etc) pelas variáveis dinâmicas. Revise o texto abaixo antes de salvar.');
        return;
      }
      throw new Error(data?.error || 'IA não retornou alteração.');
    } catch (aiError) {
      // Reserva sem IA: busca por padrão de texto conhecido (OUTORGANTE:/CPF/RG/etc).
      const after = ensureClientQualificationTokens(before, formData.title, formData.documentType);
      if (after === before) {
        setAutoDetectMessage('Não conseguimos detectar dados fixos automaticamente (a IA está indisponível no momento e o texto não segue um padrão conhecido como "OUTORGANTE: Nome, CPF nº..."). Insira as variáveis manualmente clicando nelas no painel abaixo.');
        return;
      }
      setFormData((current) => ({ ...current, contentHtml: after }));
      setAutoDetectMessage('A IA está indisponível no momento, então usamos a busca por padrão de texto: trocamos o trecho de qualificação e/ou assinatura por variáveis dinâmicas. Revise o texto abaixo antes de salvar.');
    } finally {
      setDetectingVariables(false);
    }
  };

  const openPdfPreview = async () => {
    setPreviewing(true);
    try {
      const response = await fetch('/api/templates/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: formData.title, documentType: formData.documentType, contentHtml: formData.contentHtml }) });
      if (!response.ok) throw new Error();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(await response.blob()));
    } catch { setError('Não foi possível gerar a prévia em PDF.'); } finally { setPreviewing(false); }
  };

  const handleWordUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordFile) return setError('Selecione o arquivo Word original.');
    setSaving(true); setError('');
    try {
      const payload = new FormData();
      payload.set('file', wordFile); Object.entries(wordForm).forEach(([key, value]) => payload.set(key, value));
      const response = await fetch('/api/templates/word', { method: 'POST', body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o modelo Word.');
      setShowWordModal(false); setWordFile(null); setWordForm({ title: '', category: 'Previdenciário', documentType: 'PROCURACAO' }); await fetchTemplates();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3D] tracking-tight">Modelos Jurídicos Próprios</h1>
          <p className="text-sm text-slate-500 mt-1">Cadastre minutas com tags de preenchimento automático para reutilização em contratos e procurações.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowWordModal(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B1D3D] text-white font-bold rounded-xl shadow-sm text-sm"><Upload className="w-4 h-4" /> Enviar modelo Word</button>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-sm text-sm transition-all"><Plus className="w-4 h-4" /> Modelo HTML</button>
        </div>
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
                  <p className="text-xs text-slate-600 line-clamp-3 mt-1 font-serif">{tpl.sourceFormat === 'DOCX' ? 'Arquivo Word original preservado. A edição e a prévia usarão o mesmo documento.' : tpl.contentHtml.replace(/<[^>]*>/g, '')}</p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">{tpl.documentType}</span>
                  <div className="flex items-center gap-2">
                    {tpl.sourceFormat === 'DOCX' ? <><button onClick={() => setWordEditorTemplate(tpl)} className="px-3 py-1.5 bg-[#0B1D3D] text-white font-bold rounded-lg flex items-center gap-1 text-xs"><Edit3 className="w-3.5 h-3.5" /> Abrir Word</button><a href={`/api/templates/word?templateId=${tpl.id}`} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg flex items-center gap-1 text-xs"><Download className="w-3.5 h-3.5" /> Original</a></> : <button
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
                    </button>}
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

      {showWordModal && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"><form onSubmit={handleWordUpload} className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl"><div className="flex justify-between items-center border-b pb-4"><div className="flex gap-2 items-center"><FileType2 className="text-blue-600" /><div><h2 className="font-bold text-[#0B1D3D]">Novo modelo Word</h2><p className="text-xs text-slate-500">O arquivo original será preservado para a edição fiel.</p></div></div><button type="button" onClick={() => setShowWordModal(false)}><X className="text-slate-400" /></button></div><div className="space-y-4 pt-5"><input required value={wordForm.title} onChange={e=>setWordForm({...wordForm,title:e.target.value})} placeholder="Ex.: Procuração previdenciária" className="w-full p-3 border rounded-xl" /><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required onChange={e=>setWordFile(e.target.files?.[0] || null)} className="w-full text-sm" /><p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">Piloto Word: nesta primeira etapa o AssinaJur armazena o DOCX original. O editor Syncfusion será conectado em seguida usando a chave temporária recebida.</p><div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowWordModal(false)} className="px-4 py-2 text-sm">Cancelar</button><button disabled={saving} className="px-4 py-2 bg-[#0B1D3D] text-white rounded-xl font-bold text-sm">{saving ? 'Enviando...' : 'Salvar modelo Word'}</button></div></div></form></div>}
      {wordEditorTemplate && <div className="fixed inset-0 z-[60] bg-slate-950/70 flex items-center justify-center p-4"><div className="w-full max-w-7xl h-[92vh] bg-white rounded-2xl overflow-hidden flex flex-col"><div className="px-5 py-3 bg-[#0B1D3D] text-white flex justify-between items-center"><div><strong>Editor Word — {wordEditorTemplate.title}</strong><p className="text-xs text-slate-300">Modelo original preservado • edição local segura</p></div><button type="button" onClick={() => setWordEditorTemplate(null)} className="px-3 py-1.5 bg-white/10 rounded-lg">Fechar</button></div><div className="p-4 overflow-auto flex-1"><WordTemplateEditor templateId={wordEditorTemplate.id} title={wordEditorTemplate.title} /></div></div></div>}

      {/* Modal: Cadastro de Modelo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 relative my-8 overflow-y-auto max-h-[90vh]">
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
                <div className="flex items-center justify-between gap-3 mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Texto do Modelo *</label>
                  <button
                    type="button"
                    onClick={handleAutoDetectVariables}
                    disabled={detectingVariables || !formData.contentHtml}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 font-bold text-[11px] hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1.5"
                    title="Usa IA para reconhecer nome, CPF, RG, endereço etc fixos (de texto colado ou Word) e trocar automaticamente pelas variáveis do sistema"
                  >
                    {detectingVariables ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Detectar e aplicar variáveis (IA)
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Se você colou um texto pronto ou subiu um Word com nome/CPF/endereço já preenchidos de um cliente, use o botão acima: a IA lê o texto e troca os dados fixos pelas variáveis automaticamente, sem você precisar saber onde inserir cada código. Também é possível inserir as variáveis manualmente clicando nelas no painel abaixo do editor.
                </p>
                {autoDetectMessage && (
                  <div className="mb-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{autoDetectMessage}</span>
                  </div>
                )}
                <DocumentRichEditor
                  key={`${editingTemplate?.id || 'novo'}-${showModal}-${sampleValues.patronos_nomes || 'carregando'}`}
                  value={showEditorPreview(formData.contentHtml, formData.documentType, sampleValues)}
                  onChange={(html) => { setFormData({ ...formData, contentHtml: restoreEditorPreview(html, sampleValues) }); setAutoDetectMessage(''); }}
                  showTags={false}
                  showAiCopilot={false}
                  placeholder="Redija ou ajuste o documento..."
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
