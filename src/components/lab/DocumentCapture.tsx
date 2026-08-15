'use client';

/**
 * LABORATÓRIO ASSINAJUR — Componente modular de captura de documento.
 *
 * Isolado de propósito: NÃO altera nem depende do componente de selfie
 * utilizado no fluxo de assinatura (/assinar/[token]).
 *
 * Responsabilidades separadas internamente:
 *  - controle da câmera (start/stop/permissão)
 *  - captura do quadro preservando proporção real
 *  - validação de qualidade (delegada a lib/lab/documentQuality)
 *  - preview e confirmação pelo usuário
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
   * Se o navegador recusar (permissão negada, por exemplo), o componente cai
   * no estado normal e mostra o botão "Abrir câmera" como alternativa.
   */
  autoStart?: boolean;
}

type Phase = 'IDLE' | 'STARTING' | 'LIVE' | 'REVIEW';

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
  // Garante uma unica tentativa automatica por lado do documento
  const autoStartedRef = useRef<CaptureSide | null>(null);

  const [phase, setPhase] = useState<Phase>('IDLE');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<CaptureResult | null>(null);

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

  // Garante que a câmera seja liberada ao desmontar ou trocar de lado.
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Ao mudar de frente para verso, reinicia o componente para o estado inicial.
  useEffect(() => {
    stopCamera();
    setPhase('IDLE');
    setPending(null);
    setError('');
  }, [side, stopCamera]);

  const startCamera = useCallback(async () => {
    setError('');
    setPhase('STARTING');
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        // Câmera traseira: é a adequada para fotografar documentos.
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
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
          'Precisamos da sua permissão para usar a câmera. Autorize o acesso no navegador e tente de novo.'
        );
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('Nenhuma câmera compatível foi encontrada neste aparelho.');
      } else {
        setError('Não foi possível abrir a câmera. Verifique a permissão do navegador.');
      }
    }
  }, [emit, side, stopCamera]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('A câmera ainda está carregando. Aguarde um instante e tente novamente.');
      return;
    }

    // Proporção real do quadro é sempre preservada: o canvas nasce com as
    // mesmas dimensões do vídeo e só é reduzido de forma proporcional.
    const nativeW = video.videoWidth;
    const nativeH = video.videoHeight;
    const longSide = Math.max(nativeW, nativeH);
    const scale = longSide > MAX_LONG_SIDE ? MAX_LONG_SIDE / longSide : 1;

    const targetW = Math.round(nativeW * scale);
    const targetH = Math.round(nativeH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Não foi possível processar a imagem neste navegador.');
      return;
    }
    ctx.drawImage(video, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    // Tamanho aproximado do binário a partir do comprimento do base64.
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

  // Abertura automatica da camera, uma vez por lado.
  useEffect(() => {
    if (!autoStart) return;
    if (autoStartedRef.current === side) return;
    autoStartedRef.current = side;
    void startCamera();
  }, [autoStart, side, startCamera]);

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

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">{title}</h2>
        <p className="text-sm text-slate-500">{helperText}</p>
      </div>

      {/* Área visual: proporção real preservada (object-contain), o que o
          usuário vê é exatamente o que será capturado. */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`block h-auto max-h-[60vh] w-full object-contain ${
            phase === 'LIVE' ? '' : 'hidden'
          }`}
        />

        {phase === 'LIVE' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="flex aspect-[1.586/1] w-full max-w-md items-center justify-center rounded-xl border-2 border-dashed border-[#D4AF37]/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
              <span className="px-3 text-center text-[11px] font-bold uppercase tracking-wider text-white/90">
                Posicione {side === 'FRENTE' ? 'a frente' : 'o verso'} do documento aqui
              </span>
            </div>
          </div>
        )}

        {phase === 'REVIEW' && pending && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pending.dataUrl}
            alt={`Pré-visualização d${side === 'FRENTE' ? 'a frente' : 'o verso'} do documento`}
            className="block h-auto max-h-[60vh] w-full object-contain"
          />
        )}

        {(phase === 'IDLE' || phase === 'STARTING') && (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 text-center">
            {phase === 'STARTING' ? (
              <>
                <Loader2 className="h-7 w-7 animate-spin text-[#D4AF37]" />
                <p className="text-xs font-bold text-slate-300">Abrindo a câmera...</p>
              </>
            ) : (
              <>
                <Camera className="h-8 w-8 text-slate-500" />
                <p className="max-w-xs px-6 text-xs text-slate-400">
                  Use uma superfície bem iluminada e evite reflexos.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs font-semibold text-amber-900">{error}</p>
        </div>
      )}

      {/* Botões grandes, adequados para toque em celular. */}
      {phase === 'IDLE' && (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071B3A] py-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
        >
          <Camera className="h-4 w-4 text-[#D4AF37]" /> Abrir câmera
        </button>
      )}

      {phase === 'LIVE' && (
        <button
          type="button"
          onClick={takePhoto}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] py-4 text-sm font-extrabold text-[#071B3A] transition active:scale-[0.99]"
        >
          <Camera className="h-4 w-4" /> Tirar foto
        </button>
      )}

      {phase === 'REVIEW' && pending && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={confirm}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
          >
            <Check className="h-4 w-4" /> Usar esta foto
          </button>
          <button
            type="button"
            onClick={retake}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 transition active:scale-[0.99]"
          >
            <RefreshCw className="h-4 w-4" /> Tirar novamente
          </button>

          {pending.quality.issues.some((i) => i.level === 'WARN') && (
            <p className="pt-1 text-center text-[11px] text-slate-400">
              {pending.quality.issues
                .filter((i) => i.level === 'WARN')
                .map((i) => i.message)
                .join(' ')}{' '}
              Se estiver difícil de ler, prefira refazer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
