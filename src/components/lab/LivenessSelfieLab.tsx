'use client';

/**
 * LABORATÓRIO ASSINAJUR — Réplica isolada da prova de vida (liveness) usada
 * hoje em produção no fluxo real de assinatura (/assinar/[token]).
 *
 * Mesma lógica de detecção facial (MediaPipe FaceMesh) e os mesmos 3 passos
 * (frontal, perfil esquerdo, perfil direito) do fluxo real - copiados de
 * propósito, e não importados, para não tocar em nada de produção. Ficam de
 * fora deliberadamente: geolocalização, áudio guiado, e a ramificação de
 * assinante a rogo/testemunhas - irrelevantes para validar só a captura.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2 } from 'lucide-react';

type SelfieKey = 'center' | 'left' | 'right';

interface SelfieStepConfig {
  key: SelfieKey;
  label: string;
}

const LIVENESS_STEPS: SelfieStepConfig[] = [
  { key: 'center', label: 'Foto Frontal' },
  { key: 'left', label: 'Perfil Esquerdo' },
  { key: 'right', label: 'Perfil Direito' },
];

export interface LivenessResult {
  center: string;
  left: string;
  right: string;
  capturedAt: string;
}

interface LivenessSelfieLabProps {
  onConfirm: (result: LivenessResult) => void;
  onEvent?: (code: string, label: string) => void;
}

function computeFaceOrientation(landmarks: any[]) {
  const nose = landmarks[1];
  const leftEye = landmarks[133] || landmarks[33];
  const rightEye = landmarks[362] || landmarks[263];
  const edgeA = landmarks[234];
  const edgeB = landmarks[454];
  if (!nose || !leftEye || !rightEye || !edgeA || !edgeB) return null;

  const distL = Math.abs(nose.x - leftEye.x);
  const distR = Math.abs(nose.x - rightEye.x);
  const totalEyeDist = distL + distR;
  const eyeRatio = totalEyeDist > 0 ? distL / totalEyeDist : 0.5;
  const faceCenter = (edgeA.x + edgeB.x) / 2;
  const faceWidth = Math.abs(edgeB.x - edgeA.x);
  const noseRelOffset = faceWidth > 0 ? (nose.x - faceCenter) / faceWidth : 0;

  return { noseX: nose.x, faceWidthRatio: faceWidth, noseRelOffset, eyeRatio };
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar script de reconhecimento facial.'));
    document.head.appendChild(s);
  });
}

export default function LivenessSelfieLab({ onConfirm, onEvent }: LivenessSelfieLabProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeKeyRef = useRef<SelfieKey>('center');
  const isCapturingRef = useRef(false);
  const warmupUntilRef = useRef(0);
  const frontalOffsetRef = useRef<number | null>(null);
  const frontalEyeRatioRef = useRef<number | null>(null);
  const leftTurnDirRef = useRef<number | null>(null);
  const centeredStartRef = useRef<number | null>(null);
  const imagesRef = useRef<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });

  const [cameraActive, setCameraActive] = useState(false);
  const [activeKey, setActiveKey] = useState<SelfieKey>('center');
  const [frameState, setFrameState] = useState<'GRAY' | 'YELLOW' | 'GREEN' | 'FLASH'>('GRAY');
  const [instruction, setInstruction] = useState('Posicione seu rosto dentro da moldura.');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [images, setImages] = useState<Record<SelfieKey, string | null>>({ center: null, left: null, right: null });
  const [erro, setErro] = useState('');
  const [carregandoIA, setCarregandoIA] = useState(false);

  const complete = !!(images.center && images.left && images.right);

  const stopCamera = useCallback(() => {
    if (loopRef.current) {
      clearTimeout(loopRef.current);
      loopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const initFaceMesh = async () => {
    if (faceMeshRef.current) return faceMeshRef.current;
    setCarregandoIA(true);
    try {
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
      const w = window as any;
      if (!w.FaceMesh) return null;
      const fm = new w.FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      fm.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.65, minTrackingConfidence: 0.65 });
      faceMeshRef.current = fm;
      return fm;
    } catch {
      return null;
    } finally {
      setCarregandoIA(false);
    }
  };

  const triggerCapture = useCallback(
    async (key: SelfieKey) => {
      if (isCapturingRef.current) return;
      isCapturingRef.current = true;
      setCapturing(true);
      setFrameState('FLASH');

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) {
        isCapturingRef.current = false;
        setCapturing(false);
        return;
      }

      canvas.width = 560;
      canvas.height = 520;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const sw = video.videoWidth;
        const sh = video.videoHeight;
        const targetRatio = canvas.width / canvas.height;
        const sourceRatio = sw / sh;
        let sx = 0;
        let sy = 0;
        let cw = sw;
        let ch = sh;
        if (sourceRatio > targetRatio) {
          cw = sh * targetRatio;
          sx = (sw - cw) / 2;
        } else if (sourceRatio < targetRatio) {
          ch = sw / targetRatio;
          sy = (sh - ch) / 2;
        }
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const updated = { ...imagesRef.current, [key]: dataUrl };
      imagesRef.current = updated;
      setImages(updated);
      onEvent?.(
        key === 'center' ? 'SELFIE_CENTER_CAPTURED' : key === 'left' ? 'SELFIE_LEFT_CAPTURED' : 'SELFIE_RIGHT_CAPTURED',
        `Foto de perfil (${key}) capturada`
      );

      if (key === 'center') {
        activeKeyRef.current = 'left';
        setActiveKey('left');
        centeredStartRef.current = null;
        warmupUntilRef.current = Date.now() + 800;
        setInstruction('Foto 1 salva! Agora vire o rosto para a ESQUERDA.');
      } else if (key === 'left') {
        activeKeyRef.current = 'right';
        setActiveKey('right');
        centeredStartRef.current = null;
        warmupUntilRef.current = Date.now() + 800;
        setInstruction('Foto 2 salva! Agora vire o rosto para a DIREITA.');
      } else {
        setInstruction('Prova de presença concluída com 3 fotos.');
        onEvent?.('LIVENESS_COMPLETED', 'Prova de vida concluída (3 fotos)');
        stopCamera();
        setTimeout(() => {
          onConfirm({
            center: imagesRef.current.center as string,
            left: imagesRef.current.left as string,
            right: dataUrl,
            capturedAt: new Date().toISOString(),
          });
        }, 900);
      }

      setTimeout(() => {
        isCapturingRef.current = false;
        setCapturing(false);
      }, 500);
    },
    [onConfirm, onEvent, stopCamera]
  );

  const handleFaceMeshResults = useCallback(
    (results: any) => {
      if (isCapturingRef.current || !streamRef.current) return;
      const currentKey = activeKeyRef.current;

      if (Date.now() < warmupUntilRef.current) {
        setFrameState('YELLOW');
        setCountdown(null);
        centeredStartRef.current = null;
        return;
      }

      const landmarks = results?.multiFaceLandmarks?.[0];
      if (!landmarks) {
        setFrameState('GRAY');
        setInstruction('Posicione seu rosto dentro da moldura.');
        centeredStartRef.current = null;
        setCountdown(null);
        return;
      }

      const faceInfo = computeFaceOrientation(landmarks);
      if (!faceInfo) return;
      const { noseX, faceWidthRatio, noseRelOffset, eyeRatio } = faceInfo;
      const hasValidFace = noseX >= 0.15 && noseX <= 0.85 && faceWidthRatio >= 0.08 && faceWidthRatio <= 0.85;

      if (!hasValidFace) {
        setFrameState('YELLOW');
        setInstruction('Mantenha seu rosto visível dentro da moldura.');
        centeredStartRef.current = null;
        setCountdown(null);
        return;
      }

      if (currentKey === 'center') {
        const isCentered = Math.abs(noseRelOffset) <= 0.08 && noseX >= 0.28 && noseX <= 0.72;
        if (!isCentered) {
          setFrameState('YELLOW');
          setInstruction('Olhe para a câmera e centralize o rosto.');
          centeredStartRef.current = null;
          setCountdown(null);
          return;
        }
        frontalOffsetRef.current = noseRelOffset;
        frontalEyeRatioRef.current = eyeRatio;
        setFrameState('GREEN');
        if (!centeredStartRef.current) centeredStartRef.current = Date.now();
        const elapsed = Date.now() - centeredStartRef.current;
        const secs = Math.max(1, Math.ceil((3000 - elapsed) / 1000));
        setCountdown(secs);
        setInstruction(`Mantenha-se assim! Foto 1 em ${secs}s...`);
        if (elapsed >= 3000) {
          setCountdown(null);
          centeredStartRef.current = null;
          void triggerCapture('center');
        }
        return;
      }

      const baseOffset = frontalOffsetRef.current ?? 0;
      const baseEye = frontalEyeRatioRef.current ?? 0.5;
      const offsetDev = noseRelOffset - baseOffset;
      const eyeDev = eyeRatio - baseEye;
      let isPoseValid = false;

      if (currentKey === 'left') {
        isPoseValid = eyeDev <= -0.05 || offsetDev <= -0.05 || offsetDev >= 0.05;
        if (isPoseValid) leftTurnDirRef.current = Math.abs(eyeDev) > Math.abs(offsetDev) ? eyeDev : offsetDev;
      } else {
        if (leftTurnDirRef.current !== null) {
          const cur = Math.abs(eyeDev) > Math.abs(offsetDev) ? eyeDev : offsetDev;
          isPoseValid = cur * leftTurnDirRef.current < 0 && Math.abs(cur) >= 0.05;
        } else {
          isPoseValid = eyeDev >= 0.05 || offsetDev >= 0.05;
        }
      }

      if (!isPoseValid) {
        setFrameState('YELLOW');
        setInstruction(`Vire o rosto para a ${currentKey === 'left' ? 'ESQUERDA' : 'DIREITA'}.`);
        centeredStartRef.current = null;
        setCountdown(null);
        return;
      }

      setFrameState('GREEN');
      if (!centeredStartRef.current) centeredStartRef.current = Date.now();
      const elapsed = Date.now() - centeredStartRef.current;
      const secs = Math.max(1, Math.ceil((3000 - elapsed) / 1000));
      setCountdown(secs);
      setInstruction(`Excelente! Mantenha a cabeça virada (${secs}s)...`);
      if (elapsed >= 3000) {
        setCountdown(null);
        centeredStartRef.current = null;
        void triggerCapture(currentKey);
      }
    },
    [triggerCapture]
  );

  const livenessLoop = useCallback(async () => {
    if (!streamRef.current) return;
    const video = videoRef.current;
    const fm = faceMeshRef.current;
    if (!isCapturingRef.current && video && video.videoWidth > 0 && fm) {
      try {
        await fm.send({ image: video });
      } catch {}
    }
    if (streamRef.current) {
      loopRef.current = setTimeout(livenessLoop, 150);
    }
  }, []);

  const startCamera = useCallback(async () => {
    setErro('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setFrameState('GRAY');
      onEvent?.('SELFIE_CAMERA_OPENED', 'Câmera frontal aberta (liveness)');
      const fm = await initFaceMesh();
      if (fm) {
        fm.onResults(handleFaceMeshResults);
        void livenessLoop();
      } else {
        setErro('Não foi possível carregar o reconhecimento facial - use o botão de captura manual abaixo.');
      }
    } catch {
      setErro('Não foi possível acessar a câmera frontal. Verifique a permissão do navegador.');
    }
  }, [handleFaceMeshResults, livenessLoop, onEvent]);

  return (
    <section className="space-y-4">
      <div className="text-center space-y-1">
        <h1 className="font-heading text-xl font-extrabold text-[#071B3A]">
          Prova de presença (igual à de produção)
        </h1>
        <p className="text-xs text-slate-500 leading-5">
          3 fotos em sequência - frontal, perfil esquerdo e perfil direito - com detecção real de
          movimento do rosto, exatamente como no fluxo de assinatura hoje.
        </p>
      </div>

      {!cameraActive && !complete && (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071B3A] py-4 text-sm font-extrabold text-white active:scale-[0.99]"
        >
          <Camera className="h-4 w-4 text-[#D4AF37]" /> Abrir câmera do celular
        </button>
      )}

      {erro && <p className="text-center text-[11px] font-semibold text-rose-700">{erro}</p>}

      <div className={cameraActive ? 'space-y-3' : 'hidden'}>
        <div
          className={`relative aspect-[3/4] overflow-hidden rounded-3xl border-4 bg-black transition-colors sm:aspect-[4/3] ${
            frameState === 'GREEN'
              ? 'border-emerald-500 shadow-xl shadow-emerald-500/50'
              : frameState === 'YELLOW'
                ? 'border-amber-400'
                : frameState === 'FLASH'
                  ? 'animate-pulse border-white'
                  : 'border-slate-600'
          }`}
        >
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`h-[75%] w-[70%] rounded-[50%] border-[3px] border-dashed transition-all duration-300 ${
                frameState === 'GREEN'
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : frameState === 'YELLOW'
                    ? 'border-amber-400/70 bg-amber-500/5'
                    : 'border-white/30'
              }`}
            />
          </div>
          {countdown !== null && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-400 bg-black/80 shadow-2xl">
                <span className="font-mono text-5xl font-black text-amber-400">{countdown}</span>
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-[#071B3A]/90 px-4 py-3 text-center text-xs font-bold text-emerald-300">
            <span>{carregandoIA ? 'Carregando reconhecimento facial...' : instruction}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void triggerCapture(activeKeyRef.current)}
          disabled={capturing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-xs font-extrabold uppercase tracking-wider text-white active:scale-95 disabled:opacity-60"
        >
          {capturing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Capturando...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              {activeKey === 'center' && 'Tirar foto 1 (frontal)'}
              {activeKey === 'left' && 'Tirar foto 2 (perfil esquerdo)'}
              {activeKey === 'right' && 'Tirar foto 3 (perfil direito)'}
            </>
          )}
        </button>
      </div>

      {complete && (
        <div className="grid grid-cols-3 gap-2.5">
          {LIVENESS_STEPS.map((s) => (
            <div key={s.key} className="space-y-1.5 text-center">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-emerald-500 bg-black">
                {images[s.key] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[s.key] as string} alt={s.label} className="h-full w-full object-contain" />
                )}
                <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-500 p-0.5 text-white">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-700">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </section>
  );
}
