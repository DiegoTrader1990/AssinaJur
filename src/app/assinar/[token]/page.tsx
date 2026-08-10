'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Edit3,
  PenTool,
  Camera,
  RotateCcw,
  Eye,
  Check,
  RefreshCw,
  Sparkles,
  ChevronRight,
  MoveLeft,
  MoveRight,
  Target,
  Volume2,
  VolumeX,
  Scale
} from 'lucide-react';
import { formatBrasiliaDateTime } from '@/lib/dateUtils';
import { maskCpfCnpj } from '@/lib/formatters';

interface SignerInfo {
  name: string;
  cpf: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  signatureType?: string;
  signedAt?: string;
}

interface DocumentInfo {
  title: string;
  documentType: string;
  status: string;
  officeName: string;
  officeLogo?: string;
  isIlliterate?: boolean;
  rogoName?: string;
  rogoCpf?: string;
  rogoRelationship?: string;
  signers: Array<{ name: string; role: string; status: string }>;
}

type SelfieKey = 'center' | 'left' | 'right';

interface SelfieStepConfig {
  key: SelfieKey;
  label: string;
  instruction: string;
  targetYaw: 'CENTER' | 'LEFT' | 'RIGHT';
}

const LIVENESS_STEPS: SelfieStepConfig[] = [
  { key: 'center', label: 'Foto Frontal', instruction: 'Olhe diretamente para a câmera e centralize seu rosto.', targetYaw: 'CENTER' },
  { key: 'left', label: 'Perfil Esquerdo', instruction: 'Vire lentamente o rosto para a ESQUERDA.', targetYaw: 'LEFT' },
  { key: 'right', label: 'Perfil Direito', instruction: 'Vire lentamente o rosto para a DIREITA.', targetYaw: 'RIGHT' },
];

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

  const eyeRatio = totalEyeDist > 0 ? distL / totalEyeDist : 0.50;

  const faceCenter = (edgeA.x + edgeB.x) / 2;
  const faceWidth = Math.abs(edgeB.x - edgeA.x);

  const noseRelOffset = faceWidth > 0 ? (nose.x - faceCenter) / faceWidth : 0;

  return {
    noseX: nose.x,
    faceWidthRatio: faceWidth,
    noseRelOffset,
    eyeRatio,
  };
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

const audioCache: Record<string, HTMLAudioElement> = {};

function unlockAndPreloadAudios() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctx.resume();
    }
    const audioFiles = ['intro', 'step1', 'step2', 'step3'];
    audioFiles.forEach((fileKey) => {
      if (!audioCache[fileKey]) {
        const audio = new Audio(`/audio/${fileKey}.mp3`);
        audio.preload = 'auto';
        audioCache[fileKey] = audio;
      }
      audioCache[fileKey].load();
    });
  } catch {
    /* destravamento silencioso */
  }
}

function playGoogleAudio(fileKey: 'intro' | 'step1' | 'step2' | 'step3', enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    Object.values(audioCache).forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });

    let targetAudio = audioCache[fileKey];
    if (!targetAudio) {
      targetAudio = new Audio(`/audio/${fileKey}.mp3`);
      audioCache[fileKey] = targetAudio;
    }

    targetAudio.currentTime = 0;
    const playPromise = targetAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.log('Autoplay audio notification:', err);
      });
    }
  } catch {
    /* falha silenciosa de áudio */
  }
}

function playShutterSound(enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    /* efeito sonoro indisponível */
  }
}

export default function MobileSignaturePage({ params }: { params: { token: string } }) {
  const [step, setStep] = useState<'IDENTIFY' | 'SELFIE' | 'SIGN' | 'SUCCESS'>('IDENTIFY');
  const [signer, setSigner] = useState<SignerInfo | null>(null);
  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const isRogadoConsent = Boolean(document?.isIlliterate && signer?.role === 'CLIENTE');
  const isRogoSigner = signer?.role === 'ASSINANTE_A_ROGO';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // CPF
  const [cpf, setCpf] = useState('');
  const [confirmingCpf, setConfirmingCpf] = useState(false);

  // Termos e Assinatura
  const [signatureMode, setSignatureMode] = useState<'SELO_DIGITAL' | 'DESENHADA' | 'DIGITADA'>('SELO_DIGITAL');
  const [typedName, setTypedName] = useState('');
  const [agreedConsent, setAgreedConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Canvas de assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Prova de Presença (3 selfies com refilmagem individual)
  const [selfieImages, setSelfieImages] = useState<Record<SelfieKey, string | null>>({
    center: null,
    left: null,
    right: null,
  });
  const selfieImagesRef = useRef<Record<SelfieKey, string | null>>({
    center: null,
    left: null,
    right: null,
  });

  const updateSelfieImages = (newImages: Record<SelfieKey, string | null>) => {
    selfieImagesRef.current = newImages;
    setSelfieImages(newImages);
  };
  const [activeSelfieKey, setActiveSelfieKey] = useState<SelfieKey>('center');
  const [singleRetakeKey, setSingleRetakeKey] = useState<SelfieKey | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [frameState, setFrameState] = useState<'GRAY' | 'YELLOW' | 'GREEN' | 'FLASH'>('GRAY');
  const [selfieInstruction, setSelfieInstruction] = useState<string>('Posicione seu rosto dentro da moldura.');
  const [capturingSelfie, setCapturingSelfie] = useState<boolean>(false);
  const [countdownSecs, setCountdownSecs] = useState<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const audioEnabledRef = useRef<boolean>(true);
  const [currentYaw, setCurrentYaw] = useState<number>(0.5);

  // Geolocalização
  const [geo, setGeo] = useState<{ lat: number | null; lng: number | null; accuracy: number | null; city: string | null; state: string | null }>({
    lat: null,
    lng: null,
    accuracy: null,
    city: null,
    state: null,
  });

  const selfieVideoRef = useRef<HTMLVideoElement | null>(null);
  const selfieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const livenessLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeKeyRef = useRef<SelfieKey>('center');
  const stabilityCounterRef = useRef<number>(0);
  const isCapturingRef = useRef<boolean>(false);
  const warmupUntilRef = useRef<number>(0);
  const frontalNoseXRef = useRef<number | null>(null);
  const frontalEyeRatioRef = useRef<number | null>(null);
  const leftTurnDirRef = useRef<number | null>(null);
  const centeredStartTimeRef = useRef<number | null>(null);

  const storageKey = `assinajur_session_${params.token}`;

  const saveSessionProgress = (override?: Partial<{ step: any; selfieImages: any; agreedConsent: any }>) => {
    try {
      const dataToSave = {
        step: override?.step ?? step,
        selfieImages: override?.selfieImages ?? selfieImagesRef.current,
        agreedConsent: override?.agreedConsent ?? agreedConsent,
        updatedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch {
      /* storage desabilitado */
    }
  };

  const loadSessionProgress = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed.selfieImages) updateSelfieImages(parsed.selfieImages);
      if (parsed.agreedConsent) setAgreedConsent(parsed.agreedConsent);

      const hasAll3Photos = Boolean(
        parsed.selfieImages?.center && parsed.selfieImages?.left && parsed.selfieImages?.right
      );

      if (parsed.step && parsed.step !== 'SUCCESS') {
        if (parsed.step === 'SIGN' && !hasAll3Photos) {
          setStep('SELFIE');
          saveSessionProgress({ step: 'SELFIE' });
        } else {
          setStep(parsed.step);
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchSignatureData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  useEffect(() => {
    return () => {
      stopSelfieCamera();
    };
  }, []);

  const fetchSignatureData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sign/${params.token}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Link de assinatura inválido ou expirado.');
      }

      setSigner(data.signer);
      setDocument(data.document);
      setCpf(maskCpfCnpj(data.signer.cpf));
      setTypedName(data.signer.name);

      if (data.signer.status === 'ASSINADO') {
        setStep('SUCCESS');
      } else {
        loadSessionProgress();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCpf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf) return;

    setConfirmingCpf(true);
    setError('');

    try {
      const res = await fetch(`/api/sign/${params.token}/confirm-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao autenticar CPF.');

      setStep('SELFIE');
      saveSessionProgress({ step: 'SELFIE' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirmingCpf(false);
    }
  };

  const initFaceMesh = async () => {
    if (faceMeshRef.current) return faceMeshRef.current;
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
    }
  };

  const handleFaceMeshResults = (results: any) => {
    if (isCapturingRef.current || !streamRef.current) return;

    const currentKey = activeKeyRef.current;

    if (Date.now() < warmupUntilRef.current) {
      setFrameState('YELLOW');
      setCountdownSecs(null);
      centeredStartTimeRef.current = null;
      return;
    }

    const landmarks = results?.multiFaceLandmarks?.[0];
    if (!landmarks) {
      setFrameState('GRAY');
      setSelfieInstruction('Posicione seu rosto dentro da moldura.');
      centeredStartTimeRef.current = null;
      setCountdownSecs(null);
      return;
    }

    const faceInfo = computeFaceOrientation(landmarks);
    if (!faceInfo) {
      setFrameState('GRAY');
      setSelfieInstruction('Rosto dentro da moldura.');
      centeredStartTimeRef.current = null;
      setCountdownSecs(null);
      return;
    }

    const { noseX, faceWidthRatio, noseRelOffset, eyeRatio } = faceInfo;
    setCurrentYaw(noseX);

    const hasValidFace = noseX >= 0.15 && noseX <= 0.85 && faceWidthRatio >= 0.08 && faceWidthRatio <= 0.85;

    if (!hasValidFace) {
      setFrameState('YELLOW');
      setSelfieInstruction('Mantenha seu rosto visível dentro da moldura.');
      centeredStartTimeRef.current = null;
      setCountdownSecs(null);
      return;
    }

    if (currentKey === 'center') {
      const isCentered = Math.abs(noseRelOffset) <= 0.08 && noseX >= 0.28 && noseX <= 0.72;

      if (!isCentered) {
        setFrameState('YELLOW');
        setSelfieInstruction('Olhe para a CÂMERA e centralize o rosto.');
        centeredStartTimeRef.current = null;
        setCountdownSecs(null);
        return;
      }

      frontalNoseXRef.current = noseRelOffset;
      frontalEyeRatioRef.current = eyeRatio;

      setFrameState('GREEN');
      if (!centeredStartTimeRef.current) {
        centeredStartTimeRef.current = Date.now();
      }

      const elapsed = Date.now() - centeredStartTimeRef.current;
      const secsRemaining = Math.max(1, Math.ceil((3000 - elapsed) / 1000));
      setCountdownSecs(secsRemaining);
      setSelfieInstruction(`Mantenha-se assim! Foto 1 em ${secsRemaining}s...`);

      if (elapsed >= 3000) {
        setCountdownSecs(null);
        centeredStartTimeRef.current = null;
        triggerAutomaticCapture('center');
      }
      return;
    }

    const baseOffset = frontalNoseXRef.current ?? 0;
    const baseEye = frontalEyeRatioRef.current ?? 0.50;

    const offsetDev = noseRelOffset - baseOffset;
    const eyeDev = eyeRatio - baseEye;

    let isPoseValid = false;

    if (currentKey === 'left') {
      isPoseValid = eyeDev <= -0.05 || offsetDev <= -0.05 || offsetDev >= 0.05;
      if (isPoseValid) {
        leftTurnDirRef.current = Math.abs(eyeDev) > Math.abs(offsetDev) ? eyeDev : offsetDev;
      }
    } else if (currentKey === 'right') {
      if (leftTurnDirRef.current !== null) {
        const curDev = Math.abs(eyeDev) > Math.abs(offsetDev) ? eyeDev : offsetDev;
        isPoseValid = (curDev * leftTurnDirRef.current) < 0 && Math.abs(curDev) >= 0.05;
      } else {
        isPoseValid = eyeDev >= 0.05 || offsetDev >= 0.05;
      }
    }

    if (!isPoseValid) {
      setFrameState('YELLOW');
      const dirLabel = currentKey === 'left' ? 'ESQUERDA ←' : 'DIREITA →';
      setSelfieInstruction(`Vire o rosto para a ${dirLabel}`);
      centeredStartTimeRef.current = null;
      setCountdownSecs(null);
      return;
    }

    setFrameState('GREEN');

    if (!centeredStartTimeRef.current) {
      centeredStartTimeRef.current = Date.now();
    }

    const elapsed = Date.now() - centeredStartTimeRef.current;
    const secsRemaining = Math.max(1, Math.ceil((3000 - elapsed) / 1000));
    setCountdownSecs(secsRemaining);

    setSelfieInstruction(`Excelente! Mantenha a cabeça virada (${secsRemaining}s)...`);

    if (elapsed >= 3000) {
      setCountdownSecs(null);
      centeredStartTimeRef.current = null;
      triggerAutomaticCapture(currentKey);
    }
  };

  const livenessLoop = async () => {
    if (!streamRef.current) return;

    const video = selfieVideoRef.current;
    const fm = faceMeshRef.current;

    if (!isCapturingRef.current && video && video.videoWidth > 0 && fm) {
      try {
        await fm.send({ image: video });
      } catch {
        /* ignora erro de quadro */
      }
    }

    if (streamRef.current) {
      livenessLoopRef.current = setTimeout(livenessLoop, 150);
    }
  };

  const triggerAutomaticCapture = async (key: SelfieKey) => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    setCapturingSelfie(true);
    setFrameState('FLASH');

    const video = selfieVideoRef.current;
    const canvas = selfieCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) {
      isCapturingRef.current = false;
      setCapturingSelfie(false);
      return;
    }

    try {
      // Geramos uma foto vertical 3:4, no enquadramento natural de selfie,
      // Celulares normalmente entregam vídeo 16:9; esticá-lo diretamente para
      // 640x480 deformava o rosto. Aqui recortamos o centro e preservamos a
      // proporção original antes de desenhar no canvas.
      canvas.width = 480;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const sourceWidth = video.videoWidth;
        const sourceHeight = video.videoHeight;
        const targetRatio = canvas.width / canvas.height;
        const sourceRatio = sourceWidth / sourceHeight;
        let sourceX = 0;
        let sourceY = 0;
        let cropWidth = sourceWidth;
        let cropHeight = sourceHeight;

        if (sourceRatio > targetRatio) {
          cropWidth = sourceHeight * targetRatio;
          sourceX = (sourceWidth - cropWidth) / 2;
        } else if (sourceRatio < targetRatio) {
          cropHeight = sourceWidth / targetRatio;
          sourceY = (sourceHeight - cropHeight) / 2;
        }

        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(
          video,
          sourceX,
          sourceY,
          cropWidth,
          cropHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );
        ctx.restore();
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      const updatedSelfies = { ...selfieImagesRef.current, [key]: dataUrl };
      updateSelfieImages(updatedSelfies);
      saveSessionProgress({ selfieImages: updatedSelfies });

      if (singleRetakeKey) {
        setSelfieInstruction(`✓ Foto de ${LIVENESS_STEPS.find(s => s.key === key)?.label} atualizada!`);
        stopSelfieCamera();
        setSingleRetakeKey(null);
        return;
      }

      playShutterSound(audioEnabledRef.current);

      if (key === 'center') {
        activeKeyRef.current = 'left';
        setActiveSelfieKey('left');
        centeredStartTimeRef.current = null;
        warmupUntilRef.current = Date.now() + 2000;
        setSelfieInstruction('✓ Foto 1 Salva! Agora vire o rosto para a ESQUERDA ←');
        playGoogleAudio('step1', audioEnabledRef.current);
      } else if (key === 'left') {
        activeKeyRef.current = 'right';
        setActiveSelfieKey('right');
        centeredStartTimeRef.current = null;
        warmupUntilRef.current = Date.now() + 2000;
        setSelfieInstruction('✓ Foto 2 Salva! Agora vire o rosto para a DIREITA →');
        playGoogleAudio('step2', audioEnabledRef.current);
      } else if (key === 'right') {
        setSelfieInstruction('✓ Prova de presença concluída com 3 fotos!');
        playGoogleAudio('step3', audioEnabledRef.current);
        stopSelfieCamera();
        setTimeout(() => {
          setStep('SIGN');
          saveSessionProgress({ step: 'SIGN', selfieImages: updatedSelfies });
        }, 1200);
      }
    } finally {
      setTimeout(() => {
        isCapturingRef.current = false;
        setCapturingSelfie(false);
        stabilityCounterRef.current = 0;
      }, 500);
    }
  };

  const startSelfieCamera = async (targetKey?: SelfieKey, isSingleRetake: boolean = false) => {
    unlockAndPreloadAudios();
    setError('');
    const keyToStart = targetKey || 'center';
    activeKeyRef.current = keyToStart;
    setActiveSelfieKey(keyToStart);

    if (isSingleRetake && targetKey) {
      setSingleRetakeKey(targetKey);
    } else {
      setSingleRetakeKey(null);
      if (!targetKey) {
        updateSelfieImages({ center: null, left: null, right: null });
      }
    }

    try {
      stopSelfieCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      if (selfieVideoRef.current) {
        selfieVideoRef.current.srcObject = stream;
        await selfieVideoRef.current.play();
      }
      setCameraActive(true);
      setFrameState('GRAY');
      stabilityCounterRef.current = 0;

      playGoogleAudio('intro', audioEnabledRef.current);

      const fm = await initFaceMesh();
      if (fm) {
        fm.onResults(handleFaceMeshResults);
        livenessLoop();
      }

      requestGeolocation();
    } catch {
      setError('Não foi possível acessar a câmera frontal. Verifique a permissão do seu navegador.');
    }
  };

  const stopSelfieCamera = () => {
    if (livenessLoopRef.current) {
      clearTimeout(livenessLoopRef.current);
      livenessLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const requestGeolocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGeo((prev) => ({ ...prev, lat: latitude, lng: longitude, accuracy }));
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
          );
          const data = await res.json();
          setGeo((prev) => ({
            ...prev,
            city: data.city || data.locality || null,
            state: data.principalSubdivision || null,
          }));
        } catch {
          /* geocodificação complementar */
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const selfieComplete = Boolean(selfieImages.center && selfieImages.left && selfieImages.right);

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#071B3A';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentSelfies = selfieImagesRef.current;
    const isComplete = Boolean(currentSelfies.center && currentSelfies.left && currentSelfies.right);

    if (!isComplete) {
      setError('Conclua a prova de presença com as 3 fotos antes de assinar.');
      return;
    }

    if (signatureMode === 'DESENHADA' && !hasDrawn) {
      setError('Por favor, desenhe sua assinatura no quadro.');
      return;
    }

    if (signatureMode === 'DIGITADA' && !typedName.trim()) {
      setError('Digite seu nome completo para assinar.');
      return;
    }

    if (!agreedConsent) {
      setError('Declaração de aceite dos termos jurídicos é obrigatória.');
      return;
    }

    let signatureImage = null;
    if (signatureMode === 'DESENHADA' && canvasRef.current) {
      signatureImage = canvasRef.current.toDataURL('image/png');
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/sign/${params.token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmCpf: cpf || signer?.cpf,
          signatureType: isRogadoConsent ? 'CONSENTIMENTO_A_ROGO' : signatureMode,
          signatureImage,
          signedConsentText: isRogadoConsent
            ? `Declaro que o documento ${document?.title || 'documento'} foi lido e explicado para mim, que compreendi e concordo com seu conteúdo e autorizo ${document?.rogoName || 'o assinante a rogo cadastrado'} a assiná-lo a meu rogo. Confirmo também a captura das fotos de prova de presença ao vivo.`
            : `Declaro que li e concordo com os termos do documento ${document?.title || 'documento'}, autorizo minha assinatura eletrônica e a captura das fotos de prova de presença ao vivo, nos termos da MP 2.200-2/2001 e Lei 14.063/2020.`,
          selfieCenterImage: currentSelfies.center,
          selfieLeftImage: currentSelfies.left,
          selfieRightImage: currentSelfies.right,
          geoLat: geo.lat,
          geoLng: geo.lng,
          geoAccuracy: geo.accuracy,
          geoCity: geo.city,
          geoState: geo.state,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar assinatura.');

      localStorage.removeItem(storageKey);
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-800 p-6 font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-[#071B3A] font-heading">Carregando ambiente de assinatura...</p>
        </div>
      </div>
    );
  }

  if (error && !signer) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-800 p-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="font-heading text-xl font-extrabold text-[#071B3A]">Link de Assinatura Inválido</h1>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  const getStepProgress = () => {
    switch (step) {
      case 'IDENTIFY': return 'Etapa 1 de 3';
      case 'SELFIE': return 'Etapa 2 de 3';
      case 'SIGN': return 'Etapa 3 de 3';
      case 'SUCCESS': return 'Concluído';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between font-sans">
      {/* Top Header Executivo Clean (Sem Banner Azul Gigante) */}
      <header className="bg-white border-b border-slate-200/80 py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#071B3A] text-white font-heading font-extrabold flex items-center justify-center text-lg shadow-md border border-white/10">
              AJ
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-[#071B3A] text-base tracking-tight leading-none">
                {document?.officeName || 'AssinaJur'}
              </h1>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Assinatura Eletrônica Jurídica</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-[#071B3A] bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-heading uppercase tracking-wider">
              {getStepProgress()}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full my-auto p-4 sm:p-6 space-y-4">
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3 font-medium">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ETAPA 1: Identificação de CPF */}
        {step === 'IDENTIFY' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase border border-blue-200 font-heading tracking-wider">
                <Scale className="w-3 h-3" /> {document?.documentType || 'DOCUMENTO JURÍDICO'}
              </span>
              <h2 className="font-heading text-xl font-extrabold text-[#071B3A]">{document?.title}</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Olá, <strong className="text-[#071B3A]">{signer?.name}</strong>! Confirme seu CPF abaixo para acessar o documento e iniciar a prova de presença ao vivo.
              </p>
            </div>

            <form onSubmit={handleConfirmCpf} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-heading">CPF do Signatário *</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(maskCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-2xl py-3.5 px-4 text-center font-mono text-lg text-[#071B3A] placeholder-slate-400 focus:outline-none font-bold tracking-wider transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={confirmingCpf}
                className="w-full py-4 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 font-heading"
              >
                {confirmingCpf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Autenticando...
                  </>
                ) : (
                  <>
                    Confirmar e Acessar Documento
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ETAPA 2: Prova de Presença com Câmera Real-time Clean */}
        {step === 'SELFIE' && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="font-heading text-base font-extrabold text-[#071B3A]">🤳 Prova de Presença ao Vivo</h2>
              <p className="text-xs text-slate-500 font-medium leading-snug">
                Registramos 3 fotos em sequência (Frontal, Esquerda e Direita). A câmera detecta a posição e captura automaticamente.
              </p>
            </div>

            {!cameraActive && !selfieComplete && (
              <button
                type="button"
                onClick={() => startSelfieCamera()}
                className="w-full py-4 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-heading"
              >
                <Camera className="w-4 h-4 text-blue-400" /> Abrir Câmera do Celular
              </button>
            )}

            {/* Container da Câmera em Proporção 4:3 */}
            <div className={cameraActive ? 'space-y-3' : 'hidden'}>
              <div className={`relative rounded-3xl overflow-hidden border-4 transition-colors aspect-[3/4] sm:aspect-[4/3] bg-black ${
                frameState === 'GREEN'
                  ? 'border-emerald-500 shadow-emerald-500/50 shadow-xl'
                  : frameState === 'YELLOW'
                  ? 'border-amber-400'
                  : frameState === 'FLASH'
                  ? 'border-white animate-pulse'
                  : 'border-slate-600'
              }`}>
                <video
                  ref={selfieVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Moldura guia */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className={`w-[70%] h-[75%] rounded-[50%] border-[3px] border-dashed transition-all duration-300 ${
                    frameState === 'GREEN' ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20' 
                    : frameState === 'YELLOW' ? 'border-amber-400/70 bg-amber-500/5'
                    : 'border-white/30'
                  }`} />
                </div>

                {/* CONTAGEM REGRESSIVA 3..2..1 NO CENTRO DA TELA */}
                {cameraActive && countdownSecs !== null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 bg-black/30 backdrop-blur-[2px]">
                    <div className="w-24 h-24 rounded-full bg-black/80 border-4 border-amber-400 backdrop-blur-md flex items-center justify-center shadow-2xl animate-pulse">
                      <span className="text-5xl font-black text-amber-400 font-mono tracking-tighter">
                        {countdownSecs}
                      </span>
                    </div>
                    <span className="mt-3 text-xs font-extrabold text-white bg-black/80 px-4 py-1.5 rounded-full border border-white/20 uppercase tracking-widest backdrop-blur-xs shadow-lg font-heading">
                      {activeSelfieKey === 'center'
                        ? 'Olhe para a câmera'
                        : activeSelfieKey === 'left'
                        ? 'Vire para a Esquerda ←'
                        : 'Vire para a Direita →'}
                    </span>
                  </div>
                )}

                {/* Botão de Controle de Som */}
                {cameraActive && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !audioEnabled;
                      setAudioEnabled(nextState);
                      audioEnabledRef.current = nextState;
                      if (nextState) {
                        playGoogleAudio('intro', true);
                      }
                    }}
                    className="absolute top-3 right-3 z-40 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full border border-white/20 backdrop-blur-md transition-all shadow-xl active:scale-95 flex items-center gap-1.5 px-3"
                    title={audioEnabled ? 'Mutar voz' : 'Ativar voz'}
                  >
                    {audioEnabled ? (
                      <>
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-heading">Voz On</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading">Mudo</span>
                      </>
                    )}
                  </button>
                )}

                {/* Instrução na parte inferior */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#071B3A]/90 text-emerald-300 text-xs font-bold text-center py-3 px-4 backdrop-blur-sm flex items-center justify-center gap-2 font-heading">
                  {capturingSelfie ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : null}
                  <span>{selfieInstruction}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200 font-medium">
                <span className="font-bold text-[#071B3A] font-heading">
                  📸 {LIVENESS_STEPS.find(s => s.key === activeSelfieKey)?.label}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase font-heading">
                  Detecção Automática
                </span>
              </div>
            </div>

            {/* Exibição das 3 Miniaturas 4:3 com opção de Refazer Individual */}
            {selfieComplete && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-3 gap-2.5">
                  {LIVENESS_STEPS.map((s) => (
                    <div key={s.key} className="space-y-1.5 text-center">
                      <div className="rounded-2xl overflow-hidden border-2 border-emerald-500 aspect-[4/3] bg-black relative group shadow-sm">
                        {selfieImages[s.key] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selfieImages[s.key] as string}
                            alt={s.label}
                            className="w-full h-full object-contain"
                          />
                        )}
                        <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-700 font-heading">{s.label}</p>
                      <button
                        type="button"
                        onClick={() => startSelfieCamera(s.key, true)}
                        className="text-[10px] text-blue-600 hover:underline flex items-center justify-center gap-1 mx-auto font-bold font-heading"
                      >
                        <RotateCcw className="w-3 h-3" /> Refazer
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep('SIGN');
                    saveSessionProgress({ step: 'SIGN' });
                  }}
                  className="w-full py-4 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm font-heading"
                >
                  Continuar para Assinatura <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            )}

            <canvas ref={selfieCanvasRef} className="hidden" />
          </div>
        )}

        {/* ETAPA 3: Quadro de Assinatura */}
        {step === 'SIGN' && (
          <form onSubmit={handleSubmitSignature} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <h2 className="font-heading text-base font-extrabold text-[#071B3A]">{isRogadoConsent ? 'Ciência e Autorização do Cliente' : isRogoSigner ? 'Assinatura Eletrônica a Rogo' : 'Sua Assinatura Eletrônica'}</h2>
              <p className="text-xs text-slate-500 font-medium">{isRogadoConsent ? 'Confirme que o documento foi lido, compreendido e que você autoriza a assinatura a rogo.' : 'Escolha o formato e assine no quadro abaixo.'}</p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3.5 font-bold font-heading">
              <span className="flex items-center gap-1.5">
                {selfieComplete ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Prova de presença registrada (3 fotos)
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" /> Fotos pendentes ou incompletas
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep('SELFIE');
                  saveSessionProgress({ step: 'SELFIE' });
                }}
                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-bold shrink-0"
              >
                <RotateCcw className="w-3 h-3" /> {selfieComplete ? 'Ver / Refazer Fotos' : 'Tirar 3 Fotos Agora'}
              </button>
            </div>

            {/* Banner de Rogo se for Cliente Analfabeto */}
            {document?.rogoName && (
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-1 text-xs shadow-2xs">
                <div className="font-heading font-black text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  Assinatura a Rogo (Art. 595 do Código Civil)
                </div>
                <p className="text-[11px] text-emerald-800 font-medium leading-tight">
                  Cliente: <strong>{document.signers.find((item) => item.role === 'CLIENTE')?.name || signer?.name}</strong> <br />
                  Acompanhante a Rogo: <strong>{document.rogoName}</strong> ({document.rogoRelationship || 'Acompanhante'}) • CPF: {maskCpfCnpj(document.rogoCpf || '')}
                </p>
              </div>
            )}

            {!isRogadoConsent && <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-heading">
              <button
                type="button"
                onClick={() => setSignatureMode('SELO_DIGITAL')}
                className={`flex-1 py-2.5 rounded-xl font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  signatureMode === 'SELO_DIGITAL' ? 'bg-[#071B3A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Selo Digital (1 Clique)
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('DESENHADA')}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                  signatureMode === 'DESENHADA' ? 'bg-[#071B3A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Desenhar
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('DIGITADA')}
                className={`flex-1 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                  signatureMode === 'DIGITADA' ? 'bg-[#071B3A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> Nome
              </button>
            </div>}

            {isRogadoConsent ? (
              <div className="p-5 bg-gradient-to-b from-blue-50 to-white rounded-2xl border-2 border-blue-200 text-center space-y-2 shadow-xs">
                <ShieldCheck className="w-9 h-9 text-blue-700 mx-auto" />
                <h3 className="font-heading font-black text-xs text-[#071B3A] uppercase tracking-wider">Manifestação eletrônica de ciência</h3>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">Esta etapa não substitui a assinatura do assinante a rogo. Ela registra sua presença, compreensão e autorização em evidência própria.</p>
              </div>
            ) : signatureMode === 'SELO_DIGITAL' ? (
              <div className="p-5 bg-gradient-to-b from-slate-50 to-white rounded-2xl border-2 border-emerald-200 text-center space-y-2 shadow-xs">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-black text-xs text-[#071B3A] uppercase tracking-wider">
                  Selo Digital de Autenticidade Registrada
                </h3>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                  Sua assinatura será vinculada com 1 clique à prova de presença biométrica ao vivo, com selo jurídico respaldado pela MP 2.200-2 e Lei 14.063/2020.
                </p>
              </div>
            ) : signatureMode === 'DESENHADA' ? (
              <div className="bg-white rounded-2xl overflow-hidden border-2 border-slate-300 focus-within:border-[#071B3A] relative touch-none shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-40 bg-white cursor-crosshair"
                />
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="absolute top-2 right-2 px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] uppercase border border-slate-200 hover:bg-slate-200 font-heading"
                >
                  Limpar
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  required
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Seu Nome Completo para Assinatura"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-[#071B3A] rounded-2xl p-4 text-center font-serif text-lg text-[#071B3A] focus:outline-none font-bold"
                />
              </div>
            )}

            <label className="flex items-start gap-3 text-xs text-slate-600 cursor-pointer pt-2 font-medium">
              <input
                type="checkbox"
                checked={agreedConsent}
                onChange={(e) => {
                  setAgreedConsent(e.target.checked);
                  saveSessionProgress({ agreedConsent: e.target.checked });
                }}
                className="w-4 h-4 text-[#071B3A] rounded border-slate-300 mt-0.5 focus:ring-[#071B3A]"
              />
              <span className="leading-relaxed">
                {isRogadoConsent ? <>
                  Declaro que o documento <strong>{document?.title}</strong> foi lido e explicado para mim, que compreendi e concordo com seu conteúdo e autorizo <strong>{document?.rogoName}</strong> a assiná-lo a meu rogo. Confirmo a captura das fotos de prova de presença ao vivo.
                </> : <>
                  Declaro que li e concordo com os termos do documento <strong>{document?.title}</strong>, autorizo minha assinatura eletrônica e a captura das fotos de prova de presença ao vivo, nos termos da MP 2.200-2/2001 e Lei 14.063/2020.
                </>}
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !agreedConsent}
              className="w-full py-4 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 font-heading"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Consolidando Certificado...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> {isRogadoConsent ? 'Confirmar Ciência e Autorização' : 'Concluir e Assinar Documento'}
                </>
              )}
            </button>
          </form>
        )}

        {/* TELA DE SUCESSO */}
        {step === 'SUCCESS' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200 uppercase tracking-wider font-heading">
                Assinatura Registrada com Sucesso!
              </span>
              <h2 className="font-heading text-xl font-extrabold text-[#071B3A] mt-2">{document?.title}</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Sua assinatura foi vinculada ao Certificado de Evidências Jurídicas com registro imutável.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2 text-left font-medium">
              <div className="flex justify-between">
                <span>Signatário:</span>
                <strong className="text-slate-900 font-bold">{signer?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Data de Conclusão:</span>
                <strong className="text-[#071B3A] font-bold font-mono">
                  {formatBrasiliaDateTime(signer?.signedAt || new Date())}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium">
              Uma cópia assinada com certificado e QR Code de verificação foi encaminhada ao seu escritório de advocacia.
            </p>
          </div>
        )}
      </main>

      {/* Footer Clean */}
      <footer className="max-w-md mx-auto w-full text-center text-[11px] text-slate-500 py-4 border-t border-slate-200/60 font-medium">
        © 2026 {document?.officeName || 'AssinaJur'}. Respaldado pela MP 2.200-2/2001 e Lei 14.063/2020.
      </footer>
    </div>
  );
}
