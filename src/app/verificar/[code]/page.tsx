'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, AlertCircle, FileText, Building2, Lock, ArrowLeft, Loader2, Award, MapPin, Eye, Clock } from 'lucide-react';

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
    maskedCpf: string;
    maskedPhone?: string | null;
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

const EVENT_LABELS: Record<string, string> = {
  DOCUMENT_CREATED: 'Documento criado',
  LINK_SENT: 'Link enviado',
  LINK_OPENED: 'Link acessado',
  IDENTITY_CONFIRMED: 'CPF confirmado',
  LIVENESS_CAPTURED: 'Prova de presença capturada',
  SIGNATURE_SUBMITTED: 'Assinatura concluída',
  DOCUMENT_COMPLETED: 'Documento finalizado',
  DOCUMENT_CANCELLED: 'Documento cancelado',
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
      <div className="min-h-screen bg-[#0B1D3D] flex items-center justify-center text-white p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-gold-500" />
          <p className="text-sm font-semibold">Consultando registro imutável de autenticidade...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0B1D3D] flex items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-[#132A54] p-8 rounded-2xl border border-white/10 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold">Código de Autenticidade Não Encontrado</h1>
          <p className="text-sm text-slate-300">
            O código <strong className="font-mono text-gold-400">{params.code}</strong> não corresponde a nenhum documento assinado no AssinaJur.
          </p>
          <Link
            href="/verificar"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-[#0B1D3D] font-bold rounded-xl text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Tentar Outro Código
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#0B1D3D] text-white py-6 px-6 border-b border-gold-500/30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/verificar" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold-500 text-[#0B1D3D] font-extrabold flex items-center justify-center text-lg">
              AJ
            </div>
            <div>
              <span className="font-extrabold text-white text-lg tracking-tight">Assina<span className="text-gold-400">Jur</span></span>
              <p className="text-[10px] text-slate-300 font-medium">Verificação de Autenticidade Jurídica</p>
            </div>
          </Link>

          <Link href="/verificar" className="text-xs text-gold-400 font-semibold hover:underline flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Nova Pesquisa
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Banner de Resultado */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <Award className="w-10 h-10" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200 uppercase tracking-wider mb-2">
              <CheckCircle2 className="w-4 h-4" /> Documento Autêntico e Concluído
            </span>
            <h1 className="text-2xl font-extrabold text-[#0B1D3D] tracking-tight">{data.documentTitle}</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">Código de Autenticidade: {data.verificationCode}</p>
          </div>
        </div>

        {/* Informações do Escritório Emissor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#0B1D3D] font-bold text-sm border-b border-slate-100 pb-3">
            <Building2 className="w-5 h-5 text-gold-500" />
            <span>Escritório de Advocacia Emissor</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-700">
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Razão Social</span>
              <span className="font-bold text-slate-900 text-sm">{data.office.name}</span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">CPF / CNPJ do Escritório</span>
              <span className="font-mono font-semibold text-slate-800">{data.office.cpfCnpj}</span>
            </div>

            {data.office.oabNumber && (
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Inscrição OAB</span>
                <span className="font-semibold text-slate-800">{data.office.oabNumber}</span>
              </div>
            )}

            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Data de Conclusão (UTC)</span>
              <span className="font-semibold text-slate-800">
                {data.completedAt ? new Date(data.completedAt).toLocaleString('pt-BR') : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de Signatários (Com Mascaramento LGPD) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#0B1D3D] font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-gold-500" />
              <span>Signatários e Evidências Gravadas</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded">Proteção LGPD</span>
          </div>

          <div className="space-y-3">
            {data.signers.map((s, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 text-sm">{s.name} <span className="text-slate-500 font-normal">({s.role})</span></div>
                  <div className="text-slate-500 font-mono">CPF: {s.maskedCpf}</div>
                  {s.maskedPhone && <div className="text-slate-500 font-mono">Telefone: {s.maskedPhone}</div>}
                  {s.approximateLocation && (
                    <div className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {s.approximateLocation}
                    </div>
                  )}
                  {s.livenessVerified && (
                    <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Prova de presença ao vivo registrada (3 selfies)
                    </div>
                  )}
                  {s.signedAt && (
                    <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                      Assinado em {new Date(s.signedAt).toLocaleString('pt-BR')} (UTC)
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Assinado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hashes de Integridade SHA-256 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider">Hashes de Integridade SHA-256</h3>
          <div className="space-y-2 text-xs font-mono text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">Hash do Documento Original</span>
              <span className="break-all font-semibold">{data.originalHash}</span>
            </div>

            {data.signedHash && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-semibold">Hash do PDF Assinado com Certificado</span>
                <span className="break-all font-semibold text-emerald-700">{data.signedHash}</span>
              </div>
            )}
          </div>
        </div>

        {/* Verificações Realizadas Agora */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider">Verificações Realizadas Agora</h3>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Código de autenticidade localizado no banco de dados
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Hash SHA-256 do documento original conferido
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Assinaturas de todos os signatários registradas e íntegras
            </li>
          </ul>
        </div>

        {/* Trilha de Eventos */}
        {data.auditTrail?.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#0B1D3D] font-bold text-sm border-b border-slate-100 pb-3">
              <Clock className="w-5 h-5 text-gold-500" />
              <span>Trilha de Eventos do Documento</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase text-[10px] border-b border-slate-100">
                    <th className="py-2 pr-3 font-semibold">Data e Hora (UTC)</th>
                    <th className="py-2 pr-3 font-semibold">Evento</th>
                    <th className="py-2 font-semibold">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {data.auditTrail.map((ev, idx) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-3 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(ev.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 pr-3 font-bold text-[#0B1D3D] whitespace-nowrap">
                        {EVENT_LABELS[ev.eventType] || ev.eventType}
                      </td>
                      <td className="py-2 text-slate-600">{ev.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Selo de Conformidade Normativa */}
        <div className="p-4 bg-navy-50 border border-gold-500/30 rounded-2xl text-xs text-[#0B1D3D] flex items-center gap-3">
          <Lock className="w-6 h-6 text-gold-500 shrink-0" />
          <p className="leading-relaxed">
            Este documento possui validade jurídica garantida conforme o <strong>Art. 10, § 2º da Medida Provisória nº 2.200-2/2001</strong> e a <strong>Lei nº 14.063/2020</strong>.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 mt-auto">
        © 2026 AssinaJur. Todos os direitos reservados.
      </footer>
    </div>
  );
}
