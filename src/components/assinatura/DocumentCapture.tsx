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
 *
 * Visual: o componente vive DENTRO do card branco padrão do fluxo de
 * assinatura (mesmo estilo da etapa de prova de presença) - nunca assume a
 * tela inteira nem troca a identidade visual clara do restante da página.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Check, AlertTriangle, Loader2 } from 'lucide-react';
import {
  analyseCanvas,
  buildQualityReport,
  captureQualityMessage,
  captureQualityStatus,
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
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Permissão de câmera negada. Toque no ícone de cadeado/câmera na barra do navegador e permita o acesso para continuar.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('Não encontramos uma câmera disponível neste aparelho.');
      } else {
        setError('Não foi possível abrir a câmera. Tente novamente.');
      }
    }
  }, [emit, side, stopCamera]);

  useEffect(() => {
    if (!autoStart) return;
    if (autoStartedRef.current === side) return;
    autoStartedRef.current = side;
    void startCamera();
  }, [autoStart, side, startCamera]);

  const crop = videoDims ? computeCropRect(videoDims.w, videoDims.h) : null;

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const cropRect = computeCropRect(video.videoWidth, video.videoHeight);
    const longSide = Math.max(cropRect.w, cropRect.h);
    const scale = longSide > MAX_LONG_SIDE ? MAX_LONG_SIDE / longSide : 1;
    const outW = Math.round(cropRect.w * scale);
    const outH = Math.round(cropRect.h * scale);

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, cropRect.x, cropRect.y, cropRect.w, cropRect.h, 0, 0, outW, outH);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const bytes = Math.round((dataUrl.length * 3) / 4);
    const { meanLuminance, sharpness } = analyseCanvas(canvas);
    const quality = buildQualityReport({ width: outW, height: outH, bytes, meanLuminance, sharpness });

    stopCamera();
    setPending({
      side,
      dataUrl,
      width: outW,
      height: outH,
      bytes,
      capturedAt: new Date().toISOString(),
      source: 'camera',
      quality,
    });
    setPhase('REVIEW');
    emit(side === 'FRENTE' ? 'FRONT_CAPTURED' : 'BACK_CAPTURED', `Foto ${side === 'FRENTE' ? 'da frente' : 'do verso'} capturada`);
  }, [emit, side, stopCamera]);

  const retake = useCallback(() => {
    setPending(null);
    void startCamera();
  }, [startCamera]);

  const confirm = useCallback(() => {
    if (!pending) return;
    onConfirm(pending);
  }, [onConfirm, pending]);

  // Antes de abrir a camera: cartao compacto no fluxo normal da pagina.
  if (phase === 'IDLE' || phase === 'STARTING') {
    return (
      <div className="flex flex-col gap-3">
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

  // Camera aberta ou revisao: continua dentro do card branco padrao da
  // pagina de assinatura, sem tomar a tela inteira nem trocar a identidade
  // visual clara do restante do fluxo.
  return (
    <div className="flex flex-col gap-3">
      <div
        ref={setFrameEl}
        className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border-4 border-[#D4AF37]/70 bg-slate-900"
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
      </div>

      {phase === 'LIVE' && (
        <div className="mx-auto w-full max-w-sm">
          <button
            type="button"
            onClick={takePhoto}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071B3A] py-4 text-sm font-extrabold text-white shadow-lg transition active:scale-[0.99]"
          >
            <Camera className="h-4 w-4 text-[#D4AF37]" /> Tirar foto
          </button>
        </div>
      )}

      {phase === 'REVIEW' && pending && (
        <div className="mx-auto w-full max-w-sm space-y-2">
          {(() => {
            const status = captureQualityStatus(pending.quality);
            const approved = status === 'GOOD';
            const caution = status === 'CAUTION';
            return (
              <div className={`rounded-xl border p-3 ${approved ? 'border-emerald-200 bg-emerald-50' : caution ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
                <p className={`text-xs font-extrabold ${approved ? 'text-emerald-800' : caution ? 'text-amber-900' : 'text-rose-800'}`}>
                  {approved ? '✓ Qualidade aprovada' : caution ? 'Atenção à qualidade' : 'Foto precisa ser refeita'}
                </p>
                <p className={`mt-1 text-[11px] font-medium ${approved ? 'text-emerald-700' : caution ? 'text-amber-800' : 'text-rose-700'}`}>
                  {captureQualityMessage(pending.quality)}
                </p>
              </div>
            );
          })()}
          <button
            type="button"
            onClick={confirm}
            disabled={captureQualityStatus(pending.quality) !== 'GOOD'}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-extrabold text-white shadow-lg transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            <Check className="h-4 w-4" /> {captureQualityStatus(pending.quality) === 'GOOD' ? 'Continuar' : 'Tire outra foto para aprovar'}
          </button>
          <button
            type="button"
            onClick={retake}
            className="flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 transition hover:text-slate-700 active:scale-[0.99]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Tirar outra foto
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs font-semibold text-amber-900">{error}</p>
        </div>
      )}
    </div>
  );
}
