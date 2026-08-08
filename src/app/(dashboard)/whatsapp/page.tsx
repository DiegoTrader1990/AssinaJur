'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Check,
  Clock,
  FileText,
  FileCheck,
  KeyRound,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { maskPhone } from '@/lib/formatters';

interface WhatsAppLogItem {
  id: string;
  fromNumber: string;
  body: string;
  aiResponse?: string;
  actionTaken?: string;
  createdAt: string;
}

export default function WhatsAppPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [inputPhone, setInputPhone] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [connectingAction, setConnectingAction] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'code'>('qr');

  useEffect(() => {
    setMounted(true);
    fetchStatus();

    // Auto-refresh a cada 10s para verificar se o celular conectou
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setPhoneNumber(data.phoneNumber);
        if (data.qrCode) setQrCode(data.qrCode);
        if (data.logs) setLogs(data.logs);
      }
    } catch (err) {
      console.error('Erro ao buscar status do WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQr = async () => {
    setConnectingAction(true);
    try {
      const res = await fetch('/api/whatsapp/qr');
      const data = await res.json();
      if (data.success) {
        setQrCode(data.qrCode);
        if (data.pairingCode) setPairingCode(data.pairingCode);
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Erro ao renovar QR Code:', err);
    } finally {
      setConnectingAction(false);
    }
  };

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone) return;
    setConnectingAction(true);
    try {
      const res = await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: inputPhone }),
      });
      const data = await res.json();
      if (data.success) {
        setPairingCode(data.pairingCode);
        setPhoneNumber(data.phoneNumber);
      }
    } catch (err) {
      console.error('Erro ao solicitar código de 8 dígitos:', err);
    } finally {
      setConnectingAction(false);
    }
  };

  const handleDisconnect = async () => {
    setConnectingAction(true);
    try {
      const res = await fetch('/api/whatsapp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DISCONNECT' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('DISCONNECTED');
        setPhoneNumber(null);
        setQrCode(null);
      }
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    } finally {
      setConnectingAction(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Cabeçalho de Produção */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#071B3A] via-[#0B2545] to-[#134074] p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-white/10">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
            <Smartphone className="w-3.5 h-3.5 text-blue-300" />
            Integração Oficial com WhatsApp
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading flex items-center gap-3">
            Conexão WhatsApp do Escritório
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Conecte o seu número de WhatsApp ao AssinaJur. Assim que conectado, a Inteligência Artificial lerá documentos de RG/CNH enviados por foto, responderá status de procurações e enviará cobranças automáticas para seus clientes.
          </p>
        </div>

        {/* Status Real */}
        <div className="z-10 flex flex-col items-start md:items-end gap-3">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md border ${
              status === 'CONNECTED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'CONNECTED' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            {status === 'CONNECTED' ? '🟢 Conectado em Produção' : '🔴 Desconectado (Aguardando Leitura)'}
          </div>

          {status === 'CONNECTED' && (
            <button
              onClick={handleDisconnect}
              disabled={connectingAction}
              className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-semibold transition-all"
            >
              Desconectar Aparelho
            </button>
          )}
        </div>
      </div>

      {/* Grid Principal: Conexão Real QR Code / Código 8 Dígitos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Painel de Conexão do Aparelho */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-slate-800 text-base">Parear Número de WhatsApp</h3>
                  <p className="text-xs text-slate-500">Conexão direta pelo aplicativo do celular</p>
                </div>
              </div>
              <button
                onClick={handleGenerateQr}
                disabled={connectingAction}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                title="Renovar Código/QR Code"
              >
                <RefreshCw className={`w-4 h-4 ${connectingAction ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Abas de Conexão Real: QR Code vs Código de Telefone */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'qr'
                    ? 'bg-white text-slate-800 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4" /> Leitor de QR Code
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'code'
                    ? 'bg-white text-slate-800 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-4 h-4" /> Conectar por Código de 8 Dígitos
              </button>
            </div>

            {/* Container Principal de Pareamento Real */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-4">
              {status === 'CONNECTED' ? (
                <div className="py-8 space-y-4 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="font-heading font-extrabold text-slate-800 text-lg">WhatsApp Ativo no Servidor!</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      {phoneNumber || 'Seu escritório está pronto para receber imagens de documentos e responder clientes automaticamente.'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                    <Check className="w-4 h-4" /> Dispositivo Pareado e Monitorando
                  </span>
                </div>
              ) : activeTab === 'qr' ? (
                <>
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 relative">
                    <img
                      src={
                        qrCode ||
                        'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ASSINAJUR_PAREAMENTO_OFICIAL'
                      }
                      alt="QR Code WhatsApp AssinaJur"
                      className="w-56 h-56 object-contain rounded-xl"
                    />
                  </div>

                  <div className="text-left space-y-2.5 text-xs text-slate-600 w-full pt-2">
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                        1
                      </span>
                      No seu celular, abra o aplicativo do <strong className="text-slate-900">WhatsApp</strong>
                    </p>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                        2
                      </span>
                      Abra o menu (3 pontos ou Configurações) e toque em <strong className="text-slate-900">Aparelhos Conectados</strong>
                    </p>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                        3
                      </span>
                      Toque em <strong className="text-slate-900">Conectar um Aparelho</strong> e aponte a câmera para o QR Code acima
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-4 py-2 w-full">
                  <form onSubmit={handleRequestPairingCode} className="space-y-3 text-left">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Digite o Número do WhatsApp do Escritório (com DDD):
                      </label>
                      <input
                        type="text"
                        value={inputPhone}
                        onChange={(e) => setInputPhone(maskPhone(e.target.value))}
                        placeholder="(73) 99999-9999"
                        className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={connectingAction || !inputPhone}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                    >
                      {connectingAction ? 'Gerando Código Oficial...' : 'Gerar Código de Pareamento por Telefone'}
                    </button>
                  </form>

                  {pairingCode && (
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Código de Conexão Gerado
                      </span>
                      <div className="text-3xl font-mono font-black text-slate-900 tracking-widest bg-slate-100 py-3 rounded-xl border border-slate-200">
                        {pairingCode}
                      </div>
                    </div>
                  )}

                  <div className="text-left space-y-2 text-xs text-slate-600 pt-2">
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                        1
                      </span>
                      No WhatsApp do celular: vá em <strong className="text-slate-900">Aparelhos Conectados</strong>
                    </p>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                        2
                      </span>
                      Toque em <strong className="text-slate-900">Conectar com número de telefone</strong>
                    </p>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                        3
                      </span>
                      Digite o código de 8 dígitos exibido acima no seu celular
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Funcionalidades Ativas do Robô de IA */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-heading font-bold text-slate-800 text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Funcionalidades do Agente IA no WhatsApp
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Comandos de voz, texto e imagens processados automaticamente pela Inteligência Artificial:
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold">
                  📸
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Leitura e Cadastro por Foto do RG/CNH</h4>
                  <p className="text-slate-600 mt-0.5">
                    Envie a foto do documento de identidade de um novo cliente no chat do WhatsApp. A IA de Visão Computacional extrai o Nome, CPF, RG, Data de Nascimento e Endereço e cadastra o cliente no AssinaJur automaticamente.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                  📋
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Consulta de Status de Procurações Pendentes</h4>
                  <p className="text-slate-600 mt-0.5">
                    Envie uma mensagem de voz ou texto como *"Quais clientes não assinaram hoje?"* ou *"Status"*. O robô responde com a lista atualizada dos documentos pendentes.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                  👥
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Consulta de Clientes Cadastrados</h4>
                  <p className="text-slate-600 mt-0.5">
                    Digite *"Clientes"* para consultar o total de cadastros do seu escritório e visualizar os últimos clientes inseridos na base.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico Real de Interações */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-heading font-bold text-slate-800 text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Registro de Atividades da IA no WhatsApp
          </h3>
          <span className="text-xs text-slate-500">Histórico real de auditoria</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Nenhuma mensagem recebida no WhatsApp ainda. Pareie seu número acima para começar a usar!
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {logs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{log.fromNumber}</span>
                    {log.actionTaken && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                        {log.actionTaken}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600">{log.body}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(log.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
