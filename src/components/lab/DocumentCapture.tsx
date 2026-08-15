'use client';

/**
 * LABORATÓRIO ASSINAJUR — Componente modular de captura de documento.
 *
 * Isolado de propósito: NÃO altera nem depende do componente de selfie
 * utilizado no fluxo de assinatura (/assinar/[token]).
 *
 * Princípio central: o que o usuário vê dentro da moldura é EXATAMENTE o que
 * é salvo. A moldura é desenhada em SVG usando as coordenadas reais do vídeo,
 * e o recorte da captura usa esse mesmo retângulo — sem medição de DOM e sem
 * divergência entre a prévia e o arquivo final.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Check, AlertTriangle, Loader2 } from 'lucide-react';
import {
  analyseCanvas,
  buildQualityReport,
  firstBlockingMessage,
  type QualityReport,
} from '@/lib/lab/documentQuality';

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
  const emitRef = useRef(onEvent);
  const autoStartedRef = useRef<CaptureSide | null>(null);

  const [phase, setPhase] = useState<Phase>('IDLE');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<CaptureResult | null>(null);
  const [videoDims, setVideoDims] = useState<{ w: number; h: number } | null>(null);

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
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

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
  }, [side, stopCamera]);

  const startCamera = useCallback(async () => {
    setError('');
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
      `${side === 'FRENTE' ? 'Frente' : 'Verso'} aprovado pelo usuário`
    );
    onConfirm(pending);
  }, [emit, onConfirm, pending, side]);

  const crop = videoDims ? computeCropRect(videoDims.w, videoDims.h) : null;

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
              <p className="text-xs font-bold text-slate-300">Abrindo a camera...</p>
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
  // O botao fica ancorado na base, respeitando a area segura do aparelho.
  const alturaMaximaVideo = { maxHeight: 'calc(100dvh - 230px)' } as const;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950">
      <div className="shrink-0 px-4 pb-2 pt-4 text-center">
        <h2 className="text-sm font-extrabold text-white">{title}</h2>
        <p className="mt-0.5 text-[11px] text-slate-300">{helperText}</p>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-2">
        <div className="relative w-fit overflow-hidden rounded-xl">
          {phase === 'LIVE' && (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (v.videoWidth) setVideoDims({ w: v.videoWidth, h: v.videoHeight });
                }}
                style={alturaMaximaVideo}
                className="block h-auto max-h-[calc(100vh-230px)] max-w-full"
              />

              {videoDims && crop && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${videoDims.w} ${videoDims.h}`}
                  preserveAspectRatio="none"
                >
                  <path
                    d={`M0,0 H${videoDims.w} V${videoDims.h} H0 Z M${crop.x},${crop.y} V${
                      crop.y + crop.h
                    } H${crop.x + crop.w} V${crop.y} Z`}
                    fill="rgba(0,0,0,0.55)"
                    fillRule="evenodd"
                  />
                  <rect
                    x={crop.x}
                    y={crop.y}
                    width={crop.w}
                    height={crop.h}
                    fill="none"
                    stroke="#D4AF37"
                    strokeWidth={Math.max(2, videoDims.w * 0.004)}
                    strokeDasharray={`${videoDims.w * 0.03} ${videoDims.w * 0.02}`}
                    rx={videoDims.w * 0.012}
                  />
                </svg>
              )}
            </>
          )}

          {phase === 'REVIEW' && pending && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pending.dataUrl}
              alt={`Pre-visualizacao d${side === 'FRENTE' ? 'a frente' : 'o verso'} do documento`}
              style={alturaMaximaVideo}
              className="block h-auto max-h-[calc(100vh-230px)] max-w-full"
            />
          )}
        </div>
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

        {phase === 'LIVE' && (
          <>
            <p className="text-center text-[11px] text-slate-300">
              Encaixe {side === 'FRENTE' ? 'a frente' : 'o verso'} do documento na moldura
            </p>
            <button
              type="button"
              onClick={takePhoto}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] py-4 text-base font-extrabold text-[#071B3A] shadow-lg transition active:scale-[0.99]"
            >
              <Camera className="h-5 w-5" /> Tirar foto
            </button>
          </>
        )}

        {phase === 'REVIEW' && pending && (
          <>
            {pending.quality.issues.some((i) => i.level === 'WARN') && (
              <p className="text-center text-[11px] text-slate-300">
                {pending.quality.issues
                  .filter((i) => i.level === 'WARN')
                  .map((i) => i.message)
                  .join(' ')}
              </p>
            )}
            <button
              type="button"
              onClick={confirm}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-extrabold text-white shadow-lg transition active:scale-[0.99]"
            >
              <Check className="h-4 w-4" /> Usar esta foto
            </button>
            <button
              type="button"
              onClick={retake}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3 text-sm font-bold text-white transition active:scale-[0.99]"
            >
              <RefreshCw className="h-4 w-4" /> Tirar novamente
            </button>
          </>
        )}
      </div>
    </div>
  );
}
