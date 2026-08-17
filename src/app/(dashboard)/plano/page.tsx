'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Users, FileCheck2, ArrowUpRight, Loader2 } from 'lucide-react';

interface PlanInfo {
  plan: string;
  planStatus: string;
  monthlyDocLimit: number;
  additionalCredits: number;
  totalAllowed: number;
  monthDocsCount: number;
  percentageUsed: number;
  maxUsersLimit: number;
  activeUsersCount: number;
}

export default function PlanPage() {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/office/plan')
      .then((res) => res.json())
      .then((data) => setPlanInfo(data))
      .catch((err) => console.error('Erro ao buscar dados do plano:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
        Carregando dados da assinatura...
      </div>
    );
  }

  if (!planInfo) return null;
  const planDisplayName = planInfo.plan === 'SOLO' ? 'Essencial' : planInfo.plan === 'PROFISSIONAL' ? 'Profissional' : planInfo.plan === 'ESCRITORIO' ? 'Escritório' : planInfo.plan;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0B1D3D] tracking-tight">Plano e Consumo da Assinatura</h1>
        <p className="text-sm text-slate-500 mt-1">Acompanhe seu consumo mensal de documentos e o limite de usuários do seu escritório.</p>
      </div>

      {/* Cards de Consumo Real */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Consumo de Documentos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#0B1D3D] font-bold text-sm">
              <FileCheck2 className="w-5 h-5 text-gold-500" />
              <span>Consumo Mensal de Documentos</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-gold-100 text-[#0B1D3D] font-extrabold text-xs">
              Plano {planDisplayName}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-extrabold text-[#0B1D3D]">
              <span>{planInfo.monthDocsCount} emitidos</span>
              <span>Limite: {planInfo.totalAllowed} docs/mês</span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  planInfo.percentageUsed > 85 ? 'bg-red-500' : 'bg-gold-500'
                }`}
                style={{ width: `${planInfo.percentageUsed}%` }}
              />
            </div>

            <p className="text-xs text-slate-500">
              Você utilizou <strong>{planInfo.percentageUsed}%</strong> da sua cota mensal.
              {planInfo.additionalCredits > 0 && ` (Inclui ${planInfo.additionalCredits} créditos adicionais)`}
            </p>
          </div>
        </div>

        {/* Limite de Usuários */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#0B1D3D] font-bold text-sm">
              <Users className="w-5 h-5 text-gold-500" />
              <span>Membros da Equipe</span>
            </div>
            {planInfo.activeUsersCount > planInfo.maxUsersLimit ? (
              <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold text-xs">
                Limite excedido
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                Ativo
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-extrabold text-[#0B1D3D]">
              <span>{planInfo.activeUsersCount} usuários ativos</span>
              <span>Limite: {planInfo.maxUsersLimit} membros</span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${planInfo.activeUsersCount > planInfo.maxUsersLimit ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min((planInfo.activeUsersCount / planInfo.maxUsersLimit) * 100, 100)}%` }}
              />
            </div>

            {planInfo.activeUsersCount > planInfo.maxUsersLimit ? (
              // Hoje o cadastro não bloqueia quem passa do limite do plano contratado —
              // este aviso é o que faz o escritório perceber e regularizar (removendo
              // membros ou fazendo upgrade), em vez da barra aparecer verde e cheia como
              // se estivesse tudo certo mesmo estourando a cota.
              <p className="text-xs font-bold text-red-600">
                Sua equipe tem {planInfo.activeUsersCount - planInfo.maxUsersLimit} usuário(s) a mais do que o plano permite. Remova membros da equipe ou faça upgrade de plano para regularizar.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Sua equipe possui vaga para mais {Math.max(planInfo.maxUsersLimit - planInfo.activeUsersCount, 0)} advogado(s).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Comparação dos Planos */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-xl font-extrabold text-[#0B1D3D]">Opções de Upgrade do AssinaJur</h2>
          <p className="text-xs text-slate-500">
            Cresça seu escritório sem restrições. Altere seu plano a qualquer momento.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 pt-4">
          {/* Essencial */}
          <div className={`p-6 rounded-2xl border ${planInfo.plan === 'SOLO' ? 'border-gold-500 bg-gold-50/20 shadow-md' : 'border-slate-200'} space-y-4 flex flex-col justify-between`}>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Plano Essencial</span>
              <div className="text-2xl font-extrabold text-[#0B1D3D] mt-1">R$ 39,90<span className="text-xs text-slate-500 font-normal">/mês</span></div>
              <ul className="space-y-2 text-xs text-slate-600 mt-4">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1 Usuário Advogado</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> 30 Documentos/mês</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Certificado de Evidências</li>
              </ul>
            </div>
            {planInfo.plan === 'SOLO' && (
              <span className="w-full text-center py-2 bg-gold-500 text-[#0B1D3D] font-bold rounded-xl text-xs block">
                Plano Atual
              </span>
            )}
          </div>

          {/* Profissional */}
          <div className={`p-6 rounded-2xl border-2 ${planInfo.plan === 'PROFISSIONAL' ? 'border-gold-500 bg-gold-50/20 shadow-md' : 'border-gold-400'} space-y-4 flex flex-col justify-between relative`}>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gold-600">Plano Profissional</span>
              <div className="text-2xl font-extrabold text-[#0B1D3D] mt-1">R$ 69,90<span className="text-xs text-slate-500 font-normal">/mês</span></div>
              <ul className="space-y-2 text-xs text-slate-600 mt-4">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Até 3 Usuários</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> 60 Documentos/mês</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Kits Jurídicos em 1 Link</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Personalização com Logo e Cores</li>
              </ul>
            </div>
            {planInfo.plan === 'PROFISSIONAL' ? (
              <span className="w-full text-center py-2 bg-gold-500 text-[#0B1D3D] font-bold rounded-xl text-xs block">
                Plano Atual
              </span>
            ) : (
              <a
                href="https://wa.me/5573988250201?text=Quero%20fazer%20upgrade%20do%20AssinaJur%20para%20o%20Plano%20Profissional"
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-2.5 bg-gold-500 text-[#0B1D3D] font-bold rounded-xl text-xs block hover:bg-gold-400"
              >
                Upgrade para Profissional
              </a>
            )}
          </div>

          {/* Escritório */}
          <div className={`p-6 rounded-2xl border ${planInfo.plan === 'ESCRITORIO' ? 'border-gold-500 bg-gold-50/20 shadow-md' : 'border-slate-200'} space-y-4 flex flex-col justify-between`}>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Plano Escritório</span>
              <div className="text-2xl font-extrabold text-[#0B1D3D] mt-1">R$ 99,90<span className="text-xs text-slate-500 font-normal">/mês</span></div>
              <ul className="space-y-2 text-xs text-slate-600 mt-4">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Até 5 Usuários</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> 150 Documentos/mês</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Permissões Granulares</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Suporte Prioritário</li>
              </ul>
            </div>
            {planInfo.plan === 'ESCRITORIO' ? (
              <span className="w-full text-center py-2 bg-gold-500 text-[#0B1D3D] font-bold rounded-xl text-xs block">
                Plano Atual
              </span>
            ) : (
              <a
                href="https://wa.me/5573988250201?text=Quero%20fazer%20upgrade%20do%20AssinaJur%20para%20o%20Plano%20Escritorio"
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-2.5 bg-[#0B1D3D] text-white font-bold rounded-xl text-xs block hover:bg-slate-800"
              >
                Falar com Consultor
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
