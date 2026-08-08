'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Camera,
  Bot,
  User,
  Zap,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Check,
  Clock,
  FileText,
  FileCheck,
  Search,
  CheckCheck,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { maskPhone } from '@/lib/formatters';

interface ChatMessage {
  id: string;
  sender: 'lawyer' | 'bot';
  text: string;
  actionTaken?: string;
  time: string;
  mediaUrl?: string;
}

interface ClientContact {
  id: string;
  name: string;
  phone: string;
  cpfCnpj: string;
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
}

export default function WhatsAppPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeContact, setActiveContact] = useState<string>('bot');
  const [simulating, setSimulating] = useState(false);
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Lista de Contatos / Chats Ativos no Painel do Escritório
  const [contacts, setContacts] = useState<ClientContact[]>([
    {
      id: 'bot',
      name: 'AssinaJur AI Copilot (Oficial)',
      phone: '5573999999999',
      cpfCnpj: 'IA Assistente',
      lastMessage: 'Olá! Sou a Inteligência Artificial do seu escritório.',
      lastTime: 'Agora',
      unread: 0,
    },
  ]);

  // Mensagens do Chat Ativo
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: '👋 *Olá, Doutor(a)!* Este é o controle remoto do AssinaJur.\n\nDigite *AJUDA* para consultar os comandos. Cadastros e alterações serão mostrados em uma prévia antes da confirmação.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  useEffect(() => {
    setMounted(true);
    fetchClientsAndLogs();

    const interval = setInterval(fetchClientsAndLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, simulating]);

  const fetchClientsAndLogs = async () => {
    try {
      const [resClients, resLogs] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/whatsapp/status'),
      ]);
      const dataClients = await resClients.json();
      const dataLogs = await resLogs.json();

      if (dataClients.clients) {
        const clientContacts: ClientContact[] = dataClients.clients.slice(0, 10).map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone || c.whatsapp || '(73) 99999-9999',
          cpfCnpj: c.cpfCnpj,
          lastMessage: `Cliente cadastrado • CPF: ${c.cpfCnpj}`,
          lastTime: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));

        setContacts([
          {
            id: 'bot',
            name: 'AssinaJur AI Copilot (Oficial)',
            phone: '5573999999999',
            cpfCnpj: 'IA Assistente',
            lastMessage: 'Olá! Sou a Inteligência Artificial do seu escritório.',
            lastTime: 'Agora',
            unread: 0,
          },
          ...clientContacts,
        ]);
      }

      if (dataLogs.status) {
        setStatus(dataLogs.status);
      }
    } catch (err) {
      console.error('Erro ao carregar contatos e registros:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string, imageFile?: File) => {
    const msgText = textToSend || inputMessage;
    if (!msgText.trim() && !imageFile) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lawyerMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'lawyer',
      text: imageFile ? `📸 [Foto do Documento Enviada: ${imageFile.name}]` : msgText,
      time: currentTime,
    };

    setMessages((prev) => [...prev, lawyerMessage]);
    if (!imageFile) setInputMessage('');
    setSimulating(true);

    try {
      let bodyText = msgText;
      let mediaBase64 = undefined;
      let messageType: 'TEXT' | 'IMAGE' = 'TEXT';

      if (imageFile) {
        messageType = 'IMAGE';
        bodyText = 'Foto de documento para leitura e cadastro de cliente';
        mediaBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(imageFile);
        });
      }

      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromNumber: 'PAINEL_ASSINAJUR',
          message: bodyText,
          messageType,
          mediaBase64,
          mediaMimeType: imageFile?.type || 'image/jpeg',
        }),
      });

      const data = await res.json();
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (data.reply) {
        const botResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: data.reply,
          actionTaken: data.actionTaken,
          time: botTime,
        };
        setMessages((prev) => [...prev, botResponse]);

        if (data.actionTaken && data.actionTaken.includes('CREATE_CLIENT')) {
          fetchClientsAndLogs();
        }
      }
    } catch (err) {
      console.error('Erro na resposta da IA:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSendMessage(undefined, file);
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.phone.includes(searchFilter) ||
    c.cpfCnpj.includes(searchFilter)
  );

  if (!mounted) return null;

  return (
    <div className="p-2 sm:p-4 lg:p-6 max-w-7xl mx-auto space-y-4 font-sans">
      {/* Top Banner de Status Conectado */}
      <div className="bg-[#075E54] p-4 sm:p-5 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-400/30 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
            <CheckCircle2 className="w-6 h-6 text-emerald-300 animate-pulse" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-base sm:text-lg flex items-center gap-2">
              {status === 'CONNECTED'
                ? '🟢 WHATSAPP CONECTADO PELO COMPUTADOR'
                : status === 'CONNECTING'
                  ? '🟡 CONECTANDO AO WHATSAPP'
                  : '⚪ WHATSAPP DESCONECTADO'}
            </h2>
            <p className="text-emerald-100 text-xs">
              {status === 'CONNECTED'
                ? 'Heartbeat recebido: o bot local está online e sincronizado com o AssinaJur.'
                : 'Inicie o AssinaJur-Bot.bat no computador para ativar o controle remoto.'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchClientsAndLogs}
          className="px-4 py-2 rounded-2xl bg-white text-[#075E54] hover:bg-emerald-50 font-extrabold text-xs shadow-md transition-all flex items-center gap-2 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar Dados
        </button>
      </div>

      {/* Interface Central de Atendimento Segura */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[700px]">
        {/* Painel Esquerdo: Lista de Conversas e Contatos */}
        <div className="lg:col-span-4 border-r border-slate-200/80 flex flex-col bg-slate-50/50">
          {/* Header da Sidebar de Conversas */}
          <div className="p-4 bg-[#F0F2F5] border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#075E54] text-white font-bold flex items-center justify-center text-xs shadow-md">
                AJ
              </div>
              <span className="font-heading font-bold text-slate-800 text-sm">Central do Escritório</span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo
            </span>
          </div>

          {/* Busca de Contatos */}
          <div className="p-3 bg-white border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar cliente por nome ou CPF..."
                className="w-full bg-slate-100 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Lista de Chats/Clientes */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setActiveContact(contact.id)}
                className={`w-full p-3.5 flex items-start gap-3 transition-colors text-left ${
                  activeContact === contact.id ? 'bg-[#E9EDEF]' : 'hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm ${
                    contact.id === 'bot' ? 'bg-[#075E54]' : 'bg-blue-600'
                  }`}
                >
                  {contact.id === 'bot' ? <Bot className="w-6 h-6" /> : contact.name.substring(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 overflow-hidden space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs truncate flex items-center gap-1.5">
                      {contact.name}
                      {contact.id === 'bot' && (
                        <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded font-normal">
                          IA
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0">{contact.lastTime}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{contact.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Painel Direito: Janela do Chat Estilo WhatsApp Web */}
        <div className="lg:col-span-8 flex flex-col h-full bg-[#E5DDD5] bg-opacity-30 relative">
          {/* Header do Chat Ativo */}
          <div className="p-3.5 bg-[#F0F2F5] border-b border-slate-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#075E54] text-white flex items-center justify-center font-bold shadow-md">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 leading-tight flex items-center gap-2">
                  AssinaJur Copilot IA <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.5 rounded font-normal">Oficial</span>
                </h3>
                <p className={`text-[11px] font-medium flex items-center gap-1 ${status === 'CONNECTED' ? 'text-emerald-700' : 'text-slate-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {status === 'CONNECTED' ? 'Online em tempo real' : 'Aguardando bot local'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" /> Ler Foto de RG/CNH
              </button>
            </div>
          </div>

          {/* Área de Mensagens do Chat com Wallpaper WhatsApp */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 relative">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[82%] ${
                  msg.sender === 'lawyer' ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div
                  className={`p-3.5 rounded-2xl shadow-md text-xs leading-relaxed space-y-2 whitespace-pre-line ${
                    msg.sender === 'lawyer'
                      ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-xs border border-emerald-200/60'
                      : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200/60'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.actionTaken && (
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      ⚡ Ação do Banco de Dados: {msg.actionTaken}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1 font-semibold flex items-center gap-1">
                  {msg.time}
                  {msg.sender === 'lawyer' && <CheckCheck className="w-3 h-3 text-blue-500" />}
                </span>
              </div>
            ))}

            {simulating && (
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full text-xs text-slate-700 mr-auto shadow-md border border-slate-200 animate-pulse">
                <Bot className="w-4 h-4 text-emerald-600 animate-bounce" />
                AssinaJur IA está processando e consultando o banco...
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Rodapé e Input de Mensagem estilo WhatsApp Web */}
          <div className="p-3 bg-[#F0F2F5] border-t border-slate-200 flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-600 hover:text-emerald-700 bg-white hover:bg-slate-100 rounded-full transition-all shadow-xs border border-slate-200 shrink-0"
              title="Enviar Foto de Documento (RG/CNH)"
            >
              <Camera className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite um comando ('ajuda', 'status', 'clientes', 'cadastrar cliente...')..."
              className="flex-1 bg-white border border-slate-300 rounded-full px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || simulating}
              className="p-2.5 bg-[#075E54] hover:bg-[#054C44] disabled:opacity-50 text-white rounded-full transition-all shadow-md shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
