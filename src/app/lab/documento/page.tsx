'use client';

/**
 * LABORATÓRIO ASSINAJUR — Teste de captura de documento de identificação.
 *
 * Ambiente isolado e descartável:
 *  - não aparece em menu, dashboard ou qualquer navegação;
 *  - não toca no fluxo de assinatura, selfies, certificados ou clientes;
 *  - nada é gravado em banco, storage ou ficha de cliente;
 *  - as imagens vivem apenas na memória desta aba, enquanto a página estiver aberta.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlaskConical,
  IdCard,
  CreditCard,
  ArrowRight,
  Loader2,
  Check,
  AlertTriangle,
  RotateCcw,
  X,
  ShieldCheck,
} from 'lucide-react';
import DocumentCapture, { type CaptureResult } from '@/components/lab/DocumentCapture';
import { maskCpfCnpj } from '@/lib/formatters';
import { formatBrasiliaDateTime, formatBrasiliaTimeOnly } from '@/lib/dateUtils';

type Step = 'INTRO' | 'TYPE' | 'FRONT' | 'BACK' | 'ANALYSING' | 'RESULT';
type DocType = 'RG' | 'CNH';

interface LabEvent {
  code: string;
  label: string;
  at: string;
}

interface Extraction {
  documentType: string;
  name: string;
  cpf: string;
  birthDate: string;
  documentNumber: string;
  issuingOrgan: string;
  motherName: string;
  fatherName: string;
}

interface OcrDiagnostics {
  model: string | null;
  elapsedMs: number;
  imagesSent: number;
  reason: string | null;
}

type CpfMatch = 'MATCH' | 'DIVERGENT' | 'NOT_FOUND' | 'NO_EXPECTED';

/** Converte o dataURL da captura em Blob para envio multipart, sem passar por log. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function describeBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Google Chrome';
  if (/CriOS\//.test(ua)) return 'Chrome (iOS)';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Navegador não identificado';
}

function describeDevice(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Android (celular)' : 'Android (tablet)';
  if (/Windows/.test(ua)) return 'Windows (desktop)';
  if (/Macintosh/.test(ua)) return 'Mac (desktop)';
  if (/Linux/.test(ua)) return 'Linux (desktop)';
  return 'Dispositivo não identificado';
}

const EMPTY_EXTRACTION: Extraction = {
  documentType: '',
  name: '',
  cpf: '',
  birthDate: '',
  documentNumber: '',
  issuingOrgan: '',
  motherName: '',
  fatherName: '',
};

export default function DocumentLabPage() {
  const [step, setStep] = useState<Step>('INTRO');
  const [expectedCpf, setExpectedCpf] = useState('');
  const [docType, setDocType] = useState<DocType>('RG');

  const [front, setFront] = useState<CaptureResult | null>(null);
  const [back, setBack] = useState<CaptureResult | null>(null);

  const [events, setEvents] = useState<LabEvent[]>([]);
  const [extraction, setExtraction] = useState<Extraction>(EMPTY_EXTRACTION);
  const [ocrDiagnostics, setOcrDiagnostics] = useState<OcrDiagnostics | null>(null);
  const [ocrError, setOcrError] = useState('');
  const [zoomImage, setZoomImage] = useState<{ src: string; label: string } | null>(null);

  const [session, setSession] = useState<{ device: string; browser: string; startedAt: string }>({
    device: '—',
    browser: '—',
    startedAt: '',
  });

  // Evita registrar o evento de início duas vezes no StrictMode do Next.
  const bootedRef = useRef(false);

  const pushEvent = useCallback((code: string, label: string) => {
    setEvents((prev) => [...prev, { code, label, at: new Date().toISOString() }]);
  }, []);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    setSession({
      device: describeDevice(ua),
      browser: describeBrowser(ua),
      startedAt: new Date().toISOString(),
    });
    pushEvent('SESSION_STARTED', 'Sessão de teste iniciada');
  }, [pushEvent]);

  const runOcr = useCallback(
    async (frontShot: CaptureResult, backShot: CaptureResult | null) => {
      setStep('ANALYSING');
      setOcrError('');
      pushEvent('OCR_STARTED', 'Leitura do documento iniciada');

      try {
        const formData = new FormData();
        formData.append('front', dataUrlToBlob(frontShot.dataUrl), 'front.jpg');
        if (backShot) {
          formData.append('back', dataUrlToBlob(backShot.dataUrl), 'back.jpg');
        }
        formData.append('expectedType', docType);

        const res = await fetch('/api/lab/document-ocr', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
          setOcrError(data?.error || 'Não foi possível concluir a leitura.');
          setOcrDiagnostics(null);
          pushEvent('OCR_FAILED', 'Leitura não concluída');
        } else {
          setExtraction(data.extracted || EMPTY_EXTRACTION);
          setOcrDiagnostics(data.diagnostics || null);
          if (data.success) {
            pushEvent('OCR_COMPLETED', 'Leitura concluída');
          } else {
            pushEvent('OCR_EMPTY', 'Leitura concluída sem campos identificados');
          }
        }
      } catch {
        setOcrError('Falha de comunicação ao enviar as imagens para leitura.');
        pushEvent('OCR_FAILED', 'Leitura não concluída');
      } finally {
        pushEvent('CPF_COMPARED', 'Comparação de CPF realizada');
        pushEvent('TEST_COMPLETED', 'Teste concluído');
        setStep('RESULT');
      }
    },
    [docType, pushEvent]
  );

  const handleFrontConfirmed = useCallback(
    (result: CaptureResult) => {
      setFront(result);
      setStep('BACK');
    },
    []
  );

  const handleBackConfirmed = useCallback(
    (result: CaptureResult) => {
      setBack(result);
      if (front) void runOcr(front, result);
    },
    [front, runOcr]
  );

  const cpfMatch: CpfMatch = useMemo(() => {
    const expectedDigits = expectedCpf.replace(/\D/g, '');
    const foundDigits = extraction.cpf.replace(/\D/g, '');
    if (!expectedDigits) return 'NO_EXPECTED';
    if (!foundDigits) return 'NOT_FOUND';
    return expectedDigits === foundDigits ? 'MATCH' : 'DIVERGENT';
  }, [expectedCpf, extraction.cpf]);

  const resetTest = useCallback(() => {
    setStep('INTRO');
    setExpectedCpf('');
    setDocType('RG');
    setFront(null);
    setBack(null);
    setExtraction(EMPTY_EXTRACTION);
    setOcrDiagnostics(null);
    setOcrError('');
    setZoomImage(null);
    setEvents([{ code: 'SESSION_RESTARTED', label: 'Teste reiniciado', at: new Date().toISOString() }]);
  }, []);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6 pb-16">
      {/* Identificação inequívoca de ambiente de teste */}
      <header className="mb-5 rounded-2xl border border-dashed border-[#D4AF37] bg-[#FFFBF0] p-3.5">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 shrink-0 text-[#B68B1C]" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B68B1C]">
              Laboratório AssinaJur
            </p>
            <p className="text-xs font-bold text-[#071B3A]">Teste de captura de documento</p>
          </div>
        </div>
      </header>

      {/* ETAPA 1 — APRESENTAÇÃO */}
      {step === 'INTRO' && (
        <section className="space-y-5">
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[#071B3A]">
              Confirme seu documento
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              Vamos fotografar seu documento de identificação. O processo é rápido e as imagens
              serão utilizadas apenas neste ambiente de teste.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <label
              htmlFor="expected-cpf"
              className="block text-[10px] font-black uppercase tracking-wider text-slate-500"
            >
              CPF esperado <span className="font-bold normal-case text-slate-400">(apenas para teste)</span>
            </label>
            <input
              id="expected-cpf"
              type="text"
              inputMode="numeric"
              value={expectedCpf}
              onChange={(e) => setExpectedCpf(maskCpfCnpj(e.target.value))}
              placeholder="000.000.000-00"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base font-bold text-slate-800 outline-none focus:border-[#071B3A]"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Serve só para comparar com o CPF lido no documento. Pode deixar em branco.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStep('TYPE')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071B3A] py-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
          >
            Começar <ArrowRight className="h-4 w-4 text-[#D4AF37]" />
          </button>
        </section>
      )}

      {/* ETAPA 2 — TIPO DE DOCUMENTO */}
      {step === 'TYPE' && (
        <section className="space-y-5">
          <div className="space-y-1">
            <h1 className="font-heading text-xl font-extrabold text-[#071B3A]">
              Qual documento você vai usar?
            </h1>
            <p className="text-sm text-slate-500">Escolha o documento que está com você agora.</p>
          </div>

          <div className="space-y-2.5">
            {([
              { key: 'RG' as DocType, label: 'RG', hint: 'Carteira de identidade', Icon: IdCard },
              { key: 'CNH' as DocType, label: 'CNH', hint: 'Carteira de motorista', Icon: CreditCard },
            ]).map(({ key, label, hint, Icon }) => {
              const selected = docType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDocType(key)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                    selected
                      ? 'border-[#071B3A] bg-[#071B3A]/[0.04]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      selected ? 'bg-[#071B3A] text-[#D4AF37]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-[#071B3A]">{label}</span>
                    <span className="block text-xs text-slate-500">{hint}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-[#071B3A]" />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              pushEvent('DOCUMENT_TYPE_SELECTED', `Tipo de documento escolhido: ${docType}`);
              setStep('FRONT');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071B3A] py-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
          >
            Continuar <ArrowRight className="h-4 w-4 text-[#D4AF37]" />
          </button>
        </section>
      )}

      {/* ETAPA 3 — FRENTE */}
      {step === 'FRONT' && (
        <DocumentCapture
          side="FRENTE"
          title="Fotografe a frente do documento"
          helperText="Use uma superfície bem iluminada e evite reflexos."
          onConfirm={handleFrontConfirmed}
          onEvent={pushEvent}
        />
      )}

      {/* ETAPA 4 — VERSO */}
      {step === 'BACK' && (
        <DocumentCapture
          side="VERSO"
          title="Agora fotografe o verso do documento"
          helperText="Mesma superfície, sem sombra sobre o documento."
          onConfirm={handleBackConfirmed}
          onEvent={pushEvent}
        />
      )}

      {/* ETAPA 5 — ANÁLISE */}
      {step === 'ANALYSING' && (
        <section className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#B68B1C]" />
          <p className="font-heading text-lg font-extrabold text-[#071B3A]">
            Analisando documento...
          </p>
          <p className="max-w-xs text-sm text-slate-500">
            Estamos conferindo as fotos que você tirou. Leva só alguns segundos.
          </p>
        </section>
      )}

      {/* ETAPA 6 — DIAGNÓSTICO */}
      {step === 'RESULT' && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h1 className="font-heading text-xl font-extrabold text-[#071B3A]">Teste concluído</h1>
            <p className="text-sm text-slate-500">Painel de diagnóstico do laboratório.</p>
          </div>

          {ocrError && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-extrabold text-amber-900">Leitura não concluída</p>
                <p className="mt-0.5 text-[11px] leading-4 text-amber-800">{ocrError}</p>
              </div>
            </div>
          )}

          {/* CAPTURA */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Captura
            </h2>
            <dl className="mt-2 space-y-1.5 text-xs">
              <Row label="Frente do documento" value={front ? '✓ capturada' : '— não capturada'} />
              <Row label="Verso do documento" value={back ? '✓ capturado' : '— não capturado'} />
              <Row label="Origem" value="câmera do dispositivo" />
              <Row
                label="Qualidade"
                value={
                  front?.quality.acceptable && (!back || back.quality.acceptable)
                    ? 'adequada'
                    : 'com ressalvas'
                }
              />
              {front && (
                <Row
                  label="Frente capturada em"
                  value={formatBrasiliaDateTime(front.capturedAt)}
                />
              )}
              {back && (
                <Row label="Verso capturado em" value={formatBrasiliaDateTime(back.capturedAt)} />
              )}
            </dl>
          </div>

          {/* LEITURA */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Leitura
            </h2>
            <dl className="mt-2 space-y-1.5 text-xs">
              <Row label="Tipo informado" value={docType} />
              <Row label="Tipo identificado" value={extraction.documentType || 'Não identificado'} />
              <Row label="Nome identificado" value={extraction.name || 'Não identificado'} />
              <Row label="CPF identificado" value={extraction.cpf || 'Não identificado'} />
              <Row
                label="Data de nascimento"
                value={extraction.birthDate || 'Não identificado'}
              />
              <Row
                label="Número do documento"
                value={extraction.documentNumber || 'Não identificado'}
              />
              <Row label="Órgão emissor" value={extraction.issuingOrgan || 'Não identificado'} />
              <Row label="Nome da mãe" value={extraction.motherName || 'Não identificado'} />
              <Row label="Nome do pai" value={extraction.fatherName || 'Não identificado'} />
            </dl>
          </div>

          {/* COMPARAÇÃO DE CPF */}
          <div
            className={`rounded-2xl border p-4 ${
              cpfMatch === 'MATCH'
                ? 'border-emerald-200 bg-emerald-50'
                : cpfMatch === 'DIVERGENT'
                ? 'border-rose-200 bg-rose-50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Comparação de CPF
            </h2>
            <p
              className={`mt-1.5 text-xs font-extrabold ${
                cpfMatch === 'MATCH'
                  ? 'text-emerald-800'
                  : cpfMatch === 'DIVERGENT'
                  ? 'text-rose-800'
                  : 'text-slate-600'
              }`}
            >
              {cpfMatch === 'MATCH' && '✓ CPF do documento corresponde ao CPF informado'}
              {cpfMatch === 'DIVERGENT' &&
                '⚠ O CPF identificado no documento não corresponde ao CPF informado'}
              {cpfMatch === 'NOT_FOUND' && '⚠ Não foi possível identificar o CPF no documento'}
              {cpfMatch === 'NO_EXPECTED' && 'Nenhum CPF esperado foi informado nesta sessão'}
            </p>
            {expectedCpf && (
              <p className="mt-1 text-[11px] text-slate-500">
                Informado: {expectedCpf} · Lido: {extraction.cpf || '—'}
              </p>
            )}
          </div>

          {/* IMAGENS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Imagens capturadas
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Toque na imagem para ampliar.</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {([
                { shot: front, label: 'FRENTE' },
                { shot: back, label: 'VERSO' },
              ]).map(({ shot, label }) => (
                <div key={label} className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {label}
                  </span>
                  {shot ? (
                    <button
                      type="button"
                      onClick={() => setZoomImage({ src: shot.dataUrl, label })}
                      className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
                    >
                      {/* object-contain preserva a proporção real da foto */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shot.dataUrl}
                        alt={`Documento — ${label.toLowerCase()}`}
                        className="block h-auto w-full object-contain"
                      />
                    </button>
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
                      não capturado
                    </div>
                  )}
                  {shot && (
                    <p className="text-[10px] leading-tight text-slate-400">
                      {shot.width}×{shot.height}px · {(shot.bytes / 1024).toFixed(0)} KB
                      <br />
                      luminância {shot.quality.meanLuminance} · nitidez {shot.quality.sharpness}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SESSÃO */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Sessão
            </h2>
            <dl className="mt-2 space-y-1.5 text-xs">
              <Row label="Dispositivo" value={session.device} />
              <Row label="Navegador" value={session.browser} />
              <Row
                label="Início do teste"
                value={session.startedAt ? formatBrasiliaDateTime(session.startedAt) : '—'}
              />
              {ocrDiagnostics && (
                <>
                  <Row label="Modelo de leitura" value={ocrDiagnostics.model || 'nenhum respondeu'} />
                  <Row label="Tempo de leitura" value={`${ocrDiagnostics.elapsedMs} ms`} />
                  <Row label="Imagens enviadas" value={String(ocrDiagnostics.imagesSent)} />
                  {ocrDiagnostics.reason && (
                    <Row label="Observação" value={ocrDiagnostics.reason} />
                  )}
                </>
              )}
            </dl>
          </div>

          {/* EVENTOS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Eventos do laboratório
            </h2>
            <ol className="mt-2 space-y-1">
              {events.map((ev, i) => (
                <li key={`${ev.code}-${i}`} className="flex items-start gap-2 text-[11px]">
                  <span className="w-14 shrink-0 font-mono text-slate-400">
                    {formatBrasiliaTimeOnly(ev.at)}
                  </span>
                  <span className="text-slate-600">{ev.label}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-100/70 p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p className="text-[11px] leading-4 text-slate-600">
              Ambiente de teste. Nada foi salvo em banco de dados, em ficha de cliente ou em
              qualquer assinatura. As imagens existem apenas nesta aba e desaparecem ao recarregar
              a página.
            </p>
          </div>

          <button
            type="button"
            onClick={resetTest}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-extrabold text-slate-700 transition active:scale-[0.99]"
          >
            <RotateCcw className="h-4 w-4" /> Refazer teste
          </button>
        </section>
      )}

      {/* VISUALIZAÇÃO AMPLIADA */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3"
          onClick={() => setZoomImage(null)}
        >
          <div className="flex items-center justify-between px-1 py-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/80">
              {zoomImage.label}
            </span>
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              aria-label="Fechar visualização"
              className="rounded-lg p-2 text-white/80 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomImage.src}
              alt={`Documento ampliado — ${zoomImage.label.toLowerCase()}`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-bold text-[#071B3A]">{value}</dd>
    </div>
  );
}
