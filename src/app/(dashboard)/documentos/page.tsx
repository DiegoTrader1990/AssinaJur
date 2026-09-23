'use client';
import { configuredGroups } from '@/lib/participant-groups';

import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileCheck2,
  Plus,
  Search,
  Copy,
  Check,
  Send,
  Ban,
  Loader2,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  FileText,
  Download,
  Award,
  Trash2,
  Folder,
  FolderOpen,
  Tag as TagIcon,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  Sparkles,
  Share2,
  Scale,
  ShieldCheck,
  Users,
  AlertCircle,
  Inbox,
  Layers,
  Filter,
  CheckSquare,
  Square,
  MessageSquare,
  Kanban,
  Calendar,
  KeyRound,
  User,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  History,
  Eye,
  RotateCcw,
  MoreHorizontal
} from 'lucide-react';
import { maskCpfCnpj } from '@/lib/formatters';

interface Signer {
  signatureOrder: number;
  id: string;
  name: string;
  cpf: string;
  role: string;
  status: string;
  token: string;
  signingMode?: string;
  signedAt?: string;
  ip?: string;
  // Progresso salvo incrementalmente durante a captura - usado só para saber
  // em que etapa a pessoa parou quando o status é EM_ANDAMENTO (ver
  // signerProgressDetail), não para exibir as imagens em si.
  documentFrontImage?: string | null;
  documentBackImage?: string | null;
  selfieCenterImage?: string | null;
  // LIVENESS_STARTED (câmera da selfie chegou a ser aberta, mesmo sem foto
  // confirmada) e PHOTO_REDO_REQUESTED (pedido de refazer uma foto, com o
  // campo pedido em metadata) - ver getPendingRedoField.
  events?: { id: string; eventType: string; metadata?: string | null }[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface DocumentItem {
  isIlliterate?: boolean;
  events?: Array<{ eventType: string; metadata?: string | null }>;
  id: string;
  title: string;
  documentType: string;
  status: string;
  reviewStatus?: string;
  verificationCode?: string;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
  kitBatchId?: string | null;
  kitId?: string | null;
  processId?: string | null;
  client?: { id: string; name: string; cpfCnpj: string };
  signers: Signer[];
  createdBy?: { name: string };
  tags: Tag[];
}

const TAG_COLORS = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0891B2', '#475569'];
const AVULSO_KEY = '__avulso__';

type CategoryFilter = 'ALL' | 'CONCLUIDO' | 'EM_ANDAMENTO' | 'RASCUNHO' | 'CANCELADO';
type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
type SortOrder = 'NEWEST' | 'OLDEST';
type ViewFormat = 'KANBAN' | 'COMPACT' | 'TABLE';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfficeAdmin, setIsOfficeAdmin] = useState(false);
  const [canCorrect, setCanCorrect] = useState(false);
  const restartRequests = useRef<Record<string, string>>({});
  const [redoingIds, setRedoingIds] = useState<Set<string>>(new Set());
  // Ids no formato "signerId:campo" das solicitações de "refazer só uma
  // foto" em andamento - separado de redoingIds (que é por documento) porque
  // aqui a unidade é o campo específico de um signatário.
  const [redoingPhotoIds, setRedoingPhotoIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('NEWEST');
  const [selectedClientFolder, setSelectedClientFolder] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [viewFormat, setViewFormat] = useState<ViewFormat>('KANBAN');

  // Seleção múltipla em lote
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [savingTag, setSavingTag] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  // Fotos reais (base64) só do dossiê aberto - a lista não traz as imagens.
  const [dossierPhotos, setDossierPhotos] = useState<Record<string, Partial<Record<'documentFrontImage' | 'documentBackImage' | 'selfieCenterImage', string>>>>({});
  const [photoPreview, setPhotoPreview] = useState<{ src: string; label: string } | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchTags();
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => { setIsOfficeAdmin(data?.user?.role === 'OFFICE_ADMIN'); setCanCorrect(['OFFICE_ADMIN', 'LAWYER', 'STAFF'].includes(data?.user?.role)); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A API devolve os envios em blocos (paginação). "Carregar mais" traz o
  // próximo bloco e junta com o que já está na tela, sem repetir documentos.
  const sortByNewest = (items: DocumentItem[]) => [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const mergeDocuments = (current: DocumentItem[], incoming: DocumentItem[]) => {
    const byId = new Map(current.map((item) => [item.id, item]));
    incoming.forEach((item) => byId.set(item.id, item));
    return sortByNewest(Array.from(byId.values()));
  };
  const requestDocuments = async (cursor?: string) => {
    const url = new URL('/api/documents', window.location.origin);
    if (searchQuery) url.searchParams.set('q', searchQuery);
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    return res.json() as Promise<{ documents?: DocumentItem[]; nextCursor?: string | null }>;
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await requestDocuments();
      if (data.documents) {
        setDocuments(sortByNewest(data.documents));
        setNextCursor(data.nextCursor || null);
      }
      return data.documents;
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreDocuments = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await requestDocuments(nextCursor);
      if (data.documents) {
        const incoming = data.documents;
        setDocuments((current) => mergeDocuments(current, incoming));
        setNextCursor(data.nextCursor || null);
      }
    } catch (err) {
      console.error('Erro ao carregar mais documentos:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Atualização automática enquanto alguém está assinando: a cada 15s (só com
  // a aba visível) a lista e o dossiê aberto mostram a etapa atual do cliente,
  // sem precisar recarregar a página durante o atendimento por telefone.
  const hasActiveSigning = documents.some((item) => ['ENVIADO', 'VISUALIZADO', 'PARCIALMENTE_ASSINADO', 'EM_ASSINATURA'].includes(item.status));
  useEffect(() => {
    if (!hasActiveSigning) return;
    const timer = window.setInterval(async () => {
      if (window.document.visibilityState !== 'visible') return;
      try {
        const data = await requestDocuments();
        if (!data.documents) return;
        const fresh = data.documents;
        setDocuments((current) => mergeDocuments(current, fresh));
        setSelectedDoc((current) => (current ? fresh.find((item) => item.id === current.id) || current : current));
      } catch { /* tenta de novo no próximo ciclo */ }
    }, 15000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveSigning, searchQuery]);

  // Ao abrir o dossiê, busca as fotos do documento para mostrar miniaturas
  // (frente, verso, selfie) ao lado dos botões de refazer. Recarrega quando o
  // documento muda (ex.: uma foto corrigida acabou de chegar).
  useEffect(() => {
    if (!selectedDoc) { setDossierPhotos({}); return; }
    let cancelled = false;
    fetch(`/api/documents/${selectedDoc.id}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.document?.signers) return;
        const photos: typeof dossierPhotos = {};
        for (const signer of data.document.signers) {
          const entry: Partial<Record<'documentFrontImage' | 'documentBackImage' | 'selfieCenterImage', string>> = {};
          for (const field of ['documentFrontImage', 'documentBackImage', 'selfieCenterImage'] as const) {
            if (typeof signer[field] === 'string' && signer[field].startsWith('data:image')) entry[field] = signer[field];
          }
          photos[signer.id] = entry;
        }
        setDossierPhotos(photos);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoc?.id, selectedDoc?.updatedAt]);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (data.tags) setAllTags(data.tags);
    } catch (err) {
      console.error('Erro ao carregar tags:', err);
    }
  };

  const handleCopyLink = (signerToken: string) => {
    const link = `${window.location.origin}/assinar/${signerToken}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(signerToken);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleOpenWhatsApp = (docTitle: string, signerName: string, signerToken: string) => {
    const link = `${window.location.origin}/assinar/${signerToken}`;
    const text = encodeURIComponent(
      `Olá ${signerName}, tudo bem?\n\nSegue o link seguro para sua assinatura eletrônica no documento *${docTitle}* com Prova de Presença ao Vivo:\n\n${link}\n\nAtenciosamente,\nRodrigues & Soares Advocacia.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };
  const participantLinkToken = (doc: DocumentItem, person: Signer) => {
    if (person.role !== 'ASSINANTE_A_ROGO' || getPendingRedoField(person)) return person.token;
    try { const group = configuredGroups(doc, doc.signers).find(g => g.rogoOrder === person.signatureOrder); return doc.signers.find(p => p.signatureOrder === group?.partyOrder)?.token || ''; } catch { return ''; }
  };
  const signerRoleLabel = (role: string) => ({ CLIENTE: 'Cliente', ASSINANTE_A_ROGO: 'Assinante a rogo', REPRESENTANTE_LEGAL: 'Representante legal', TESTEMUNHA_1: '1ª testemunha', TESTEMUNHA_2: '2ª testemunha', TESTEMUNHA: 'Testemunha' }[role] || role.replace(/_/g, ' '));

  const REDOABLE_FIELD_LABELS: Record<string, string> = {
    documentFrontImage: 'frente do documento',
    documentBackImage: 'verso do documento',
    selfieCenterImage: 'selfie (prova de presença)',
  };

  // Campo pedido para refazer que AINDA não foi reenviado (o pedido mais
  // recente cujo campo continua vazio no signatário) - independe do status
  // atual dele (ASSINADO ou EM_ANDAMENTO), porque limpar um campo "anterior"
  // (ex: verso) não muda os campos "posteriores" que já existiam de uma
  // tentativa passada (ex: selfie) - por isso não dá pra confiar só na ordem
  // normal de progresso para saber que há um pedido pendente.
  const getPendingRedoField = (signer: Signer): string | null => {
    const lastRedo = signer.events?.find((e) => e.eventType === 'PHOTO_REDO_REQUESTED');
    if (!lastRedo?.metadata) return null;
    try {
      const field = JSON.parse(lastRedo.metadata)?.field;
      if (field && !(signer as any)[field]) return field;
    } catch {
      // metadata mal formado - ignora.
    }
    return null;
  };

  // Traduz o progresso salvo (frente/verso do documento, selfie) na etapa em
  // que a pessoa efetivamente parou, para exibir junto do badge "Em
  // andamento" - segue a mesma ordem real do fluxo de captura (frente →
  // verso → selfie), do menos avançado para o mais avançado. Um pedido de
  // refazer pendente tem prioridade sobre essa ordem normal.
  // Rótulo de campo, só para a mensagem de tentativas recusadas - a foto em
  // si nunca chega a ser salva nesse caso, então não dá para reusar
  // REDOABLE_FIELD_LABELS (que descreve o que já está salvo).
  const FIELD_ATTEMPT_LABELS: Record<string, string> = {
    documentFrontImage: 'frente do documento',
    documentBackImage: 'verso do documento',
    selfieCenterImage: 'selfie (prova de presença)',
  };
  const signerProgressDetail = (signer: Signer) => {
    const pendingRedoField = getPendingRedoField(signer);
    if (pendingRedoField) return `aguardando novo envio: ${REDOABLE_FIELD_LABELS[pendingRedoField]}`;
    // O sistema recusou uma ou mais fotos enviadas (formato inválido, foto
    // pequena demais, arquivo corrompido no envio) - a pessoa está tentando,
    // mas travando na validação automática. Antes disso essas tentativas não
    // deixavam rastro nenhum e ficavam indistinguíveis de "ainda não abriu o
    // link". Prioridade alta: é exatamente a situação em que ligar e orientar
    // ajuda mais.
    const rejections = signer.events?.filter((e) => e.eventType === 'PHOTO_VALIDATION_REJECTED') ?? [];
    if (rejections.length > 0) {
      let field = '';
      try { field = FIELD_ATTEMPT_LABELS[JSON.parse(rejections[0].metadata || '{}').field] || 'uma foto'; } catch { field = 'uma foto'; }
      return `o sistema recusou ${field} ${rejections.length > 1 ? `(${rejections.length} tentativas)` : ''} - ligar para orientar`.trim();
    }
    if (signer.selfieCenterImage) return 'parou na prova de presença (selfie)';
    // Chegou a abrir a câmera da selfie (evento LIVENESS_STARTED já
    // registrado), mas fechou antes de confirmar a foto.
    if (signer.events?.some((e) => e.eventType === 'LIVENESS_STARTED')) return 'parou na etapa de selfie, sem concluir a foto';
    if (signer.documentBackImage) return 'parou após o verso do documento';
    if (signer.documentFrontImage) return 'parou no verso do documento';
    return 'ainda não iniciou a captura';
  };
  const signerProgress = (signer: Signer) => {
    // Pedido de refazer pendente tem prioridade visual sobre qualquer outro
    // status - inclusive sobre "Assinou", já que a assinatura em si continua
    // válida, mas o escritório está esperando uma foto nova específica.
    if (getPendingRedoField(signer)) return <span title={signerProgressDetail(signer)} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700"><RotateCcw className="w-3 h-3" /> Aguardando novo envio</span>;
    if (signer.status === 'ASSINADO') return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Assinou</span>;
    // "Em andamento" - a pessoa já abriu o link e começou a capturar (foto do
    // documento e/ou selfie já salvas), mas ainda não terminou de assinar.
    // Antes disso não existia jeito de distinguir "começou e travou no meio"
    // de "ainda nem abriu o link" - os dois apareciam como a mesma coisa.
    // Agora também mostramos EM QUE ETAPA a pessoa parou, para o escritório
    // saber exatamente o que orientar ao ligar/reenviar o link.
    if (signer.status === 'EM_ANDAMENTO') return <span title={signerProgressDetail(signer)} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700"><Clock className="w-3 h-3" /> Em andamento</span>;
    if (signer.status === 'VISUALIZADO') return <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700"><Eye className="w-3 h-3" /> Link aberto</span>;
    return <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-extrabold text-slate-600"><Clock className="w-3 h-3" /> Aguardando</span>;
  };

  const handleSyncPackageSignature = async (doc: DocumentItem) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sync-package-signature' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível concluir os documentos restantes.');
      alert(`${data.synchronized} documento(s) restante(s) foram concluídos e certificados.`);
      await fetchDocuments();
      setSelectedDoc(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Marca um documento (ou pacote inteiro) concluído como revisado e aprovado. A partir
  // daí o botão Refazer some para ele, evitando clique acidental em algo que já está certo.
  const handleApproveSignature = async (doc: DocumentItem, mode: 'approve-document' | 'approve-package') => {
    setRedoingIds((current) => new Set(current).add(doc.id));
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível aprovar a assinatura.');
      await fetchDocuments();
      setSelectedDoc(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRedoingIds((current) => {
        const next = new Set(current);
        next.delete(doc.id);
        return next;
      });
    }
  };

  const handleRestartApproved = async (doc: DocumentItem, mode: 'restart-document' | 'restart-package') => {
    if (!window.confirm(`Criar um novo envio ${mode === 'restart-package' ? 'do kit inteiro' : 'deste documento'}? O aprovado será mantido intacto. Os participantes receberão novos links e precisarão assinar novamente. O novo envio conta no limite do plano.`)) return;
    const key = `${doc.id}:${mode}`;
    const requestId = restartRequests.current[key] ||= crypto.randomUUID();
    setRedoingIds((current) => new Set(current).add(doc.id));
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: mode, requestId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível criar o novo envio.');
      const updated = await fetchDocuments();
      setSelectedDoc(updated?.find((item) => item.id === data.newDocumentId) || null);
      delete restartRequests.current[key];
      alert('Novo envio criado. Confira os participantes e use os novos links para solicitar as assinaturas. O documento aprovado foi preservado.');
    } catch (err: any) { alert(err.message); }
    finally { setRedoingIds((current) => { const next = new Set(current); next.delete(doc.id); return next; }); }
  };
  // Reabre a assinatura de um documento (ou do pacote inteiro) já concluído, para o caso
  // de a prova de presença ter saído ruim (selo mal posicionado, selfie não aproveitável
  // etc.). Reaproveita o mesmo link/token já enviado e todo o conteúdo do documento já
  // revisado - a pessoa só refaz a etapa de assinar, não precisa de um link novo.
  const handleRedoSignature = async (doc: DocumentItem, mode: 'redo-document' | 'redo-package') => {
    const isPackage = mode === 'redo-package';
    // Conta os documentos do mesmo pacote a partir da lista completa (não de
    // selectedPackageDocuments, que só reflete o dossiê aberto no momento -
    // esta função também é chamada direto de um card individual do kanban,
    // sem o dossiê aberto, onde selectedPackageDocuments estaria vazio/errado).
    const packageDocCount = isPackage
      ? (doc.kitBatchId
          ? documents.filter((item) => item.kitBatchId === doc.kitBatchId && item.client?.id === doc.client?.id && item.status === 'CONCLUIDO').length
          : doc.kitId
          ? resolveLegacyPackageMembers(doc, documents).filter((item) => item.status === 'CONCLUIDO').length
          : 1) || 1
      : 1;
    const confirmMsg = isPackage
      ? `Reabrir TODO O PACOTE (${packageDocCount} documentos) de ${doc.client?.name || 'este cliente'} para uma nova tentativa de assinatura? O mesmo link será reativado e o conteúdo já editado é mantido.`
      : `Reabrir "${doc.title}" para uma nova tentativa de assinatura? O mesmo link será reativado e o conteúdo já editado é mantido.`;
    if (!window.confirm(confirmMsg)) return;
    const reason = window.prompt('Motivo (opcional, fica registrado na trilha de auditoria):') || '';

    setRedoingIds((current) => new Set(current).add(doc.id));
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível reabrir a assinatura.');
      await fetchDocuments();
      setSelectedDoc(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRedoingIds((current) => {
        const next = new Set(current);
        next.delete(doc.id);
        return next;
      });
    }
  };

  // Pede para o signatário refazer só UMA foto específica, sem reabrir toda
  // a assinatura - pensado para quando o escritório olha o certificado e vê
  // que uma foto ficou ruim (borrada, mal enquadrada), mas o resto está
  // correto. Se a assinatura já estiver concluída, ela continua valendo; só
  // a foto é substituída e o certificado é regenerado com a foto nova.
  const handleRequestPhotoRedo = async (doc: DocumentItem, signer: Signer, field: 'documentFrontImage' | 'documentBackImage' | 'selfieCenterImage') => {
    const fieldLabel = REDOABLE_FIELD_LABELS[field];
    if (!window.confirm(`Pedir para ${signer.name} refazer a foto de ${fieldLabel}? A foto atual será removida e o link de assinatura dele(a) retomará direto nessa etapa.${signer.status === 'ASSINADO' ? ' As demais etapas serão mantidas.' : ''}`)) return;
    const reason = window.prompt('Motivo (opcional, fica registrado na trilha de auditoria):') || '';

    const key = `${signer.id}:${field}`;
    setRedoingPhotoIds((current) => new Set(current).add(key));
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redo-photo', signerId: signer.id, field, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível solicitar a nova foto.');
      // Atualiza o dossiê aberto com os dados novos (foto removida, status),
      // sem fechar o modal, para o escritório poder pedir mais de uma foto
      // seguida se precisar.
      const freshDocs = await fetchDocuments();
      const freshDoc = freshDocs?.find((item) => item.id === doc.id);
      if (freshDoc) setSelectedDoc(freshDoc);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRedoingPhotoIds((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (doc.status === 'CONCLUIDO' && doc.reviewStatus === 'APROVADO') { alert('O documento aprovado deve ser preservado.'); return; }
    const isConcluded = doc.status === 'CONCLUIDO';
    const warning = isConcluded
      ? `Este documento já foi ASSINADO e CONCLUÍDO. Excluir "${doc.title}" apaga permanentemente o certificado de evidências — tem certeza?`
      : `Tem certeza que deseja excluir permanentemente "${doc.title}"? Essa ação não pode ser desfeita.`;

    if (!window.confirm(warning)) return;

    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir documento.');

      fetchDocuments();
      if (selectedDoc && selectedDoc.id === doc.id) {
        setSelectedDoc(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Um kit concluído representa uma única contratação, embora contenha vários
  // PDFs. A exclusão do kit remove o conjunto inteiro após uma única confirmação.
  const handleDeleteCompletedPackage = async (packageDocuments: DocumentItem[]) => {
    if (!packageDocuments.length) return;
    const clientName = packageDocuments[0]?.client?.name || 'este cliente';
    if (!window.confirm(`Excluir permanentemente este kit concluído com ${packageDocuments.length} documentos de ${clientName}? Os PDFs assinados e certificados vinculados serão apagados. Esta ação não pode ser desfeita.`)) return;

    setDeletingSelected(true);
    try {
      const results = await Promise.all(
        packageDocuments.map(async (document) => {
          const response = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || `Não foi possível excluir "${document.title}".`);
          return document.id;
        })
      );
      setDocuments((current) => current.filter((document) => !results.includes(document.id)));
      setSelectedDocIds((current) => new Set([...current].filter((id) => !results.includes(id))));
      setSelectedDoc(null);
    } catch (err: any) {
      alert(err.message || 'Não foi possível excluir o kit completo.');
      await fetchDocuments();
    } finally {
      setDeletingSelected(false);
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredDocuments.map((doc) => doc.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedDocIds.has(id));
    setSelectedDocIds((current) => {
      const next = new Set(current);
      visibleIds.forEach((id) => allVisibleSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const selected = documents.filter((doc) => selectedDocIds.has(doc.id));
    const deletable = selected.filter((doc) => doc.status !== 'CONCLUIDO');
    const protectedCount = selected.length - deletable.length;
    if (!deletable.length) { alert('Documentos concluídos devem ser preservados e não podem ser excluídos em lote.'); return; }
    const extraWarning = protectedCount ? ` ${protectedCount} documento(s) concluído(s) serão preservados.` : '';
    if (!window.confirm(`Excluir permanentemente ${deletable.length} documento(s) selecionado(s)?${extraWarning} Esta ação não pode ser desfeita.`)) return;
    setDeletingSelected(true);
    try {
      const res = await fetch('/api/documents/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: deletable.map((doc) => doc.id) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível excluir os documentos.');
      setDocuments((current) => current.filter((doc) => !data.deletedIds.includes(doc.id)));
      setSelectedDocIds(new Set());
    } catch (err: any) { alert(err.message); } finally { setDeletingSelected(false); }
  };

  // A exclusão de documentos concluídos só é permitida quando a seleção
  // representa integralmente um único kit. Isso evita apagar itens de clientes
  // ou kits diferentes por engano.
  const selectedCompletedKit = useMemo(() => {
    const kits = new Map<string, DocumentItem[]>();
    documents.forEach((document) => {
      if (!document.kitBatchId) return;
      const current = kits.get(document.kitBatchId) || [];
      current.push(document);
      kits.set(document.kitBatchId, current);
    });

    const fullySelectedKits = Array.from(kits.values()).filter(
      (kit) => kit.every((document) => document.status === 'CONCLUIDO' && selectedDocIds.has(document.id))
    );

    return fullySelectedKits.length === 1 && fullySelectedKits[0].length === selectedDocIds.size
      ? fullySelectedKits[0]
      : null;
  }, [documents, selectedDocIds]);

  const selectedNonConcludedCount = useMemo(
    () => documents.filter((document) => selectedDocIds.has(document.id) && document.status !== 'CONCLUIDO').length,
    [documents, selectedDocIds]
  );

  // Estatísticas globais do acervo
  const stats = useMemo(() => {
    const total = documents.length;
    const completed = documents.filter((d) => d.status === 'CONCLUIDO').length;
    const inProgress = documents.filter(
      (d) => d.status === 'ENVIADO' || d.status === 'VISUALIZADO' || d.status === 'PARCIALMENTE_ASSINADO' || d.status === 'EM_ASSINATURA'
    ).length;
    const draft = documents.filter((d) => d.status === 'PRONTO_PARA_ENVIO' || d.status === 'RASCUNHO').length;
    return { total, completed, inProgress, draft };
  }, [documents]);

  // Filtro avançado composto com ORDENAÇÃO E FILTRO POR DATA
  const filteredDocuments = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

    let result = documents.filter((doc) => {
      // 1. Busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = doc.title.toLowerCase().includes(q);
        const clientMatch = doc.client?.name.toLowerCase().includes(q) || doc.client?.cpfCnpj.includes(q);
        const codeMatch = doc.verificationCode?.toLowerCase().includes(q);
        if (!titleMatch && !clientMatch && !codeMatch) return false;
      }

      // 2. Filtro por Estágio
      if (categoryFilter === 'CONCLUIDO' && doc.status !== 'CONCLUIDO') return false;
      if (
        categoryFilter === 'EM_ANDAMENTO' &&
        !['ENVIADO', 'VISUALIZADO', 'PARCIALMENTE_ASSINADO', 'EM_ASSINATURA'].includes(doc.status)
      )
        return false;
      if (categoryFilter === 'RASCUNHO' && !['PRONTO_PARA_ENVIO', 'RASCUNHO'].includes(doc.status)) return false;
      if (categoryFilter === 'CANCELADO' && !['CANCELADO', 'RECUSADO', 'EXPIRADO'].includes(doc.status)) return false;

      // 3. Filtro por Data
      const docTime = new Date(doc.createdAt).getTime();
      if (dateFilter === 'TODAY' && docTime < todayStart) return false;
      if (dateFilter === 'WEEK' && docTime < weekStart) return false;
      if (dateFilter === 'MONTH' && docTime < monthStart) return false;

      // 4. Pasta de Cliente
      if (selectedClientFolder) {
        if (selectedClientFolder === AVULSO_KEY) {
          if (doc.client) return false;
        } else {
          if (doc.client?.id !== selectedClientFolder) return false;
        }
      }

      // 5. Tag
      if (selectedTagId) {
        if (!doc.tags?.some((t) => t.id === selectedTagId)) return false;
      }

      return true;
    });

    // Ordenação por Data (Mais recentes vs Mais antigos)
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [documents, searchQuery, categoryFilter, dateFilter, sortOrder, selectedClientFolder, selectedTagId]);

  // Divisão dos documentos por coluna para o Kanban
  const kanbanColumns = useMemo(() => {
    const completed = filteredDocuments.filter((d) => d.status === 'CONCLUIDO');
    const inProgress = filteredDocuments.filter((d) =>
      ['ENVIADO', 'VISUALIZADO', 'PARCIALMENTE_ASSINADO', 'EM_ASSINATURA'].includes(d.status)
    );
    const drafts = filteredDocuments.filter((d) =>
      ['PRONTO_PARA_ENVIO', 'RASCUNHO', 'CANCELADO', 'RECUSADO', 'EXPIRADO'].includes(d.status)
    );
    return { completed, inProgress, drafts };
  }, [filteredDocuments]);

  // Kits mais antigos (gerados antes do campo kitBatchId existir/estar
  // preenchido de forma consistente) têm kitId preenchido mas kitBatchId
  // nulo - sem este fallback esses documentos aparecem soltos, um por um, em
  // vez de agrupados no card "Pacote de assinatura" (e ações no pacote inteiro
  // atingiam só 1 documento). Agrupa por kitId + mesmo cliente + criados
  // dentro de uma janela de 2h - mesma regra usada no backend.
  const resolveLegacyPackageMembers = (doc: DocumentItem, pool: DocumentItem[]) => {
    if (!doc.kitId) return [doc];
    const windowMs = 2 * 60 * 60 * 1000;
    const anchor = new Date(doc.createdAt).getTime();
    return pool.filter(
      (item) =>
        item.kitId === doc.kitId &&
        !item.kitBatchId &&
        item.client?.id === doc.client?.id &&
        Math.abs(new Date(item.createdAt).getTime() - anchor) <= windowMs
    );
  };

  const groupPackages = (items: DocumentItem[]) => {
    const groups: DocumentItem[][] = [];
    const consumed = new Set<string>();
    for (const item of items) {
      if (consumed.has(item.id)) continue;
      let members: DocumentItem[];
      if (item.kitBatchId) {
        members = items.filter((candidate) => candidate.kitBatchId === item.kitBatchId);
      } else if (item.kitId) {
        members = resolveLegacyPackageMembers(item, items);
      } else {
        members = [item];
      }
      members.forEach((member) => consumed.add(member.id));
      groups.push(members);
    }
    return groups;
  };

  // Lista de clientes para o dropdown de pastas
  const clientFolders = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    let avulsoCount = 0;

    for (const doc of documents) {
      if (doc.client) {
        if (!map.has(doc.client.id)) {
          map.set(doc.client.id, { id: doc.client.id, name: doc.client.name, count: 0 });
        }
        map.get(doc.client.id)!.count += 1;
      } else {
        avulsoCount += 1;
      }
    }

    const arr = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (avulsoCount > 0) {
      arr.push({ id: AVULSO_KEY, name: 'Sem Cliente (Avulso)', count: avulsoCount });
    }
    return arr;
  }, [documents]);

  const selectedPackageDocuments = useMemo(() => {
    if (!selectedDoc) return [];
    if (selectedDoc.kitBatchId) {
      return documents.filter((item) => item.kitBatchId === selectedDoc.kitBatchId && item.client?.id === selectedDoc.client?.id);
    }
    if (selectedDoc.kitId) {
      return resolveLegacyPackageMembers(selectedDoc, documents);
    }
    return [selectedDoc];
  }, [selectedDoc, documents]);

  // Nome do kit repetido nos títulos do pacote aparece uma vez só no dossiê.
  const dossierKitSuffix = selectedPackageDocuments.length > 1 ? selectedPackageDocuments[0].title.match(/\s\(([^()]+)\)$/) : null;
  const dossierKitName = dossierKitSuffix && selectedPackageDocuments.every((item) => item.title.endsWith(dossierKitSuffix[0])) ? dossierKitSuffix[1] : '';
  const dossierShortTitle = (title: string) => (dossierKitName && dossierKitSuffix ? title.slice(0, -dossierKitSuffix[0].length) : title);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENVIADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-extrabold text-[10px] border border-blue-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Enviado
          </span>
        );
      case 'VISUALIZADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Visualizado
          </span>
        );
      case 'EM_ASSINATURA':
      case 'PARCIALMENTE_ASSINADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-extrabold text-[10px] border border-amber-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> Em Assinatura
          </span>
        );
      case 'CONCLUIDO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-extrabold text-[10px] border border-emerald-300 font-heading">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Concluído
          </span>
        );
      case 'RECUSADO':
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-extrabold text-[10px] border border-rose-200 font-heading">
            <Ban className="w-3 h-3 text-rose-600" /> Cancelado
          </span>
        );
      case 'PRONTO_PARA_ENVIO':
      case 'RASCUNHO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-extrabold text-[10px] border border-slate-200 font-heading">
            <Clock className="w-3 h-3 text-slate-500" /> Pronto
          </span>
        );
    }
  };

  /* CARD KANBAN ULTRA-COMPACTO DE ALTA DENSIDADE (NÃO EMBOLA) */
  const renderCompactCard = (doc: DocumentItem) => {
    const signedCount = doc.signers.filter((s) => s.status === 'ASSINADO').length;
    const totalSigners = doc.signers.length;
    const isCompleted = doc.status === 'CONCLUIDO';
    const isSelected = selectedDocIds.has(doc.id);
    const firstSigner = doc.signers[0];

    const formattedDate = new Date(doc.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    return (
      <div
        key={doc.id}
        className={`bg-white p-3 rounded-xl border transition-all space-y-2 relative group shadow-2xs hover:shadow-sm ${
          isCompleted
            ? 'border-emerald-200 hover:border-emerald-300'
            : isSelected
            ? 'border-blue-600 ring-1 ring-blue-500/20'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Linha 1: Status Badge + Data Formatada */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <button onClick={() => toggleSelectDoc(doc.id)} className="text-slate-400 hover:text-blue-600">
              {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5" />}
            </button>
            {getStatusBadge(doc.status)}
          </div>
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3" /> {formattedDate}
          </span>
        </div>

        {/* Linha 2: Título do Documento em 1 linha limpa */}
        <h4 className="font-heading text-xs font-black text-slate-900 truncate leading-snug group-hover:text-blue-600 transition-colors">
          {doc.title}
        </h4>

        {/* Linha 3: Cliente + CPF (Uma Única Linha Compacta) */}
        <div className="flex items-center justify-between text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <span className="truncate font-bold text-slate-700 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{doc.client?.name || 'Sem cliente'}</span>
          </span>
          {doc.client?.cpfCnpj && (
            <span className="font-mono text-slate-400 shrink-0 text-[9px] ml-1">
              {maskCpfCnpj(doc.client.cpfCnpj)}
            </span>
          )}
        </div>

        {/* Linha 4: Ações Alinhadas em Botões Ícones/Texto Compactos */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
          {isCompleted ? (
            <a
              href={`/api/documents/${doc.id}/download${doc.updatedAt ? `?v=${encodeURIComponent(doc.updatedAt)}` : ''}`}
              download
              title="Baixar PDF Assinado"
              className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] flex items-center justify-center gap-1 font-heading"
            >
              <Download className="w-3 h-3" /> PDF Assinado
            </a>
          ) : firstSigner && doc.status !== 'CANCELADO' ? (
            <button
              onClick={() => handleOpenWhatsApp(doc.title, firstSigner.name, firstSigner.token)}
              title="Enviar cobrança pelo WhatsApp"
              className="flex-1 py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-lg text-[10px] border border-emerald-200 flex items-center justify-center gap-1 font-heading"
            >
              <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp
            </button>
          ) : (
            <span className="flex-1 text-[10px] text-slate-400 text-center font-mono">
              {signedCount}/{totalSigners} assinados
            </span>
          )}

          {isCompleted && doc.client && !doc.processId && (
            <Link
              href={`/processos?clienteId=${doc.client.id}&documentoIds=${doc.id}`}
              title="Organizar este documento em um processo"
              className="px-2.5 py-1 border border-blue-200 text-blue-700 hover:bg-blue-50 font-extrabold rounded-lg text-[10px] font-heading"
            >
              Processo
            </Link>
          )}

          {isCompleted && canCorrect && doc.reviewStatus !== 'APROVADO' && (
            <>
              {/* Documento faz parte de um kit (mesma sessão de assinatura com
                  vários PDFs) - aprovar/refazer precisa agir no PACOTE inteiro,
                  não só neste card individual, senão os documentos do mesmo
                  kit ficam dessincronizados (um aprovado/reaberto e os outros
                  não, quando na prática são uma única assinatura). */}
              {isOfficeAdmin && <button
                onClick={() => handleApproveSignature(doc, doc.kitBatchId ? 'approve-package' : 'approve-document')}
                disabled={redoingIds.has(doc.id)}
                title={doc.kitBatchId ? 'Aprovar todo o pacote - confirma que as assinaturas estão corretas e remove o botão Refazer' : 'Aprovar - confirma que a assinatura está correta e remove o botão Refazer'}
                className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 rounded-lg border border-emerald-200 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>}
              <button
                onClick={() => handleRedoSignature(doc, doc.kitBatchId ? 'redo-package' : 'redo-document')}
                disabled={redoingIds.has(doc.id)}
                title={doc.kitBatchId ? 'Reabrir TODO O PACOTE para uma nova tentativa de assinatura, mantendo os documentos sincronizados' : 'Reabrir para uma nova tentativa de assinatura, mantendo o mesmo link'}
                className="p-1 text-amber-600 hover:text-amber-700 disabled:opacity-50 rounded-lg border border-amber-200 transition-colors"
              >
                {redoingIds.has(doc.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
          <button
            onClick={() => setSelectedDoc(doc)}
            className="px-2.5 py-1 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-lg text-[10px] font-heading"
          >
            Dossiê
          </button>
          <button
            onClick={() => handleDelete(doc)}
            title="Excluir Documento"
            className="p-1 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    );
  };

  const renderPackageCard = (packageDocuments: DocumentItem[]) => {
    if (packageDocuments.length === 1) return renderCompactCard(packageDocuments[0]);
    const lead = packageDocuments[0];
    const allSelected = packageDocuments.every((item) => selectedDocIds.has(item.id));
    const isCompleted = packageDocuments.every((item) => item.status === 'CONCLUIDO');
    const isPendingReview = isCompleted && packageDocuments.some((item) => item.reviewStatus !== 'APROVADO');
    const formattedDate = new Date(lead.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    // "(Kit Previdenciário Completo)" repetido em todos os documentos vira o
    // nome do kit uma vez só, no cabeçalho do card.
    const kitSuffix = lead.title.match(/\s\(([^()]+)\)$/);
    const kitName = kitSuffix && packageDocuments.every((item) => item.title.endsWith(kitSuffix[0])) ? kitSuffix[1] : '';
    const shortTitle = (title: string) => (kitName && kitSuffix ? title.slice(0, -kitSuffix[0].length) : title);
    const cardKey = lead.kitBatchId || lead.id;
    const canLinkProcess = isCompleted && Boolean(lead.client) && packageDocuments.every((item) => !item.processId);
    const hasMenu = isCompleted;
    const togglePackage = () => setSelectedDocIds((current) => {
      const next = new Set(current);
      packageDocuments.forEach((item) => allSelected ? next.delete(item.id) : next.add(item.id));
      return next;
    });
    return (
      <div key={cardKey} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isCompleted ? 'border-emerald-300' : 'border-blue-200'}`}>
        <div className={`p-3.5 ${isCompleted ? 'bg-emerald-50/70' : 'bg-blue-50/70'} border-b ${isCompleted ? 'border-emerald-100' : 'border-blue-100'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><div className="flex items-center gap-1.5"><Layers className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`} /><span className={`text-[10px] font-black uppercase tracking-wider ${isCompleted ? 'text-emerald-800' : 'text-blue-800'}`}>Pacote de assinatura</span></div><h4 className="font-heading font-black text-sm text-[#071B3A] mt-1">{packageDocuments.length} documentos • {lead.client?.name || 'Cliente não vinculado'}</h4><p className="text-[10px] text-slate-500 mt-0.5">{kitName ? `${kitName} • ` : ''}Criado em {formattedDate}</p></div>
            <button onClick={togglePackage} className="text-slate-400 hover:text-blue-600 pt-0.5">{allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}</button>
          </div>
          <div className="mt-2 flex items-center justify-between"><div>{isCompleted ? (isPendingReview
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-extrabold text-[10px] border border-amber-200 font-heading"><Clock className="w-3 h-3" /> Aguardando revisão</span>
            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200 font-heading"><CheckCircle2 className="w-3 h-3" /> Aprovado</span>)
            : getStatusBadge(lead.status)}</div>{lead.client?.cpfCnpj && <span className="font-mono text-[9px] text-slate-500">{maskCpfCnpj(lead.client.cpfCnpj)}</span>}</div>
        </div>
        <div className="divide-y divide-slate-100">
          {packageDocuments.map((item, index) => <div key={item.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2"><div className="min-w-0 flex items-center gap-2"><span className="w-5 h-5 shrink-0 rounded-md bg-slate-100 text-slate-600 grid place-items-center text-[10px] font-black">{index + 1}</span><span className="truncate text-[11px] font-bold text-slate-700" title={item.title}>{shortTitle(item.title)}</span></div>{item.status === 'CONCLUIDO' && <a href={`/api/documents/${item.id}/download${item.updatedAt ? `?v=${encodeURIComponent(item.updatedAt)}` : ''}`} download title={`Baixar ${item.title}`} className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50"><Download className="w-3.5 h-3.5" /></a>}</div>)}
        </div>
        <div className="p-3 border-t border-slate-100 flex flex-wrap gap-2">
          <button onClick={() => setSelectedDoc(lead)} className="flex-1 py-2 bg-[#071B3A] hover:bg-[#0B1D3D] text-white rounded-xl text-[10px] font-extrabold">Abrir</button>
          {isPendingReview && canCorrect && (
            <>
              {isOfficeAdmin && <button
                type="button"
                onClick={() => handleApproveSignature(lead, 'approve-package')}
                disabled={redoingIds.has(lead.id)}
                title="Aprovar todo o pacote - confirma que as assinaturas estão corretas e remove o botão Refazer"
                className="px-3 py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 rounded-xl text-[10px] font-extrabold inline-flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" /> Aprovar
              </button>}
              <button
                type="button"
                onClick={() => handleRedoSignature(lead, 'redo-package')}
                disabled={redoingIds.has(lead.id)}
                title="Reabrir todo o pacote para uma nova tentativa de assinatura, mantendo o mesmo link"
                className="px-3 py-2 border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-50 rounded-xl text-[10px] font-extrabold inline-flex items-center gap-1"
              >
                {redoingIds.has(lead.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Refazer
              </button>
            </>
          )}
          {/* Ações raras ou destrutivas ficam no menu "⋯", longe do Aprovar -
              antes o "Excluir kit" vermelho ficava colado no botão de aprovar. */}
          {hasMenu && (
            <div className="relative">
              <button type="button" onClick={() => setOpenMenuKey(openMenuKey === cardKey ? null : cardKey)} title="Mais ações" className="h-full px-2.5 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"><MoreHorizontal className="w-4 h-4" /></button>
              {openMenuKey === cardKey && (
                <>
                  <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpenMenuKey(null)} />
                  <div className="absolute right-0 bottom-full mb-1 z-20 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-[11px] font-bold">
                    {canLinkProcess && lead.client && <Link href={`/processos?clienteId=${lead.client.id}&documentoIds=${packageDocuments.map((item) => item.id).join(',')}`} onClick={() => setOpenMenuKey(null)} className="block px-3 py-2 text-blue-700 hover:bg-blue-50">Vincular a processo</Link>}
                    <button type="button" onClick={() => { setOpenMenuKey(null); handleDeleteCompletedPackage(packageDocuments); }} disabled={deletingSelected} className="w-full text-left px-3 py-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50 inline-flex items-center gap-1.5">
                      <Trash2 className="w-3 h-3" /> Excluir kit
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {!isCompleted && lead.signers[0] && <button onClick={() => handleCopyLink(lead.signers[0].token)} className="px-3 py-2 border border-blue-200 text-blue-700 rounded-xl text-[10px] font-extrabold">Copiar link</button>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 font-sans pb-16">
      {/* Cabeçalho enxuto: o banner escuro ocupava uma faixa inteira sem informação útil. */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-black text-[#071B3A] tracking-tight">Documentos</h1>
          <p className="text-[11px] text-slate-500">Acompanhe as assinaturas, revise as evidências e aprove.</p>
        </div>
        <Link
          href="/documentos/novo"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md text-xs font-heading"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Novo Envio
        </Link>
      </div>

      {/* PAINEL DE CONTROLE E FILTROS COMPACTOS COM ORDENAÇÃO POR DATA */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Linha 1: Busca + Ordenação por Data + Dropdowns */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="w-full lg:w-80 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar documento, cliente ou CPF..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            {/* Seletor de Ordenação por Data */}
            <button
              onClick={() => setSortOrder(sortOrder === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 flex items-center gap-1.5 font-heading"
              title="Mudar ordenação da data"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              <span>{sortOrder === 'NEWEST' ? 'Mais Recentes Primeiro' : 'Mais Antigos Primeiro'}</span>
            </button>

            {/* Dropdown por Filtro de Período de Data */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-extrabold focus:outline-none font-heading"
            >
              <option value="ALL">🗓️ Todo o Período</option>
              <option value="TODAY">🗓️ Criados Hoje</option>
              <option value="WEEK">🗓️ Últimos 7 dias</option>
              <option value="MONTH">🗓️ Último Mês</option>
            </select>

            {/* Dropdown por Pastas de Cliente */}
            <select
              value={selectedClientFolder || ''}
              onChange={(e) => setSelectedClientFolder(e.target.value || null)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-extrabold focus:outline-none font-heading max-w-[200px] truncate"
            >
              <option value="">📂 Todas as Pastas ({documents.length})</option>
              {clientFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.count})
                </option>
              ))}
            </select>

            {/* Alternador de Visualização */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewFormat('KANBAN')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 font-heading ${
                  viewFormat === 'KANBAN' ? 'bg-[#071B3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>

              <button
                onClick={() => setViewFormat('TABLE')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 font-heading ${
                  viewFormat === 'TABLE' ? 'bg-[#071B3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabela</span>
              </button>
            </div>
          </div>
        </div>

        {/* Linha 2: filtros por estágio - só na visão Tabela; no Kanban as
            próprias colunas já fazem essa divisão. */}
        {viewFormat !== 'KANBAN' && <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'ALL' ? 'bg-[#071B3A] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({stats.total})
          </button>

          <button
            onClick={() => setCategoryFilter('CONCLUIDO')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'CONCLUIDO' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Concluídos ({stats.completed})
          </button>

          <button
            onClick={() => setCategoryFilter('EM_ANDAMENTO')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'EM_ANDAMENTO' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            Em Assinatura ({stats.inProgress})
          </button>

          <button
            onClick={() => setCategoryFilter('RASCUNHO')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'RASCUNHO' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Prontos / Rascunhos ({stats.draft})
          </button>
        </div>}
      </div>

      {/* ÁREA KANBAN DE ALTA DENSIDADE (ORGANIZADO E SEM EMBOLAR) */}
      {(selectedDocIds.size > 0 || viewFormat !== 'KANBAN') && <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={toggleSelectAllVisible} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold text-[#071B3A] bg-slate-50 border border-slate-200 hover:bg-slate-100">
          {filteredDocuments.length > 0 && filteredDocuments.every((doc) => selectedDocIds.has(doc.id)) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
          Selecionar todos os resultados ({filteredDocuments.length})
        </button>
        {selectedDocIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600">{selectedDocIds.size} selecionado(s)</span>
            <button type="button" onClick={() => setSelectedDocIds(new Set())} className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Limpar</button>
            {selectedCompletedKit && (
              <button
                type="button"
                onClick={() => handleDeleteCompletedPackage(selectedCompletedKit)}
                disabled={deletingSelected}
                className="inline-flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold"
              >
                {deletingSelected ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                Excluir este kit concluído
              </button>
            )}
            {selectedNonConcludedCount > 0 && (
              <button type="button" onClick={handleBulkDelete} disabled={deletingSelected} className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold">
                {deletingSelected ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir documentos não concluídos
              </button>
            )}
          </div>
        )}
      </div>}

      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-2">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto" />
          <p className="font-heading font-extrabold text-[#071B3A] text-xs">Carregando acervo...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 max-w-sm mx-auto my-4">
          <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-heading font-extrabold text-[#071B3A] text-sm">Nenhum documento localizado</p>
          <p className="text-xs text-slate-500">Tente ajustar o filtro de busca ou período de data acima.</p>
        </div>
      ) : viewFormat === 'KANBAN' ? (
        (() => {
          // Colunas na ordem do fluxo: cliente assinando → sua revisão →
          // aprovados. "Concluído" deixou de misturar o que ainda precisa da
          // sua revisão com o que já foi aprovado. Os contadores contam
          // envios (cards), não documentos soltos.
          const completedPackages = groupPackages(kanbanColumns.completed);
          const columns = [
            { key: 'progress', title: 'Em assinatura', hint: 'Aguardando o cliente', icon: <Clock className="w-3.5 h-3.5 text-amber-600" />, border: 'border-amber-200', text: 'text-amber-900', hintText: 'text-amber-700', items: groupPackages(kanbanColumns.inProgress), empty: 'Ninguém assinando agora' },
            { key: 'review', title: 'Aguardando sua revisão', hint: 'Aprovar ou refazer', icon: <Eye className="w-3.5 h-3.5 text-blue-600" />, border: 'border-blue-200', text: 'text-blue-900', hintText: 'text-blue-700', items: completedPackages.filter((items) => items.some((item) => item.reviewStatus !== 'APROVADO')), empty: 'Nada para revisar' },
            { key: 'approved', title: 'Aprovados', hint: 'Finalizados', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />, border: 'border-emerald-200', text: 'text-emerald-900', hintText: 'text-emerald-700', items: completedPackages.filter((items) => items.every((item) => item.reviewStatus === 'APROVADO')), empty: 'Nenhum aprovado neste filtro' },
          ];
          const draftPackages = groupPackages(kanbanColumns.drafts);
          if (draftPackages.length) columns.push({ key: 'drafts', title: 'Não enviados / encerrados', hint: 'Prontos, cancelados, expirados', icon: <FileCheck2 className="w-3.5 h-3.5 text-slate-600" />, border: 'border-slate-200', text: 'text-slate-800', hintText: 'text-slate-500', items: draftPackages, empty: '' });
          return (
            // Colunas sempre com a mesma largura: estreitar a coluna vazia fazia
            // a tela "pular" de tamanho sempre que um envio mudava de coluna.
            <div className={`grid grid-cols-1 ${columns.length === 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'} gap-4 items-start`}>
              {columns.map((column) => (
                <div key={column.key} className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200 space-y-3 min-w-0">
                  <div className={`p-2.5 bg-white border ${column.border} rounded-xl flex items-center justify-between gap-2 shadow-2xs`}>
                    <span className={`font-heading font-black text-xs ${column.text} flex items-center gap-1.5 uppercase whitespace-nowrap`}>
                      {column.icon} {column.title} ({column.items.length})
                    </span>
                    <span className={`hidden 2xl:inline text-[10px] ${column.hintText} font-bold text-right truncate`}>{column.hint}</span>
                  </div>
                  <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-0.5">
                    {column.items.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium bg-white/40">{column.empty}</div>
                    ) : (
                      column.items.map((items) => renderPackageCard(items))
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      ) : (
        /* VISÃO TABELA */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 font-heading">
                <tr>
                  <th className="px-5 py-3"><button type="button" onClick={toggleSelectAllVisible} title="Selecionar todos"><CheckSquare className="w-4 h-4" /></button></th>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Título do Documento</th>
                  <th className="px-5 py-3">Cliente / CPF</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3"><button type="button" onClick={() => toggleSelectDoc(doc.id)}>{selectedDocIds.has(doc.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}</button></td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3 font-extrabold text-slate-900 font-heading">{doc.title}</td>
                    <td className="px-5 py-3 text-slate-600">{doc.client?.name || 'Avulso'}</td>
                    <td className="px-5 py-3">{getStatusBadge(doc.status)}</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="px-3 py-1 bg-[#071B3A] text-white font-extrabold rounded-lg text-xs"
                      >
                        Dossiê
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        title="Excluir Documento"
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 inline-flex items-center align-middle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && nextCursor && (
        <div className="flex justify-center">
          <button type="button" onClick={loadMoreDocuments} disabled={loadingMore} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-[#071B3A] hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-2">
            {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Carregar envios mais antigos
          </button>
        </div>
      )}

      {/* Slide-over / Modal: Dossiê Jurídico & Evidências */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-8 overflow-y-auto max-h-[90vh] space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase font-heading border border-blue-200">
                  {selectedPackageDocuments.length > 1 ? 'PACOTE DE ASSINATURA' : selectedDoc.documentType || 'DOCUMENTO'}
                </span>
                <h2 className="font-heading text-lg font-black text-[#071B3A] mt-1">{selectedPackageDocuments.length > 1 ? `${selectedPackageDocuments.length} documentos de ${selectedDoc.client?.name || 'cliente'}` : selectedDoc.title}</h2>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {selectedPackageDocuments.some((item) => item.status === 'CONCLUIDO' || item.status === 'PARCIALMENTE_ASSINADO') && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                  <p className="text-xs font-extrabold text-emerald-900">{selectedPackageDocuments.length > 1 ? 'Documentos do pacote' : 'Documento'}{dossierKitName ? <span className="font-bold text-emerald-700"> • {dossierKitName}</span> : null}</p>
                  {selectedPackageDocuments.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 bg-white rounded-xl border border-emerald-100 px-3 py-2">
                      <span className="text-xs font-bold text-slate-700 truncate" title={item.title}>{dossierShortTitle(item.title)}</span>
                      <div className="shrink-0 flex items-center gap-2">
                        {item.status === 'CONCLUIDO' && item.reviewStatus === 'APROVADO' && (
                          <span title="Revisado e aprovado" className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Aprovado</span>
                        )}
                        {(item.status === 'CONCLUIDO' || item.status === 'PARCIALMENTE_ASSINADO') && <a href={`/api/documents/${item.id}/download${item.updatedAt ? `?v=${encodeURIComponent(item.updatedAt)}` : ''}`} download className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700"><Download className="w-3.5 h-3.5" /> Baixar PDF</a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedPackageDocuments.length > 1 && selectedDoc.status === 'CONCLUIDO' && selectedPackageDocuments.some((item) => item.status !== 'CONCLUIDO') && (
                <button onClick={() => handleSyncPackageSignature(selectedDoc)} className="w-full py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-extrabold">
                  Concluir os documentos restantes deste pacote
                </button>
              )}

              {canCorrect && selectedDoc.status === 'CONCLUIDO' && selectedDoc.reviewStatus === 'APROVADO' && (
                <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-extrabold text-emerald-800">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Assinatura revisada e aprovada
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestartApproved(selectedDoc, 'restart-document')}
                    disabled={redoingIds.has(selectedDoc.id)}
                    title="Cria outro envio com novos links e preserva este documento aprovado"
                    className="mx-auto mt-1.5 block text-[10px] font-bold text-emerald-700 underline decoration-dotted hover:text-emerald-900 disabled:opacity-50"
                  >
                    Refazer documento completo em novo envio
                  </button>                  {selectedPackageDocuments.length > 1 && <button type="button" disabled={redoingIds.has(selectedDoc.id)} onClick={() => handleRestartApproved(selectedDoc, 'restart-package')} className="mx-auto mt-2 block text-[10px] font-bold underline disabled:opacity-50">Refazer kit completo em novo envio</button>}
                </div>
              )}

              {canCorrect && selectedDoc.status === 'CONCLUIDO' && selectedDoc.reviewStatus !== 'APROVADO' && (
                <div className="flex gap-2">
                  {isOfficeAdmin && <button
                    type="button"
                    onClick={() => handleApproveSignature(selectedDoc, selectedPackageDocuments.length > 1 ? 'approve-package' : 'approve-document')}
                    disabled={redoingIds.has(selectedDoc.id)}
                    className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {selectedPackageDocuments.length > 1 ? 'Aprovar pacote' : 'Aprovar assinatura'}
                  </button>}
                  <button
                    type="button"
                    onClick={() => handleRedoSignature(selectedDoc, selectedPackageDocuments.length > 1 ? 'redo-package' : 'redo-document')}
                    disabled={redoingIds.has(selectedDoc.id)}
                    title="Reabre a assinatura inteira, mantendo o mesmo link. Para só uma foto, use Refazer Frente/Verso/Selfie abaixo."
                    className="flex-1 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {redoingIds.has(selectedDoc.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    {selectedPackageDocuments.length > 1 ? 'Refazer pacote' : 'Refazer assinatura'}
                  </button>
                </div>
              )}

              {/* Erro no TEXTO do documento (vírgula, endereço, qualificação):
                  refazer foto/assinatura reaproveita o mesmo texto antigo, então o
                  erro nunca some. Aqui o escritório corrige o cadastro e gera um
                  envio novo pelo fluxo normal do kit, com o texto montado de novo
                  e nova assinatura do cliente (a assinatura só vale para o texto
                  que ele viu). */}
              {canCorrect && selectedDoc.kitId && selectedDoc.client?.id && !['CANCELADO', 'EXPIRADO'].includes(selectedDoc.status) && (
                <Link
                  href={`/kits/enviar?clientId=${encodeURIComponent(selectedDoc.client.id)}&kitId=${encodeURIComponent(selectedDoc.kitId)}`}
                  title="Gera o documento de novo com os dados atuais do cadastro e envia um novo link para assinatura"
                  className="mt-2 w-full py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-slate-50"
                >
                  <FileText className="w-4 h-4" />
                  Corrigir texto e reenviar para assinatura
                </Link>
              )}

              <div>
                <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider font-heading">Acompanhamento dos participantes</h3><span className="text-[10px] font-bold text-slate-500">{selectedDoc.signers.filter((s) => s.status === 'ASSINADO').length}/{selectedDoc.signers.length} concluídos</span></div>
                <p className="mb-2 text-[11px] text-slate-500">Acompanhe se cada pessoa abriu o link e reenvie-o sem precisar copiar manualmente.</p>
                <div className="space-y-2">
                  {selectedDoc.signers.map((s) => (
                    <div key={s.id} className={`p-3 rounded-xl border text-xs ${getPendingRedoField(s) ? 'bg-amber-50/40 border-amber-200' : s.status === 'ASSINADO' ? 'bg-emerald-50/40 border-emerald-200' : s.status === 'EM_ANDAMENTO' ? 'bg-amber-50/40 border-amber-200' : s.status === 'VISUALIZADO' ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50 border-slate-200/80'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><div className="font-extrabold text-slate-900 truncate">{s.name}</div><div className="mt-1 flex flex-wrap gap-1.5 items-center"><span className="text-slate-500 text-[10px]">{signerRoleLabel(s.role)}</span>{signerProgress(s)}{s.signingMode === 'SAME_DEVICE' && <span className="text-[10px] font-bold text-violet-700">Mesmo celular</span>}</div>{(s.status === 'EM_ANDAMENTO' || getPendingRedoField(s)) && <div className="text-amber-700 text-[10px] font-bold mt-0.5 capitalize">{signerProgressDetail(s)}</div>}<div className="text-slate-400 font-mono text-[10px] mt-1">CPF: {maskCpfCnpj(s.cpf)}</div>
                          {/* "Pedir para refazer" por foto - disponível para qualquer
                              signatário (Cliente Titular, Assinante a Rogo, testemunhas)
                              que já tenha essa foto capturada. Cada signatário sempre tem
                              seu próprio link/token (mesmo o Assinante a Rogo capturado no
                              mesmo celular do titular na assinatura original) - ao pedir
                              para refazer, envie o link individual DELE (botão "Copiar
                              link"/"Enviar" acima) para a pessoa retomar direto na foto
                              pedida, sem precisar do celular do titular de novo. */}
                          {canCorrect && !(selectedDoc.status === 'CONCLUIDO' && selectedDoc.reviewStatus === 'APROVADO') && !['CANCELADO', 'EXPIRADO'].includes(selectedDoc.status) && (s.documentFrontImage || s.documentBackImage || s.selfieCenterImage) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {([
                                ['documentFrontImage', 'Frente'],
                                ['documentBackImage', 'Verso'],
                                ['selfieCenterImage', 'Selfie'],
                              ] as const).map(([field, label]) => s[field] && (
                                <div key={field} className="flex flex-col items-center gap-1 w-[76px]">
                                  {/* Miniatura: clique para ver grande e decidir se precisa refazer. */}
                                  {dossierPhotos[s.id]?.[field] ? (
                                    <button type="button" onClick={() => setPhotoPreview({ src: dossierPhotos[s.id]![field]!, label: `${label} - ${s.name}` })} title={`Ver ${REDOABLE_FIELD_LABELS[field]}`} className="block w-[76px] h-[56px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-blue-300">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={dossierPhotos[s.id]![field]!} alt={label} className="w-full h-full object-cover" />
                                    </button>
                                  ) : (
                                    <div className="w-[76px] h-[56px] rounded-lg border border-dashed border-slate-200 bg-slate-50 grid place-items-center text-[9px] text-slate-400">{label}</div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRequestPhotoRedo(selectedDoc, s, field)}
                                    disabled={redoingPhotoIds.has(`${s.id}:${field}`)}
                                    title={`Pedir para refazer a foto: ${REDOABLE_FIELD_LABELS[field]}`}
                                    className="w-full inline-flex items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-600 hover:border-amber-300 hover:text-amber-700 disabled:opacity-50"
                                  >
                                    {redoingPhotoIds.has(`${s.id}:${field}`) ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RotateCcw className="w-2.5 h-2.5" />} Refazer {label}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Mesmo já ASSINADO, mantém o botão de copiar link/WhatsApp
                            disponível - é como o escritório envia o link individual
                            do signatário de volta para ele depois de pedir para
                            refazer uma foto (o link é o mesmo, só retoma direto na
                            etapa da foto pedida em vez de reiniciar tudo). */}
                        <div className="flex items-center gap-1 shrink-0"><button disabled={!participantLinkToken(selectedDoc, s)} onClick={() => handleCopyLink(participantLinkToken(selectedDoc, s))} title="Copiar link da participação" className="p-2 rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50">{copiedToken === s.token ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button><button disabled={!participantLinkToken(selectedDoc, s)} onClick={() => handleOpenWhatsApp(selectedDoc.title, s.name, participantLinkToken(selectedDoc, s))} title="Enviar pelo WhatsApp" className="px-2.5 py-2 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg border border-emerald-200 flex items-center gap-1 text-[10px]"><MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Enviar</button></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações raras e destrutivas ficam recolhidas em "Mais opções",
                  longe do Aprovar: aprovar/refazer um documento isolado do
                  pacote e excluir. */}
              {((canCorrect && selectedPackageDocuments.length > 1 && selectedPackageDocuments.some((item) => item.status === 'CONCLUIDO' && item.reviewStatus !== 'APROVADO')) || (isOfficeAdmin && !(selectedDoc.status === 'CONCLUIDO' && selectedDoc.reviewStatus === 'APROVADO'))) && (
                <details className="pt-3 border-t border-slate-100 group">
                  <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-500 hover:text-slate-800"><MoreHorizontal className="w-4 h-4" /> Mais opções</summary>
                  <div className="mt-2 space-y-2">
                    {canCorrect && selectedPackageDocuments.length > 1 && selectedPackageDocuments.filter((item) => item.status === 'CONCLUIDO' && item.reviewStatus !== 'APROVADO').map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                        <span className="text-[11px] font-bold text-slate-700 truncate">{dossierShortTitle(item.title)}</span>
                        <div className="shrink-0 flex items-center gap-3">
                          {isOfficeAdmin && <button type="button" onClick={() => handleApproveSignature(item, 'approve-document')} disabled={redoingIds.has(item.id)} title="Aprovar só este documento" className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 disabled:opacity-50"><CheckCircle2 className="w-3.5 h-3.5" /> Aprovar só este</button>}
                          <button type="button" onClick={() => handleRedoSignature(item, 'redo-document')} disabled={redoingIds.has(item.id)} title="Refazer a assinatura somente deste documento" className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 disabled:opacity-50">{redoingIds.has(item.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Refazer só este</button>
                        </div>
                      </div>
                    ))}
                    {isOfficeAdmin && !(selectedDoc.status === 'CONCLUIDO' && selectedDoc.reviewStatus === 'APROVADO') && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const target = selectedDoc;
                            const members = selectedPackageDocuments;
                            setSelectedDoc(null);
                            if (members.length > 1 && members.every((item) => item.status === 'CONCLUIDO')) handleDeleteCompletedPackage(members);
                            else handleDelete(target);
                          }}
                          className="px-3 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 font-extrabold rounded-xl text-[11px] flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {selectedPackageDocuments.length > 1 && selectedPackageDocuments.every((item) => item.status === 'CONCLUIDO') ? 'Excluir pacote' : 'Excluir este documento'}
                        </button>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {photoPreview && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setPhotoPreview(null)}>
          <div className="max-w-3xl w-full space-y-2" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between text-white text-xs font-bold"><span>{photoPreview.label}</span><button type="button" onClick={() => setPhotoPreview(null)} className="text-lg">✕</button></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview.src} alt={photoPreview.label} className="w-full max-h-[80vh] object-contain rounded-xl bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}
