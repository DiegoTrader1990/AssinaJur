'use client';

/**
 * ASSINAJUR — Captura do documento de identificação do cliente (RG/CNH),
 * usada no fluxo real de assinatura (/assinar/[token]), antes da prova de
 * presença (selfie). Evidência complementar: nunca bloqueia a assinatura -
 * se a validação por IA falhar ou não identificar o documento com certeza,
 * o cliente pode seguir assim mesmo, e o escritório confere a foto depois.
 *
 * Princípio central: o que o usuário vê dentro da moldura é EXATAMENTE o que
 * é salvo. A moldura ocupa a tela inteira (câmera recortada por CSS), e o
 * recorte da captura usa esse mesmo retângulo - sem medição de DOM e sem
 * divergência entre a prévia e o arquivo final.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Check, AlertTriangle, Loader2 } from 'lucide-react';
import {
  analyseCanvas,
  buildQualityReport,
  captureQualityMessage,
  captureQualityStatus,
  firstBlockingMessage,
  type QualityReport,
} from '@/lib/assinatura/documentQuality';

/** Maior dimensão da imagem final — equilibra legibilidade e peso do upload. */
const MAX_LONG_SIDE = 2000;
const JPEG_QUALITY = 0.92;
/** Proporção aproximada de RG e CNH abertos (padrão ID-2/ID-3). */
const CROP_ASPECT = 1.586;
/** Folga entre a moldura e a borda do quadro. */
const CROP_MARGIN = 0.94;

export type CaptureSide = 'FRENTE' | 'VERSO';

export interface CaptureResult {
  side: CaptureSide;
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  capturedAt: string;
  source: 'camera';
  quality: QualityReport;
}

interface DocumentCaptureProps {
  side: CaptureSide;
  title: string;
  helperText: string;
  onConfirm: (result: CaptureResult) => void;
  onEvent?: (code: string, label: string) => void;
  /**
   * Abre a câmera assim que o componente monta, poupando um toque do usuário.
   * Se o navegador recusar, o componente cai no estado normal e mostra o botão
   * "Abrir câmera" como alternativa.
   */
  autoStart?: boolean;
}

type Phase = 'IDLE' | 'STARTING' | 'LIVE' | 'REVIEW';
type LiveReadiness = 'ANALYSING' | 'ADJUST' | 'READY';

/**
 * Retângulo de recorte, em pixels do vídeo. É a única fonte de verdade:
 * alimenta tanto o desenho da moldura quanto o recorte da foto.
 */
function computeCropRect(vw: number, vh: number) {
  let w = vw * CROP_MARGIN;
  let h = w / CROP_ASPECT;
  if (h > vh * CROP_MARGIN) {
    h = vh * CROP_MARGIN;
    w = h * CROP_ASPECT;
  }
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
}

export default function DocumentCapture({
  side,
  title,
  helperText,
  onConfirm,
  onEvent,
  autoStart = false,
}: DocumentCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const emitRef = useRef(onEvent);
  const autoStartedRef = useRef<CaptureSide | null>(null);
  const autoCaptureRef = useRef(false);
  const stableFramesRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('IDLE');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<CaptureResult | null>(null);
  const [videoDims, setVideoDims] = useState<{ w: number; h: number } | null>(null);
  const [liveReadiness, setLiveReadiness] = useState<LiveReadiness>('ANALYSING');
  const [liveHint, setLiveHint] = useState('Preparando a validação da imagem...');
  // Contagem regressiva ao apertar o botão de disparo (mesmo comportamento
  // da câmera de selfie) - dá tempo da pessoa reposicionar o documento
  // depois de já ter apertado, em vez de fotografar no instante do toque.
  const [countdownSecs, setCountdownSecs] = useState<number | null>(null);
  const countdownTimeoutRef = useRef<number | null>(null);
  // Espelha liveReadiness em ref para ser lido dentro do tick() do
  // countdown sem depender de closures desatualizadas - se a qualidade
  // deixar de estar "READY" no meio da contagem, ela reinicia.
  const liveReadinessRef = useRef<LiveReadiness>('ANALYSING');
  // Instrução falada UMA VEZ por lado (frente/verso), quando a câmera abre -
  // nunca em loop. Usa a Web Speech API (não depende de arquivo de áudio
  // pré-gravado, então funciona para qualquer texto sem gerar novo asset).
  const spokenSideRef = useRef<CaptureSide | null>(null);

  useEffect(() => {
    emitRef.current = onEvent;
  }, [onEvent]);

  const emit = useCallback((code: string, label: string) => {
    emitRef.current?.(code, label);
  }, []);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
    setCountdownSecs(null);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!frameEl) return;
    // Medição imediata - não espera o primeiro disparo do ResizeObserver.
    setFrameWidth(frameEl.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width) setFrameWidth(width);
    });
    observer.observe(frameEl);
    return () => observer.disconnect();
  }, [frameEl]);

  // O vídeo só existe no DOM depois que a fase muda para LIVE. Em celulares,
  // tentar atribuir o stream antes dessa renderização ativa a câmera (ponto
  // verde), mas deixa a prévia preta. Fazemos a conexão após o elemento existir.
  useEffect(() => {
    if (phase !== 'LIVE') return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    const connectVideo = async () => {
      try {
        await video.play();
        if (video.videoWidth && video.videoHeight) {
          setVideoDims({ w: video.videoWidth, h: video.videoHeight });
        }
      } catch {
        setError('A câmera foi ativada, mas a imagem não pôde ser exibida. Feche e abra a câmera novamente.');
      }
    };
    video.onloadedmetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        setVideoDims({ w: video.videoWidth, h: video.videoHeight });
      }
      void connectVideo();
    };
    void connectVideo();
    return () => {
      video.onloadedmetadata = null;
    };
  }, [phase]);

  // Ao trocar de lado, reinicia o componente para o estado inicial.
  useEffect(() => {
    stopCamera();
    setPhase('IDLE');
    setPending(null);
    setError('');
    setVideoDims(null);
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
    setCountdownSecs(null);
  }, [side, stopCamera]);

  const startCamera = useCallback(async () => {
    setError('');
    // Fala antes de abrir a câmera. No Safari, falar depois do await da
    // permissão pode ser bloqueado por não estar mais ligado ao toque.
    if (spokenSideRef.current !== side && typeof window !== 'undefined' && window.speechSynthesis) {
      spokenSideRef.current = side;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          side === 'FRENTE'
            ? 'Agora vamos fotografar a frente do documento. Aperte o botão quando estiver pronto.'
            : 'Agora vamos fotografar o verso do documento. Aperte o botão quando estiver pronto.'
        );
        utterance.lang = 'pt-BR';
        utterance.rate = 1;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
    setPhase('STARTING');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setPhase('IDLE');
        setError('Este navegador não liberou acesso seguro à câmera. Abra este endereço diretamente no Chrome ou Safari, fora do navegador interno do WhatsApp ou Instagram.');
        return;
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        // Câmera traseira: a adequada para fotografar documentos.
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setPhase('LIVE');
      emit('CAMERA_PERMITTED', 'Permissão da câmera concedida');
      emit(
        side === 'FRENTE' ? 'CAMERA_FRONT_OPENED' : 'CAMERA_BACK_OPENED',
        `Câmera aberta para ${side === 'FRENTE' ? 'a frente' : 'o verso'} do documento`
      );
    } catch (err) {
      const name = (err as { name?: string })?.name || '';
      setPhase('IDLE');
      emit('CAMERA_DENIED', 'Permissão da câmera negada ou indisponível');
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError(
          'A câmera foi bloqueada pelo navegador. Abra este endereço diretamente no Chrome ou Safari, permita a câmera para o AssinaJur e toque novamente em "Abrir câmera".'
        );
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('Nenhuma câmera compatível foi encontrada neste aparelho.');
      } else {
        setError('Não foi possível abrir a câmera. Toque em "Abrir câmera" para tentar de novo.');
      }
    }
  }, [emit, side, stopCamera]);

  // Abertura automática, uma única vez por lado.
  useEffect(() => {
    if (!autoStart) return;
    if (autoStartedRef.current === side) return;
    autoStartedRef.current = side;
    void startCamera();
  }, [autoStart, side, startCamera]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('A câmera ainda está carregando. Aguarde um instante e tente novamente.');
      return;
    }

    const nativeW = video.videoWidth;
    const nativeH = video.videoHeight;

    // Recorta exatamente a área da moldura que o usuário viu.
    const crop = computeCropRect(nativeW, nativeH);
    const escala = Math.min(1, MAX_LONG_SIDE / Math.max(crop.w, crop.h));
    const targetW = Math.round(crop.w * escala);
    const targetH = Math.round(crop.h * escala);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Não foi possível processar a imagem neste navegador.');
      return;
    }
    ctx.drawImage(video, crop.x, crop.y, crop.w, crop.h, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
    const bytes = Math.round(base64Length * 0.75);

    const { meanLuminance, sharpness } = analyseCanvas(canvas);
    const quality = buildQualityReport({
      width: targetW,
      height: targetH,
      bytes,
      meanLuminance,
      sharpness,
    });

    if (!quality.acceptable) {
      setError(firstBlockingMessage(quality));
      emit(
        side === 'FRENTE' ? 'FRONT_REJECTED' : 'BACK_REJECTED',
        `Captura ${side === 'FRENTE' ? 'da frente' : 'do verso'} recusada pela validação de qualidade`
      );
      return;
    }

    setError('');
    setPending({
      side,
      dataUrl,
      width: targetW,
      height: targetH,
      bytes,
      capturedAt: new Date().toISOString(),
      source: 'camera',
      quality,
    });
    setPhase('REVIEW');
    stopCamera();
    emit(
      side === 'FRENTE' ? 'FRONT_CAPTURED' : 'BACK_CAPTURED',
      `${side === 'FRENTE' ? 'Frente' : 'Verso'} capturado`
    );
  }, [emit, side, stopCamera]);

  const DOCUMENT_CAPTURE_COUNTDOWN_SECS = 5;

  // Apertar "Tirar foto" não fotografa na hora - dispara uma contagem
  // regressiva de 5s (mesmo comportamento da câmera de selfie), dando tempo
  // da pessoa reposicionar o documento na moldura depois de já ter apertado.
  const handleShutterPress = useCallback(() => {
    if (countdownTimeoutRef.current) return;
    let secsLeft = DOCUMENT_CAPTURE_COUNTDOWN_SECS;
    setCountdownSecs(secsLeft);
    const tick = () => {
      // Se a imagem deixou de estar com qualidade aprovada durante a espera
      // (documento saiu da moldura, ficou fora de foco, perdeu luz etc.), a
      // contagem reinicia do zero em vez de continuar e tirar uma foto ruim.
      if (liveReadinessRef.current !== 'READY') {
        secsLeft = DOCUMENT_CAPTURE_COUNTDOWN_SECS;
        setCountdownSecs(secsLeft);
        countdownTimeoutRef.current = window.setTimeout(tick, 1000);
        return;
      }
      secsLeft -= 1;
      if (secsLeft <= 0) {
        setCountdownSecs(null);
        countdownTimeoutRef.current = null;
        takePhoto();
        return;
      }
      setCountdownSecs(secsLeft);
      countdownTimeoutRef.current = window.setTimeout(tick, 1000);
    };
    countdownTimeoutRef.current = window.setTimeout(tick, 1000);
  }, [takePhoto]);

  // A análise ocorre na área exata da moldura, só para dar feedback de
  // qualidade em tempo real - a captura em si é sempre manual (botão).
  useEffect(() => {
    if (phase !== 'LIVE' || !videoDims) return;
    autoCaptureRef.current = false;
    stableFramesRef.current = 0;
    liveReadinessRef.current = 'ANALYSING';
    setLiveReadiness('ANALYSING');
    setLiveHint('Posicione o documento inteiro dentro da moldura.');

    const evaluate = () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight || autoCaptureRef.current) return;
      const crop = computeCropRect(video.videoWidth, video.videoHeight);
      const scale = Math.min(1, 480 / crop.w);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(crop.w * scale);
      canvas.height = Math.round(crop.h * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
      const { meanLuminance, sharpness } = analyseCanvas(canvas);
      const clearEnough = meanLuminance >= 65 && meanLuminance <= 245 && sharpness >= 90;

      if (!clearEnough) {
        stableFramesRef.current = 0;
        liveReadinessRef.current = 'ADJUST';
        setLiveReadiness('ADJUST');
        setLiveHint(
          meanLuminance < 65
            ? 'Aproxime-se de uma luz melhor antes de fotografar.'
            : sharpness < 90
              ? 'Aguarde o foco ficar nítido e mantenha o celular parado.'
              : 'Reduza o reflexo sobre o documento.'
        );
        return;
      }

      stableFramesRef.current += 1;
      liveReadinessRef.current = 'READY';
      setLiveReadiness('READY');
      setLiveHint('Imagem legível. Toque em "Tirar foto" quando quiser.');
    };

    const interval = window.setInterval(evaluate, 300);
    return () => window.clearInterval(interval);
  }, [phase, takePhoto, videoDims]);

  // A validação automática por IA (chamada a /api/sign/documento/validar) foi
  // removida daqui: ela nunca bloqueava o envio (a foto sempre podia ser usada
  // mesmo sem confirmação), então só estava deixando o cliente esperando uma
  // resposta de rede sem necessidade real - a conferência de qualidade da
  // foto continua acontecendo (ver reviewStatus/captureQualityStatus abaixo),
  // só a checagem "isso é um documento?" via IA que foi tirada do caminho.

  const retake = useCallback(() => {
    setPending(null);
    setError('');
    emit(
      side === 'FRENTE' ? 'FRONT_RETAKE' : 'BACK_RETAKE',
      `Usuário optou por refazer ${side === 'FRENTE' ? 'a frente' : 'o verso'}`
    );
    void startCamera();
  }, [emit, side, startCamera]);

  const confirm = useCallback(() => {
    if (!pending) return;
    emit(
      side === 'FRENTE' ? 'FRONT_APPROVED' : 'BACK_APPROVED',
      `${side === 'FRENTE' ? 'Frente' : 'Verso'} aprovado`
    );
    onConfirm(pending);
  }, [emit, onConfirm, pending, side]);

  const crop = videoDims ? computeCropRect(videoDims.w, videoDims.h) : null;
  const reviewStatus = pending ? captureQualityStatus(pending.quality) : null;

  // Antes de abrir a camera: cartao compacto no fluxo normal da pagina.
  if (phase === 'IDLE' || phase === 'STARTING') {
    return (
      <div className="flex flex-col gap-3">
        <div className="space-y-0.5 text-center">
          <h2 className="font-heading text-base font-extrabold text-[#071B3A]">{title}</h2>
          <p className="text-xs text-slate-500">{helperText}</p>
        </div>

        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900 text-center">
          {phase === 'STARTING' ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-[#D4AF37]" />
              <p className="text-xs font-bold text-slate-300">Abrindo a câmera...</p>
            </>
          ) : (
            <>
              <Camera className="h-8 w-8 text-slate-500" />
              <p className="max-w-xs px-6 text-xs text-slate-400">
                Toque em “Abrir câmera” para iniciar a captura.
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs font-semibold text-amber-900">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void startCamera()}
          disabled={phase === 'STARTING'}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071B3A] py-4 text-sm font-extrabold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          <Camera className="h-4 w-4 text-[#D4AF37]" /> Abrir câmera
        </button>
      </div>
    );
  }

  // Camera aberta ou revisao: ocupa a tela inteira, sem rolagem possivel.

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <div className="shrink-0 px-4 pb-2 pt-4 text-center">
        <h2 className="text-sm font-extrabold text-[#071B3A]">{title}</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">{helperText}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2">
        <div
          ref={setFrameEl}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border-4 border-[#D4AF37]/70 bg-slate-900"
          style={{ aspectRatio: String(CROP_ASPECT) }}
        >
          {phase === 'LIVE' && (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth) setVideoDims({ w: v.videoWidth, h: v.videoHeight });
              }}
              style={
                videoDims && crop && frameWidth
                  ? {
                      position: 'absolute' as const,
                      top: 0,
                      left: 0,
                      width: `${videoDims.w * (frameWidth / crop.w)}px`,
                      height: `${videoDims.h * (frameWidth / crop.w)}px`,
                      transform: `translate(${-crop.x * (frameWidth / crop.w)}px, ${-crop.y * (frameWidth / crop.w)}px)`,
                      maxWidth: 'none',
                    }
                  : { opacity: 0 }
              }
              className="block"
            />
          )}

          {phase === 'REVIEW' && pending && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pending.dataUrl}
              alt={`Pre-visualizacao d${side === 'FRENTE' ? 'a frente' : 'o verso'} do documento`}
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}

          {phase === 'LIVE' && (
            <>
              {/* Aviso de qual etapa está ativa, sempre visível dentro do
                  próprio quadro da câmera - a mesma mensagem que é falada
                  uma vez ao abrir, para quem está sem som ou perdeu o áudio. */}
              <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/85 to-transparent px-4 pb-6 pt-3 text-center">
                <span className="text-xs font-extrabold text-white drop-shadow">
                  {side === 'FRENTE' ? '📄 Fotografe a FRENTE do documento' : '📄 Fotografe o VERSO do documento'}
                </span>
              </div>

              <div className="absolute inset-x-0 top-14 z-10 flex justify-center px-4">
                <div
                  className={`rounded-xl border px-3 py-2 text-center text-xs font-extrabold shadow-lg ${
                    liveReadiness === 'READY'
                      ? 'border-emerald-300/70 bg-emerald-950/80 text-emerald-50'
                      : liveReadiness === 'ADJUST'
                        ? 'border-amber-300/70 bg-amber-950/80 text-amber-50'
                        : 'border-[#D4AF37]/60 bg-slate-950/80 text-white'
                  }`}
                >
                  {liveReadiness === 'READY'
                    ? 'Qualidade aprovada'
                    : liveReadiness === 'ADJUST'
                      ? 'Ajuste antes de fotografar'
                      : 'Analisando a imagem'}
                </div>
              </div>

              {/* Botão de disparo estilo câmera, dentro do próprio quadro
                  (mesmo padrão da câmera de selfie). Ao apertar, dispara a
                  contagem regressiva de 5s antes de fotografar. */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-4">
                <button
                  type="button"
                  onClick={handleShutterPress}
                  disabled={countdownSecs !== null}
                  aria-label="Tirar foto"
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[5px] border-white/40 bg-white shadow-2xl transition-transform active:scale-90 disabled:opacity-70"
                >
                  {countdownSecs !== null ? (
                    <span className="font-mono text-xl font-black text-[#071B3A]">{countdownSecs}</span>
                  ) : (
                    <Camera className="h-7 w-7 text-[#071B3A]" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {phase === 'LIVE' && (
          <p className="w-full max-w-sm px-2 pt-2 text-center text-[11px] font-semibold text-slate-600">
            Toque no botão e fique com o documento parado - a foto é tirada automaticamente após a contagem de 5 segundos.
          </p>
        )}

        {phase === 'REVIEW' && pending && (
          <div className="w-full max-w-sm space-y-2 px-2 pt-2">
            {reviewStatus === 'CAUTION' && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2.5 text-center text-xs font-bold text-amber-100">
                <p>Confira antes de continuar</p>
                <p className="mt-0.5 text-[11px] font-medium opacity-90">{captureQualityMessage(pending.quality)}</p>
              </div>
            )}
            <button
              type="button"
              onClick={confirm}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-extrabold text-white shadow-lg transition hover:bg-emerald-500 active:scale-[0.99]"
            >
              <Check className="h-4 w-4" /> Continuar
            </button>
            <button
              type="button"
              onClick={retake}
              className="flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 transition hover:text-[#071B3A] active:scale-[0.99]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Tirar outra foto
            </button>
          </div>
        )}
      </div>

      <div
        className="shrink-0 space-y-2 px-4 pt-2"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 p-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-[11px] font-semibold text-amber-100">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
