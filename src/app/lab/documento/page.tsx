'use client';

/**
 * LABORATÓRIO ASSINAJUR — Teste de captura de documento de identificação.
 *
 * Escopo desta versão: SOMENTE a captura das fotos.
 * A leitura automática (OCR) foi deliberadamente removida — ela custava mais
 * tempo que todo o resto do fluxo, dependia de uma API externa no caminho
 * crítico e podia barrar cliente legítimo por erro de leitura. A conferência
 * do documento é feita pelo escritório, olhando a foto.
 *
 * Ambiente isolado e descartável:
 *  - não aparece em menu, dashboard ou qualquer navegação;
 *  - não toca no fluxo de assinatura, selfies, certificados ou clientes;
 *  - nada é gravado em banco, storage ou ficha de cliente;
 *  - as imagens vivem apenas na memória desta aba.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlaskConical,
  Camera,
  Loader2,
  RotateCcw,
  X,
  ShieldCheck,
  Download,
} from 'lucide-react';
import DocumentCapture, { type CaptureResult } from '@/components/lab/DocumentCapture';
import { formatBrasiliaDateTime, formatBrasiliaTimeOnly } from '@/lib/dateUtils';
import { buildLabReportPdf, nomeArquivoRelatorio } from '@/lib/lab/labReport';

type Step = 'INTRO' | 'FRONT' | 'BACK' | 'RESULT';

/** Sem leitura automática, o tipo exato não altera nada no processamento. */
const TIPO_DOCUMENTO = 'Documento com foto (RG ou CNH)';

interface LabEvent {
  code: string;
  label: string;
  at: string;
}

function describeBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/CriOS\//.test(ua)) return 'Chrome (iOS)';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Google Chrome';
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

export default function DocumentLabPage() {
  const [step, setStep] = useState<Step>('INTRO');

  const [front, setFront] = useState<CaptureResult | null>(null);
  const [back, setBack] = useState<CaptureResult | null>(null);

  const [events, setEvents] = useState<LabEvent[]>([]);
  const [zoomImage, setZoomImage] = useState<{ src: string; label: string } | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [erroPdf, setErroPdf] = useState('');

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

  const handleFrontConfirmed = useCallback((result: CaptureResult) => {
    setFront(result);
    setStep('BACK');
  }, []);

  const handleBackConfirmed = useCallback(
    (result: CaptureResult) => {
      setBack(result);
      pushEvent('TEST_COMPLETED', 'Captura concluída');
      setStep('RESULT');
    },
    [pushEvent]
  );

  /** Tempo entre o primeiro e o último evento registrado. */
  const duracaoSegundos = useMemo(() => {
    if (events.length < 2) return 0;
    const inicio = new Date(events[0].at).getTime();
    const fim = new Date(events[events.length - 1].at).getTime();
    return Math.max(0, Math.round((fim - inicio) / 1000));
  }, [events]);

  const qualidadeGeral = useMemo(() => {
    const todas = [front, back].filter(Boolean) as CaptureResult[];
    if (todas.length === 0) return '—';
    const comRessalva = todas.some((s) => s.quality.issues.length > 0);
    return comRessalva ? 'adequada, com ressalvas' : 'adequada';
  }, [front, back]);

  /** Monta o PDF no próprio aparelho e dispara o download local. */
  const baixarRelatorio = useCallback(async () => {
    setGerandoPdf(true);
    setErroPdf('');
    try {
      const paraRelatorio = (shot: CaptureResult | null, label: string) =>
        shot
          ? [
              {
                label,
                dataUrl: shot.dataUrl,
                width: shot.width,
                height: shot.height,
                bytes: shot.bytes,
                capturedAt: formatBrasiliaDateTime(shot.capturedAt),
                meanLuminance: shot.quality.meanLuminance,
                sharpness: shot.quality.sharpness,
                issues: shot.quality.issues.map((i) => i.message),
              },
            ]
          : [];

      const blob = await buildLabReportPdf({
        geradoEm: formatBrasiliaDateTime(new Date().toISOString()),
        sessao: {
          dispositivo: session.device,
          navegador: session.browser,
          iniciadoEm: session.startedAt ? formatBrasiliaDateTime(session.startedAt) : '-',
          telaLargura: typeof window !== 'undefined' ? window.screen.width : 0,
          telaAltura: typeof window !== 'undefined' ? window.screen.height : 0,
        },
        tipoDocumento: TIPO_DOCUMENTO,
        duracaoSegundos,
        imagens: [...paraRelatorio(front, 'FRENTE'), ...paraRelatorio(back, 'VERSO')],
        eventos: events.map((ev) => ({
          hora: formatBrasiliaTimeOnly(ev.at),
          descricao: ev.label,
        })),
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivoRelatorio(new Date());
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      pushEvent('REPORT_DOWNLOADED', 'Relatório de diagnóstico baixado');
    } catch {
      setErroPdf('Não foi possível gerar o relatório neste aparelho.');
    } finally {
      setGerandoPdf(false);
    }
  }, [back, duracaoSegundos, events, front, pushEvent, session]);

  const resetTest = useCallback(() => {
    setStep('INTRO');
    setFront(null);
    setBack(null);
    setZoomImage(null);
    setErroPdf('');
    setEvents([
      { code: 'SESSION_RESTARTED', label: 'Teste reiniciado', at: new Date().toISOString() },
    ]);
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

      {/* ETAPA 1 — APRESENTAÇÃO (o toque aqui já abre a câmera) */}
      {step === 'INTRO' && (
        <section className="space-y-5">
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[#071B3A]">
              Confirme seu documento
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              Você vai fotografar um documento de identificação com foto — RG ou CNH. São duas
              fotos: primeiro a frente, depois o verso. Leva menos de um minuto.
            </p>
          </div>

          <ul className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
            {[
              'Deixe o documento sobre uma superfície bem iluminada',
              'Evite reflexos e sombras sobre o documento',
              'Você poderá conferir cada foto antes de continuar',
            ].map((dica) => (
              <li key={dica} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4AF37]" />
                <span className="leading-5">{dica}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              pushEvent('DOCUMENT_FLOW_STARTED', 'Fluxo de captura iniciado');
              setStep('FRONT');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071B3A] py-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
          >
            <Camera className="h-4 w-4 text-[#D4AF37]" /> Fotografar documento
          </button>

          <p className="text-center text-[11px] text-slate-400">
            A câmera abre automaticamente no próximo passo.
          </p>
        </section>
      )}

      {/* ETAPA 2 — FRENTE */}
      {step === 'FRONT' && (
        <DocumentCapture
          side="FRENTE"
          title="Fotografe a frente do documento"
          helperText="Use uma superfície bem iluminada e evite reflexos."
          onConfirm={handleFrontConfirmed}
          onEvent={pushEvent}
          autoStart
        />
      )}

      {/* ETAPA 3 — VERSO */}
      {step === 'BACK' && (
        <DocumentCapture
          side="VERSO"
          title="Agora fotografe o verso do documento"
          helperText="Mesma superfície, sem sombra sobre o documento."
          onConfirm={handleBackConfirmed}
          onEvent={pushEvent}
          autoStart
        />
      )}

      {/* ETAPA 4 — DIAGNÓSTICO */}
      {step === 'RESULT' && (
        <section className="space-y-4">
          <div className="space-y-1">
            <h1 className="font-heading text-xl font-extrabold text-[#071B3A]">Teste concluído</h1>
            <p className="text-sm text-slate-500">Painel de diagnóstico do laboratório.</p>
          </div>

          {/* RELATÓRIO EM PDF — gerado no próprio aparelho */}
          <div className="space-y-2 rounded-2xl border border-[#D4AF37]/50 bg-[#FFFBF0] p-3.5">
            <div className="flex items-start gap-2">
              <Download className="mt-0.5 h-4 w-4 shrink-0 text-[#B68B1C]" />
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-[#071B3A]">Baixar diagnóstico em PDF</p>
                <p className="text-[11px] leading-4 text-slate-500">
                  Relatório completo com as fotos, as medições e todos os eventos.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void baixarRelatorio()}
              disabled={gerandoPdf}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#071B3A] py-3.5 text-sm font-extrabold text-white transition active:scale-[0.99] disabled:opacity-50"
            >
              {gerandoPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando relatório...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 text-[#D4AF37]" /> Baixar relatório em PDF
                </>
              )}
            </button>

            {erroPdf && <p className="text-[11px] font-semibold text-rose-700">{erroPdf}</p>}
          </div>

          {/* CAPTURA */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Captura
            </h2>
            <dl className="mt-2 space-y-1.5 text-xs">
              <Row label="Tipo de documento" value={TIPO_DOCUMENTO} />
              <Row label="Frente do documento" value={front ? '✓ capturada' : '— não capturada'} />
              <Row label="Verso do documento" value={back ? '✓ capturado' : '— não capturado'} />
              <Row label="Origem" value="câmera do dispositivo" />
              <Row label="Qualidade" value={qualidadeGeral} />
              <Row
                label="Duração do fluxo"
                value={duracaoSegundos > 0 ? `${duracaoSegundos} segundos` : '—'}
              />
              {front && (
                <Row label="Frente capturada em" value={formatBrasiliaDateTime(front.capturedAt)} />
              )}
              {back && (
                <Row label="Verso capturado em" value={formatBrasiliaDateTime(back.capturedAt)} />
              )}
            </dl>
          </div>

          {/* IMAGENS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Imagens capturadas
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Toque na imagem para ampliar.</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {(
                [
                  { shot: front, label: 'FRENTE' },
                  { shot: back, label: 'VERSO' },
                ]
              ).map(({ shot, label }) => (
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
