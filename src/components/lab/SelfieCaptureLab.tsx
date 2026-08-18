'use client';

/**
 * LABORATÓRIO ASSINAJUR — Captura simples de foto de perfil (selfie).
 *
 * Propósito: só validar visualmente a SEQUÊNCIA "documento → depois perfil"
 * dentro do laboratório, antes de decidir levar isso para o fluxo real de
 * assinatura. Por isso é deliberadamente simples: uma foto única, sem os 3
 * ângulos de prova de vida usados em /assinar/[token]. Não reaproveita nem
 * altera nada do componente de selfie de produção.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Check, Loader2 } from 'lucide-react';

export interface SelfieCaptureResult {
  dataUrl: string;
  width: number;
  height: number;
  capturedAt: string;
}

interface SelfieCaptureLabProps {
  onConfirm: (result: SelfieCaptureResult) => void;
  onEvent?: (code: string, label: string) => void;
}

export default function SelfieCaptureLab({ onConfirm, onEvent }: SelfieCaptureLabProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [erro, setErro] = useState('');
  const [foto, setFoto] = useState<SelfieCaptureResult | null>(null);
  const [abrindo, setAbrindo] = useState(false);

  const pararCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const abrirCamera = useCallback(async () => {
    setErro('');
    setAbrindo(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      onEvent?.('SELFIE_CAMERA_OPENED', 'Câmera frontal aberta (teste)');
    } catch {
      setErro('Não foi possível abrir a câmera frontal. Verifique a permissão do navegador.');
    } finally {
      setAbrindo(false);
    }
  }, [onEvent]);

  useEffect(() => () => pararCamera(), [pararCamera]);

  const capturar = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.translate(size, 0);
    ctx.scale(-1, 1); // espelha, como o cliente se vê no vidrinho
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const resultado: SelfieCaptureResult = {
      dataUrl,
      width: size,
      height: size,
      capturedAt: new Date().toISOString(),
    };
    setFoto(resultado);
    pararCamera();
    onEvent?.('SELFIE_CAPTURED', 'Foto de perfil capturada (teste)');
  }, [onEvent, pararCamera]);

  const refazer = useCallback(() => {
    setFoto(null);
    void abrirCamera();
  }, [abrirCamera]);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-extrabold text-[#071B3A]">Agora, sua foto de perfil</h1>
        <p className="text-sm text-slate-500">
          Com o documento já fotografado, tire uma foto de rosto — é essa foto que, na vida real,
          seria comparada com a do documento.
        </p>
      </div>

      {!foto ? (
        <div className="space-y-3">
          <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-full border-4 border-[#D4AF37]/40 bg-slate-900">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              muted
              playsInline
              className={`h-full w-full object-cover ${cameraReady ? '' : 'opacity-0'}`}
              style={{ transform: 'scaleX(-1)' }}
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white/60">
                <Camera className="h-8 w-8" />
              </div>
            )}
          </div>

          {erro && <p className="text-center text-[11px] font-semibold text-rose-700">{erro}</p>}

          {!cameraReady ? (
            <button
              type="button"
              onClick={() => void abrirCamera()}
              disabled={abrindo}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071B3A] py-4 text-sm font-extrabold text-white transition active:scale-[0.99] disabled:opacity-50"
            >
              {abrindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4 text-[#D4AF37]" />}
              {abrindo ? 'Abrindo câmera...' : 'Abrir câmera'}
            </button>
          ) : (
            <button
              type="button"
              onClick={capturar}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071B3A] py-4 text-sm font-extrabold text-white transition active:scale-[0.99]"
            >
              <Camera className="h-4 w-4 text-[#D4AF37]" /> Capturar foto de perfil
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-full border-4 border-emerald-400/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.dataUrl} alt="Foto de perfil capturada" className="h-full w-full object-cover" />
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={refazer}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3.5 text-xs font-extrabold text-slate-700 active:scale-[0.99]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refazer
            </button>
            <button
              type="button"
              onClick={() => onConfirm(foto)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#071B3A] py-3.5 text-xs font-extrabold text-white active:scale-[0.99]"
            >
              <Check className="h-3.5 w-3.5 text-[#D4AF37]" /> Confirmar e continuar
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </section>
  );
}
