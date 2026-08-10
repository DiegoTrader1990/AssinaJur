'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Lock,
  ArrowLeft,
  Loader2,
  Award,
  MapPin,
  Eye,
  Clock,
  XCircle,
  AlertTriangle,
  Scale,
  Download
} from 'lucide-react';
import { formatBrasiliaDateTime } from '@/lib/dateUtils';
import { maskCpfCnpj, maskPhone } from '@/lib/formatters';

interface VerificationResult {
  valid: boolean;
  verificationCode: string;
  status: string;
  documentTitle: string;
  documentType: string;
  createdAt: string;
  completedAt?: string;
  originalHash: string;
  signedHash?: string;
  office: {
    name: string;
    tradeName?: string;
    cpfCnpj: string;
    oabNumber?: string;
  };
  signers: Array<{
    name: string;
    role: string;
    cpf: string;
    phone?: string | null;
    status: string;
    signedAt?: string;
    signatureType?: string;
    livenessVerified?: boolean;
    approximateLocation?: string | null;
  }>;
  auditTrail: Array<{
    eventType: string;
    description: string;
    createdAt: string;
  }>;
}

const PUBLIC_EVENT_LABELS: Record<string, string> = {
  ROGO_FLOW_CONFIGURED: 'Fluxo a rogo configurado',
  ROGO_CONSENT_RECORDED: 'Ciência e autorização do cliente',
  SIGNATURE_ORDER_ENFORCED: 'Ordem de assinatura protegida',
  DOCUMENT_CREATED: 'Documento criado',
  LINK_SENT: 'Link enviado',
  LINK_OPENED: 'Link acessado',
  IDENTITY_CONFIRMED: 'CPF confirmado pelo signatário',
  LIVENESS_CAPTURED: 'Prova de presença concluída (3 selfies verticais)',
  SIGNATURE_SUBMITTED: 'Assinatura eletrônica concluída',
  DOCUMENT_COMPLETED: 'Documento finalizado e certificado emitido',
  DOCUMENT_CANCELLED: 'Documento cancelado',
};

const SIGNER_ROLE_LABELS: Record<string, string> = {
  CLIENTE: 'Cliente / Outorgante',
  ASSINANTE_A_ROGO: 'Assinante a Rogo',
  TESTEMUNHA: 'Testemunha',
  ADVOGADO: 'Advogado',
};

export default function VerificationResultPage({ params }: { params: { code: string } }) {
  const [data, setData] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [params.code]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/verify/${params.code}`);
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.error || 'Código de verificação não encontrado.');
      }

      setData(payload);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#071B3A] flex items-center justify-center text-white p-6 font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
          <p className="text-sm font-semibold text-slate-300 font-heading">Consultando registro imutável de autenticidade...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center text-slate-800 p-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="font-heading text-xl font-extrabold text-[#071B3A]">Código Não Encontrado</h1>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            O código <strong className="font-mono text-blue-600">{params.code}</strong> não corresponde a nenhum documento assinado no AssinaJur.
          </p>
          <Link
            href="/verificar"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-bold rounded-xl text-xs transition-colors shadow-md"
          >
            <ArrowLeft className="w-4 h-4" /> Tentar Outro Código
          </Link>
        </div>
      </div>
    );
  }

  const renderStatusBanner = () => {
    switch (data.status) {
      case 'CONCLUIDO':
        return (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Award className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200 uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4" /> Documento Autêntico e Concluído
              </span>
              <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">{data.documentTitle}</h1>
              <p className="text-xs text-slate-500 font-mono mt-1">Código de Autenticidade: {data.verificationCode}</p>
            </div>
          </div>
        );

      case 'PARCIALMENTE_ASSINADO':
      case 'ENVIADO':
      case 'VISUALIZADO':
      case 'PENDENTE':
        return (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-amber-200/80 shadow-md text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Clock className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-amber-50 text-amber-700 font-extrabold text-xs border border-amber-200 uppercase tracking-wider mb-2">
                <Clock className="w-4 h-4" /> Documento em Processo de Assinatura
              </span>
              <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">{data.documentTitle}</h1>
              <p className="text-xs text-slate-500 font-mono mt-1">Código de Autenticidade: {data.verificationCode}</p>
            </div>
          </div>
        );

      case 'CANCELADO':
        return (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-red-200/80 shadow-md text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-red-50 text-red-700 font-extrabold text-xs border border-red-200 uppercase tracking-wider mb-2">
                <XCircle className="w-4 h-4" /> Documento Cancelado pelo Escritório
              </span>
              <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">{data.documentTitle}</h1>
              <p className="text-xs text-slate-500 font-mono mt-1">Código: {data.verificationCode}</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md text-center space-y-4">
            <h1 className="font-heading text-xl font-extrabold text-[#071B3A]">{data.documentTitle}</h1>
            <p className="text-xs text-slate-500 font-mono">Código: {data.verificationCode}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#071B3A] text-white py-5 px-6 border-b border-white/10 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/verificar" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-[#071B3A] font-heading font-extrabold flex items-center justify-center text-lg shadow-sm">
              AJ
            </div>
            <div>
              <span className="font-heading font-extrabold text-white text-lg tracking-tight block leading-none">
                Assina<span className="text-blue-400">Jur</span>
              </span>
              <p className="text-[10px] text-slate-300 font-medium mt-0.5">Portal de Verificação de Autenticidade</p>
            </div>
          </Link>

          <Link href="/verificar" className="text-xs text-blue-300 font-semibold hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Nova Pesquisa
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {renderStatusBanner()}

        {/* Informações do Escritório Emissor */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#071B3A] font-extrabold text-sm border-b border-slate-100 pb-3 font-heading">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Escritório de Advocacia Responsável</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-700">
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Razão Social</span>
              <span className="font-extrabold text-slate-900 text-sm">{data.office.name}</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">CPF / CNPJ do Escritório</span>
              <span className="font-mono font-bold text-slate-800">{maskCpfCnpj(data.office.cpfCnpj)}</span>
            </div>

            {data.office.oabNumber && (
              <div>
                <span className="text-slate-400 font-bold block uppercase text-[10px]">Inscrição OAB</span>
                <span className="font-bold text-slate-800">{data.office.oabNumber}</span>
              </div>
            )}

            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Data de Conclusão</span>
              <span className="font-bold text-slate-800">
                {formatBrasiliaDateTime(data.completedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Signatários e Evidências Gravadas */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#071B3A] font-extrabold text-sm font-heading">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>Signatários e Evidências Gravadas</span>
            </div>
            <span className="text-[10px] text-blue-800 font-extrabold bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              MP 2.200-2 / Lei 14.063
            </span>
          </div>

          <div className="space-y-3">
            {data.signers.map((s, idx) => (
              <div key={idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-extrabold text-slate-900 text-sm">
                    {s.name} <span className="text-slate-500 font-medium">({SIGNER_ROLE_LABELS[s.role] || s.role.replace(/_/g, ' ')})</span>
                  </div>
                  <div className="text-slate-700 font-mono">CPF: <strong className="text-slate-900">{maskCpfCnpj(s.cpf)}</strong></div>
                  {s.phone && <div className="text-slate-700 font-mono">Telefone: <strong className="text-slate-900">{maskPhone(s.phone)}</strong></div>}
                  {s.approximateLocation && (
                    <div className="text-slate-600 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" /> {s.approximateLocation}
                    </div>
                  )}
                  {s.livenessVerified && (
                    <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-600" /> Prova de presença ao vivo registrada (3 selfies verticais)
                    </div>
                  )}
                  {s.signedAt && (
                    <div className="text-[11px] text-slate-600 font-semibold mt-1">
                      Assinado em: {formatBrasiliaDateTime(s.signedAt)}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {s.status === 'ASSINADO' ? (
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Assinado
                    </span>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 font-extrabold text-xs border border-amber-200 inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Pendente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hashes de Integridade SHA-256 Completo */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <h3 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider font-heading">
            Registro de Integridade SHA-256 (64 caracteres)
          </h3>
          <div className="space-y-3 text-xs font-mono text-slate-800 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold mb-1">Hash do Documento Original</span>
              <span className="break-all font-bold text-slate-900 block">{data.originalHash}</span>
            </div>

            {data.signedHash && (
              <div className="pt-3 border-t border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold mb-1">Hash do PDF Assinado com Certificado</span>
                <span className="break-all font-bold text-emerald-700 block">{data.signedHash}</span>
              </div>
            )}
          </div>
        </div>

        {/* Trilha de Eventos Pública */}
        {data.auditTrail?.length > 0 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#071B3A] font-extrabold text-sm border-b border-slate-100 pb-3 font-heading">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Trilha Pública de Eventos do Documento</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase text-[10px] border-b border-slate-100 font-bold">
                    <th className="py-2 pr-3 font-bold">Data e Hora (BRT)</th>
                    <th className="py-2 pr-3 font-bold">Evento</th>
                    <th className="py-2 font-bold">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.auditTrail.map((ev, idx) => (
                    <tr key={idx}>
                      <td className="py-3 pr-3 font-mono text-slate-600 font-medium whitespace-nowrap">
                        {formatBrasiliaDateTime(ev.createdAt, false)}
                      </td>
                      <td className="py-3 pr-3 font-bold text-[#071B3A] whitespace-nowrap">
                        {PUBLIC_EVENT_LABELS[ev.eventType] || ev.eventType}
                      </td>
                      <td className="py-3 text-slate-600 font-medium">{ev.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Selo de Conformidade */}
        <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-3xl text-xs text-[#071B3A] flex items-center gap-3 shadow-xs">
          <Lock className="w-6 h-6 text-blue-600 shrink-0" />
          <p className="leading-relaxed font-medium">
            Este registro de autenticidade possui validade jurídica respaldada pelo <strong>Art. 10, § 2º da Medida Provisória nº 2.200-2/2001</strong> e pela <strong>Lei nº 14.063/2020</strong>.
          </p>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200 mt-auto">
        © 2026 AssinaJur. Todos os direitos reservados.
      </footer>
    </div>
  );
}
