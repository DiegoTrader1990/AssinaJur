'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Camera,
  Bot,
  User,
  Zap,
  Sparkles,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  Check,
  Clock,
  FileText,
  FileCheck
} from 'lucide-react';

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
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [logs, setLogs] = useState<WhatsAppLogItem[]>([]);
  const [connectingAction, setConnectingAction] = useState(false);

  // Chat de Teste / Simulador do Agente no Celular
  const [testMessage, setTestMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { sender: 'lawyer' | 'bot'; text: string; action?: string; time: string }[]
  >([
    {
      sender: 'bot',
      text: '👋 *Olá, Doutor(a)!* Sou o seu Assistente Jurídico Inteligente no WhatsApp.\n\nVocê pode me enviar fotos de CNH/RG para cadastrar clientes, pedir o status de procurações pendentes ou mandar comandos por texto e voz!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [simulating, setSimulating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setPhoneNumber(data.phoneNumber);
        setQrCode(data.qrCode);
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
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Erro ao gerar QR:', err);
    } finally {
      setConnectingAction(false);
    }
  };

  const handleToggleConnection = async () => {
    setConnectingAction(true);
    try {
      const nextAction = status === 'CONNECTED' ? 'DISCONNECT' : 'CONNECT';
      const res = await fetch('/api/whatsapp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextAction }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        if (data.status === 'CONNECTED') {
          setPhoneNumber('WhatsApp do Escritório Conectado');
        } else {
          setPhoneNumber(null);
        }
      }
    } catch (err) {
      console.error('Erro ao alterar conexão:', err);
    } finally {
      setConnectingAction(false);
    }
  };

  const handleSendSimulatedMessage = async (textToSend?: string, imageFile?: File) => {
    const msg = textToSend || testMessage;
    if (!msg && !imageFile) return;

    const lawyerTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgText = imageFile ? `📸 [Foto do Documento: ${imageFile.name}]` : msg;

    setChatMessages((prev) => [...prev, { sender: 'lawyer', text: userMsgText, time: lawyerTime }]);
    if (!imageFile) setTestMessage('');
    setSimulating(true);

    try {
      let bodyText = msg;
      let mediaBase64 = undefined;
      let messageType: 'TEXT' | 'IMAGE' = 'TEXT';

      if (imageFile) {
        messageType = 'IMAGE';
        bodyText = 'Foto de CNH/RG para cadastro';
        const buffer = await imageFile.arrayBuffer();
        mediaBase64 = Buffer.from(buffer).toString('base64');
      }

      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officeId: 'office_demo',
          fromNumber: '5573999999999',
          message: bodyText,
          messageType,
          mediaBase64,
          mediaMimeType: imageFile?.type || 'image/jpeg',
        }),
      });

      const data = await res.json();
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (data.reply) {
        setChatMessages((prev) => [
          ...prev,
          { sender: 'bot', text: data.reply, action: data.actionTaken, time: botTime },
        ]);
      }
      fetchStatus();
    } catch (err) {
      console.error('Erro na simulação do WhatsApp:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSendSimulatedMessage(undefined, file);
    }
  };

  if (!mounted) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#071B3A] via-[#0B2545] to-[#134074] p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-white/10">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Assistente Jurídico por IA no Celular
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading flex items-center gap-3">
            WhatsApp Copilot IA <span className="text-[#D4AF37] text-lg font-normal">v1.0</span>
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Conecte o WhatsApp do seu escritório. Envie fotos de documentos, gere procurações e consulte o status de assinaturas diretamente pelo chat do seu celular!
          </p>
        </div>

        {/* Badge de Status de Conexão */}
        <div className="relative z-10 flex flex-col items-start md:items-end gap-2">
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl font-bold text-xs shadow-md border ${
              status === 'CONNECTED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full animate-ping ${
                status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {status === 'CONNECTED' ? '🟢 Conectado & Ativo' : '🔴 Desconectado (Aguardando Pareamento)'}
          </div>

          <button
            onClick={handleToggleConnection}
            disabled={connectingAction}
            className="text-xs text-slate-300 hover:text-white underline font-medium flex items-center gap-1.5 transition-colors"
          >
            {connectingAction ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : status === 'CONNECTED' ? (
              'Simular Desconexão'
            ) : (
              'Conectar Instantaneamente (Modo Teste)'
            )}
          </button>
        </div>
      </div>

      {/* Grid Principal: Leitor QR Code + Simulador de Chat no Celular */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lado Esquerdo: Conexão QR Code Estilo WhatsApp Web */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-slate-800 text-base">Parear WhatsApp</h3>
                  <p className="text-xs text-slate-500">Conecte o número do seu escritório</p>
                </div>
              </div>
              <button
                onClick={handleGenerateQr}
                disabled={connectingAction}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                title="Atualizar QR Code"
              >
                <RefreshCw className={`w-4 h-4 ${connectingAction ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Container do QR Code */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-4">
              {status === 'CONNECTED' ? (
                <div className="py-8 space-y-4 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="font-heading font-extrabold text-slate-800 text-lg">WhatsApp Conectado!</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      {phoneNumber || 'Seu escritório já pode enviar e receber mensagens de inteligência artificial.'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                    <Check className="w-3.5 h-3.5" /> Pronto para uso no celular
                  </span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 relative group">
                    <img
                      src={
                        qrCode ||
                        'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ASSINAJUR_PAREAMENTO_DEMO'
                      }
                      alt="QR Code WhatsApp AssinaJur"
                      className="w-52 h-52 object-contain rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <span className="text-[11px] bg-black/80 text-white px-2.5 py-1 rounded-md font-medium">
                        Atualização em Tempo Real
                      </span>
                    </div>
                  </div>

                  <div className="text-left space-y-2 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                        1
                      </span>
                      Abra o WhatsApp no seu celular
                    </p>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                        2
                      </span>
                      Vá em <strong className="text-slate-900">Aparelhos Conectados</strong>
                    </p>
                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
                        3
                      </span>
                      Aponte a câmera para o QR Code acima
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Guia Rápido de Comandos */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Comandos de Voz e Texto Suportados
              </h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                  <Camera className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block">Enviar Foto de CNH/RG:</strong>
                    <span className="text-slate-500">Cadastra o cliente automaticamente com leitura de visão por IA.</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block">"Status":</strong>
                    <span className="text-slate-500">Lista os clientes que ainda não assinaram procurações pendentes.</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block">"Clientes":</strong>
                    <span className="text-slate-500">Mostra os últimos clientes cadastrados no seu escritório.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Chat Simulador Interativo estilo WhatsApp */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg overflow-hidden flex flex-col h-[640px]">
            {/* Header do Chat WhatsApp */}
            <div className="bg-[#075E54] p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold relative border border-white/20">
                  <Bot className="w-6 h-6 text-white" />
                  <span className="w-3 h-3 bg-emerald-400 rounded-full absolute bottom-0 right-0 border-2 border-[#075E54]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
                    AssinaJur Copilot IA <span className="bg-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-normal">Oficial</span>
                  </h3>
                  <p className="text-[11px] text-emerald-100">Assistente Jurídico do Seu Escritório</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Simulador de Celular</span>
              </div>
            </div>

            {/* Área de Mensagens estilo WhatsApp Wallpaper */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#E5DDD5] bg-opacity-40 relative">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'lawyer' ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <div
                    className={`p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed space-y-2 whitespace-pre-line ${
                      msg.sender === 'lawyer'
                        ? 'bg-[#DCF8C6] text-slate-800 rounded-tr-xs border border-emerald-200/60'
                        : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/60'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.action && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Ação Executada: {msg.action}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1 font-medium">{msg.time}</span>
                </div>
              ))}

              {simulating && (
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full text-xs text-slate-600 mr-auto shadow-xs border border-slate-200 animate-pulse">
                  <Bot className="w-4 h-4 text-emerald-600 animate-bounce" />
                  AssinaJur IA está digitando...
                </div>
              )}
            </div>

            {/* Input de Mensagem estilo WhatsApp */}
            <div className="p-3 bg-[#F0F0F0] border-t border-slate-200 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-100 rounded-full transition-all shadow-xs border border-slate-200"
                title="Enviar Foto de RG/CNH para Teste"
              >
                <Camera className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendSimulatedMessage()}
                placeholder="Envie uma mensagem ou digite 'status', 'clientes'..."
                className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />

              <button
                onClick={() => handleSendSimulatedMessage()}
                disabled={!testMessage.trim() || simulating}
                className="p-2.5 bg-[#075E54] hover:bg-[#054C44] disabled:opacity-50 text-white rounded-full transition-all shadow-md shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Mensagens / Auditoria de Comandos */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-heading font-bold text-slate-800 text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Histórico de Ações Executadas pela IA no WhatsApp
          </h3>
          <span className="text-xs text-slate-500">Últimas interações do escritório</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Nenhuma ação executada via WhatsApp ainda. Use o simulador acima ou envie uma mensagem no celular!
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
