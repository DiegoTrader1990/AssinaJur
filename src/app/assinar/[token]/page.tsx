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
  Target
} from 'lucide-react';
import { formatBrasiliaDateTime } from '@/lib/dateUtils';

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

const NOSE_TIP_IDX = 1;
const CHIN_IDX = 152;
const FOREHEAD_IDX = 10;

function computeHeadRotation(landmarks: any[]) {
  const nose = landmarks[1];
  const leftEye = landmarks[133] || landmarks[33];
  const rightEye = landmarks[362] || landmarks[263];
  const edgeA = landmarks[234];
  const edgeB = landmarks[454];
  const chin = landmarks[CHIN_IDX];
  const forehead = landmarks[FOREHEAD_IDX];

  if (!nose || !leftEye || !rightEye || !chin || !forehead) return null;

  // 1. Asimetria 2D entre o nariz e os olhos (indica giro do rosto)
  const distL = Math.abs(nose.x - leftEye.x);
  const distR = Math.abs(nose.x - rightEye.x);
  const totalDist = distL + distR;

  let eyeAsymmetry = 0;
  if (totalDist > 0) {
    eyeAsymmetry = Math.abs((distL / totalDist) - 0.50);
  }

  // 2. Diferença de profundidade 3D Z entre os olhos (MediaPipe Z-depth)
  const zDiff = (leftEye.z !== undefined && rightEye.z !== undefined) 
    ? Math.abs(leftEye.z - rightEye.z) 
    : 0;

  // 3. Asimetria das bochechas
  let cheekAsymmetry = 0;
  let spanX = 0.3;
  if (edgeA && edgeB) {
    spanX = Math.abs(edgeB.x - edgeA.x);
    if (spanX > 0) {
      cheekAsymmetry = Math.abs(((nose.x - edgeA.x) / spanX) - 0.50);
    }
  }

  // Combina as 3 métricas 3D de rotação da cabeça
  const rawTurnScore = Math.max(eyeAsymmetry * 3.5, zDiff * 4.5, cheekAsymmetry * 3.0);
  // Aplica zona morta (noise floor) de 0.12 para garantir que o rosto parado de frente fique em 0%
  const netTurnScore = Math.max(0, rawTurnScore - 0.12);

  return {
    noseX: nose.x,
    faceWidthRatio: spanX,
    turnScore: Math.min(1.0, netTurnScore),
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

export default function MobileSignaturePage({ params }: { params: { token: string } }) {
  const [step, setStep] = useState<'IDENTIFY' | 'SELFIE' | 'SIGN' | 'SUCCESS'>('IDENTIFY');
  const [signer, setSigner] = useState<SignerInfo | null>(null);
  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // CPF
  const [cpf, setCpf] = useState('');
  const [confirmingCpf, setConfirmingCpf] = useState(false);

  // Termos e Assinatura
  const [signatureMode, setSignatureMode] = useState<'DESENHADA' | 'DIGITADA'>('DESENHADA');
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
  const [activeSelfieKey, setActiveSelfieKey] = useState<SelfieKey>('center');
  const [singleRetakeKey, setSingleRetakeKey] = useState<SelfieKey | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [frameState, setFrameState] = useState<'GRAY' | 'YELLOW' | 'GREEN' | 'FLASH'>('GRAY');
  const [selfieInstruction, setSelfieInstruction] = useState('Abra a câmera para iniciar a prova de presença.');
  const [capturingSelfie, setCapturingSelfie] = useState(false);
  const [currentYaw, setCurrentYaw] = useState<number>(0.5); // 0=esquerda total, 0.5=centro, 1=direita total
  const [turnProgress, setTurnProgress] = useState<number>(0); // 0% a 100% do movimento do rosto
  const [countdownSecs, setCountdownSecs] = useState<number | null>(null); // Contagem regressiva no centro (3..2..1)

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
  const centeredStartTimeRef = useRef<number | null>(null);
  const stepStartTimestampRef = useRef<number | null>(null);

  // ── RECUPERAÇÃO DE SESSÃO LOCALSTORAGE ──
  const storageKey = `assinajur_session_${params.token}`;

  const saveSessionProgress = (override?: Partial<{ step: any; selfieImages: any; agreedConsent: any }>) => {
    try {
      const dataToSave = {
        step: override?.step ?? step,
        selfieImages: override?.selfieImages ?? selfieImages,
        agreedConsent: override?.agreedConsent ?? agreedConsent,
        updatedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch {
      /* storage desabilitado no navegador */
    }
  };

  const loadSessionProgress = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed.selfieImages) setSelfieImages(parsed.selfieImages);
      if (parsed.agreedConsent) setAgreedConsent(parsed.agreedConsent);
      if (parsed.step && parsed.step !== 'SUCCESS') setStep(parsed.step);
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
      setCpf(data.signer.cpf);
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

  // ─────────────────────────────────────────────────────────────
  // RECONHECIMENTO FACIAL REAL-TIME COM MEDIAPIPE (YAW/PITCH/ROLL)
  // ─────────────────────────────────────────────────────────────

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

    // Para etapas de perfil (left/right), inicializa o timer de passo se ainda não estiver definido
    if (currentKey !== 'center' && !stepStartTimestampRef.current) {
      stepStartTimestampRef.current = Date.now();
    }

    // ─────────────────────────────────────────────────────────────
    // FOTO 1: FRONTAL (3s REAIS COM ROSTO CENTRALIZADO)
    // ─────────────────────────────────────────────────────────────
    if (currentKey === 'center') {
      const landmarks = results?.multiFaceLandmarks?.[0];
      if (!landmarks) {
        setFrameState('GRAY');
        setSelfieInstruction('Posicione seu rosto dentro da moldura.');
        centeredStartTimeRef.current = null;
        setCountdownSecs(null);
        setTurnProgress(0);
        return;
      }

      const faceInfo = computeHeadRotation(landmarks);
      if (!faceInfo) {
        setFrameState('GRAY');
        setSelfieInstruction('Rosto dentro da moldura.');
        centeredStartTimeRef.current = null;
        setCountdownSecs(null);
        setTurnProgress(0);
        return;
      }

      const { noseX, faceWidthRatio } = faceInfo;
      setCurrentYaw(noseX);

      const isCentered = noseX >= 0.28 && noseX <= 0.72 && faceWidthRatio >= 0.12 && faceWidthRatio <= 0.80;

      if (!isCentered) {
        setFrameState('YELLOW');
        setSelfieInstruction('Olhe para a câmera e centralize o rosto.');
        centeredStartTimeRef.current = null;
        setCountdownSecs(null);
        setTurnProgress(0);
        return;
      }

      if (!centeredStartTimeRef.current) {
        centeredStartTimeRef.current = Date.now();
      }

      const elapsed = Date.now() - centeredStartTimeRef.current;
      const secsRemaining = Math.max(1, Math.ceil((3000 - elapsed) / 1000));

      setFrameState('GREEN');
      setCountdownSecs(secsRemaining);
      setSelfieInstruction(`Mantenha-se assim! Foto em ${secsRemaining}s...`);

      if (elapsed >= 3000) {
        setCountdownSecs(null);
        centeredStartTimeRef.current = null;
        stepStartTimestampRef.current = Date.now();
        triggerAutomaticCapture('center');
      }
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // FOTOS 2 E 3: PERFIL ESQUERDO E DIREITO (CAPTURA POR ROTAÇÃO REAL DA CABEÇA)
    // ─────────────────────────────────────────────────────────────
    setCountdownSecs(null);

    // Se estiver na pausa de transição (cooldown de 1.8s entre fotos), segura a seta no centro
    if (Date.now() < warmupUntilRef.current) {
      setFrameState('YELLOW');
      setTurnProgress(0);
      stabilityCounterRef.current = 0;
      return;
    }

    const landmarks = results?.multiFaceLandmarks?.[0];
    const faceInfo = landmarks ? computeHeadRotation(landmarks) : null;
    const turnScore = faceInfo ? faceInfo.turnScore : 0;

    // Progresso visual da seta (0% cravado de frente, 100% quando girar a cabeça ~30 graus)
    const prog = Math.min(100, Math.max(0, (turnScore / 0.22) * 100));
    setTurnProgress(prog);

    const dirLabel = currentKey === 'left' ? 'ESQUERDA ←' : 'DIREITA →';

    // Dispara a foto SOMENTE quando o usuário virar a cabeça com firmeza e mantiver por 3 quadros (~0.5s)
    if (turnScore >= 0.22) {
      setFrameState('GREEN');
      stabilityCounterRef.current += 1;
      setSelfieInstruction('Excelente! Mantenha a cabeça virada...');

      if (stabilityCounterRef.current >= 3) {
        triggerAutomaticCapture(currentKey);
      }
    } else {
      setFrameState('YELLOW');
      stabilityCounterRef.current = 0;
      setSelfieInstruction(`Vire o rosto para a ${dirLabel}`);
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
        /* ignora falhas de quadro individual */
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
      // Forçar proporção 4:3 padronizada (640 x 480)
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Espelha a imagem para o canvas salvar como a pessoa vê na tela
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      const updatedSelfies = { ...selfieImages, [key]: dataUrl };
      setSelfieImages(updatedSelfies);
      saveSessionProgress({ selfieImages: updatedSelfies });

      // Se for refilmagem individual de uma única foto
      if (singleRetakeKey) {
        setSelfieInstruction(`✓ Foto de ${LIVENESS_STEPS.find(s => s.key === key)?.label} atualizada com sucesso!`);
        stopSelfieCamera();
        setSingleRetakeKey(null);
        return;
      }

      // Se for a sequência automática normal das 3 fotos
      if (key === 'center') {
        activeKeyRef.current = 'left';
        setActiveSelfieKey('left');
        warmupUntilRef.current = Date.now() + 1800; // 1.8s de pausa para trocar para foto da esquerda
        setSelfieInstruction('Ótimo! Agora vire o rosto para a ESQUERDA.');
      } else if (key === 'left') {
        activeKeyRef.current = 'right';
        setActiveSelfieKey('right');
        warmupUntilRef.current = Date.now() + 1800; // 1.8s de pausa para trocar para foto da direita
        setSelfieInstruction('Perfeito! Agora vire o rosto para a DIREITA.');
      } else if (key === 'right') {
        setSelfieInstruction('✓ Prova de presença concluída com 3 fotos! Confira o resultado.');
        stopSelfieCamera();
      }
    } finally {
      setTimeout(() => {
        isCapturingRef.current = false;
        setCapturingSelfie(false);
        stabilityCounterRef.current = 0;
      }, 500);
    }
  };

  const startSelfieCamera = async (targetKey?: SelfieKey) => {
    setError('');
    const keyToStart = targetKey || 'center';
    activeKeyRef.current = keyToStart;
    setActiveSelfieKey(keyToStart);

    if (targetKey) {
      setSingleRetakeKey(targetKey);
    } else {
      setSingleRetakeKey(null);
      setSelfieImages({ center: null, left: null, right: null });
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

      const fm = await initFaceMesh();
      if (fm) {
        fm.onResults(handleFaceMeshResults);
        livenessLoop();
      }

      requestGeolocation();
    } catch {
      setError('Não foi possível acessar a câmera frontal. Verifique a permissão do navegador.');
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

  // ─────────────────────────────────────────────────────────────
  // CANVAS DE ASSINATURA DESENHADA
  // ─────────────────────────────────────────────────────────────

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
    ctx.strokeStyle = '#0B1D3D';
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

    if (!selfieComplete) {
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
          signatureType: signatureMode,
          signatureImage,
          signedConsentText: `Declaro que li e concordo com os termos do documento ${document?.title || 'documento'}, autorizo minha assinatura eletrônica e a captura das fotos de prova de presença ao vivo, nos termos da MP 2.200-2/2001 e Lei 14.063/2020.`,
          selfieCenterImage: selfieImages.center,
          selfieLeftImage: selfieImages.left,
          selfieRightImage: selfieImages.right,
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
      <div className="min-h-screen bg-[#0B1D3D] flex items-center justify-center text-white p-6 font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-gold-500" />
          <p className="text-sm font-semibold">Carregando ambiente seguro de assinatura...</p>
        </div>
      </div>
    );
  }

  if (error && !signer) {
    return (
      <div className="min-h-screen bg-[#0B1D3D] flex items-center justify-center text-white p-6 font-sans">
        <div className="max-w-md w-full bg-[#132A54] p-8 rounded-2xl border border-white/10 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold">Link de Assinatura Inválido</h1>
          <p className="text-sm text-slate-300">{error}</p>
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
    <div className="min-h-screen bg-[#0B1D3D] text-white flex flex-col justify-between p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Header Mobile */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-500 text-[#0B1D3D] font-extrabold flex items-center justify-center text-lg shadow-md">
            AJ
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
              {document?.officeName || 'AssinaJur'}
            </h1>
            <p className="text-[10px] text-gold-400 font-medium mt-0.5">Assinatura Eletrônica Jurídica</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
            {getStepProgress()}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full my-auto py-5">
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ETAPA 1: Identificação de CPF */}
        {step === 'IDENTIFY' && (
          <div className="bg-[#132A54]/90 p-6 rounded-2xl border border-white/10 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-gold-500/20 border border-gold-500/40 text-gold-400 rounded-2xl flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-gold-400/20 text-gold-300 font-bold text-[10px] uppercase">
                {document?.documentType || 'DOCUMENTO JURÍDICO'}
              </span>
              <h2 className="text-lg font-extrabold text-white">{document?.title}</h2>
              <p className="text-xs text-slate-300">
                Olá, <strong className="text-gold-400">{signer?.name}</strong>! Confirme seu CPF abaixo para acessar o documento e iniciar a prova de presença.
              </p>
            </div>

            <form onSubmit={handleConfirmCpf} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">CPF do Signatário *</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-[#0B1D3D] border border-slate-600 focus:border-gold-500 rounded-xl py-3.5 px-4 text-center font-mono text-base text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={confirmingCpf}
                className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {confirmingCpf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Autenticando...
                  </>
                ) : (
                  <>
                    Confirmar e Continuar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ETAPA 2: Prova de Presença com Câmera Real-time */}
        {step === 'SELFIE' && (
          <div className="bg-[#132A54]/90 p-5 rounded-2xl border border-emerald-500/30 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl flex items-center justify-center mx-auto">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-base font-extrabold text-white">🤳 Prova de Presença ao Vivo</h2>
              <p className="text-xs text-slate-300 leading-snug">
                Registramos 3 fotos em sequência (Frontal, Esquerda e Direita). A câmera detecta a posição e captura automaticamente.
              </p>
            </div>

            {!cameraActive && !selfieComplete && (
              <button
                type="button"
                onClick={() => startSelfieCamera('center')}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-[#0B1D3D] font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Camera className="w-4 h-4" /> Abrir Câmera do Celular
              </button>
            )}

            {/* Container da Câmera em Proporção 4:3 — AMPLIADO */}
            <div className={cameraActive ? 'space-y-3' : 'hidden'}>
              <div className={`relative rounded-2xl overflow-hidden border-4 transition-colors aspect-[3/4] sm:aspect-[4/3] bg-black ${
                frameState === 'GREEN'
                  ? 'border-emerald-400 shadow-emerald-500/50 shadow-lg'
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

                {/* Moldura guia AMPLIADA — 70% da largura e altura */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className={`w-[70%] h-[75%] rounded-[50%] border-[3px] border-dashed transition-all duration-300 ${
                    frameState === 'GREEN' ? 'border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20' 
                    : frameState === 'YELLOW' ? 'border-amber-400/70 bg-amber-500/5'
                    : 'border-white/30'
                  }`} />
                </div>

                {/* ─── CONTAGEM REGRESSIVA GRANDE NO CENTRO DA TELA (3..2..1) ─── */}
                {cameraActive && countdownSecs !== null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 bg-black/30 backdrop-blur-[2px]">
                    <div className="w-24 h-24 rounded-full bg-black/75 border-4 border-amber-400 backdrop-blur-md flex items-center justify-center shadow-2xl animate-pulse">
                      <span className="text-5xl font-black text-amber-400 font-mono tracking-tighter">
                        {countdownSecs}
                      </span>
                    </div>
                    <span className="mt-3 text-xs font-extrabold text-white bg-black/80 px-3.5 py-1.5 rounded-full border border-white/20 uppercase tracking-widest backdrop-blur-xs shadow-lg">
                      {activeSelfieKey === 'center'
                        ? 'Prepare-se: Olhe para a câmera'
                        : activeSelfieKey === 'left'
                        ? 'Prepare-se: Vire para a Esquerda ←'
                        : 'Prepare-se: Vire para a Direita →'}
                    </span>
                  </div>
                )}

                {/* ─── LINHA GUIA MINIMALISTA E SETA MÓVEL (COMEÇA NO CENTRO 50%) ─── */}
                {cameraActive && !capturingSelfie && (
                  <div className="absolute top-4 left-6 right-6 pointer-events-none z-10">
                    <div className="relative h-1.5 bg-white/20 backdrop-blur-xs rounded-full overflow-visible">
                      {/* Marcador central de referência */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/70 border border-black/40" />

                      {activeSelfieKey !== 'center' && (
                        <>
                          {/* Alvo minimalista na ponta de destino */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              activeSelfieKey === 'left' ? 'left-0' : 'right-0'
                            } ${
                              frameState === 'GREEN'
                                ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-500/50 scale-110'
                                : 'bg-amber-400/80 text-black animate-pulse'
                            }`}
                          >
                            {frameState === 'GREEN' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Target className="w-3.5 h-3.5" />}
                          </div>

                          {/* Seta móvel discreta que desliza do CENTRO (50%) até o ALVO */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center font-extrabold shadow-lg transition-all duration-100 ${
                              frameState === 'GREEN'
                                ? 'bg-emerald-400 text-black scale-110'
                                : 'bg-amber-400 text-black'
                            }`}
                            style={{
                              left:
                                activeSelfieKey === 'left'
                                  ? `calc(50% - ${(turnProgress * 0.46)}% - 14px)`
                                  : `calc(50% + ${(turnProgress * 0.46)}% - 14px)`,
                            }}
                          >
                            {activeSelfieKey === 'left' ? (
                              <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Instrução na parte inferior */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-emerald-300 text-sm font-semibold text-center py-3 px-4 backdrop-blur-sm flex items-center justify-center gap-2">
                  {capturingSelfie ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : null}
                  <span>{selfieInstruction}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-300 bg-[#0B1D3D] p-3 rounded-xl border border-white/10">
                <span className="font-semibold text-gold-400">
                  📸 {LIVENESS_STEPS.find(s => s.key === activeSelfieKey)?.label}
                </span>
                <button
                  type="button"
                  onClick={() => triggerAutomaticCapture(activeSelfieKey)}
                  disabled={capturingSelfie}
                  className="text-[11px] font-bold text-slate-300 hover:text-white underline"
                >
                  Capturar Manualmente
                </button>
              </div>
            </div>

            {/* Exibição das 3 Miniaturas 4:3 com opção de Refazer Individual */}
            {selfieComplete && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-3 gap-2.5">
                  {LIVENESS_STEPS.map((s) => (
                    <div key={s.key} className="space-y-1.5 text-center">
                      <div className="rounded-xl overflow-hidden border-2 border-emerald-500/60 aspect-[4/3] bg-black relative group">
                        {selfieImages[s.key] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selfieImages[s.key] as string}
                            alt={s.label}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <span className="absolute top-1 right-1 bg-emerald-500 text-[#0B1D3D] rounded-full p-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-300">{s.label}</p>
                      <button
                        type="button"
                        onClick={() => startSelfieCamera(s.key)}
                        className="text-[10px] text-gold-400 hover:underline flex items-center justify-center gap-1 mx-auto font-semibold"
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
                  className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                >
                  Continuar para Assinatura <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <canvas ref={selfieCanvasRef} className="hidden" />
          </div>
        )}

        {/* ETAPA 3: Quadro de Assinatura */}
        {step === 'SIGN' && (
          <form onSubmit={handleSubmitSignature} className="bg-[#132A54]/90 p-6 rounded-2xl border border-white/10 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-base font-extrabold text-white">Sua Assinatura Eletrônica</h2>
              <p className="text-xs text-slate-300">Escolha o formato e assine no quadro abaixo.</p>
            </div>

            {selfieComplete && (
              <div className="flex items-center gap-2 justify-center text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg py-2 px-3">
                <CheckCircle2 className="w-3.5 h-3.5" /> Prova de presença registrada (3 fotos 4:3)
              </div>
            )}

            <div className="flex bg-[#0B1D3D] p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setSignatureMode('DESENHADA')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  signatureMode === 'DESENHADA' ? 'bg-gold-500 text-[#0B1D3D]' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Desenhar no Touch
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('DIGITADA')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                  signatureMode === 'DIGITADA' ? 'bg-gold-500 text-[#0B1D3D]' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> Nome Digitado
              </button>
            </div>

            {signatureMode === 'DESENHADA' ? (
              <div className="bg-white rounded-xl overflow-hidden border-2 border-gold-500 relative touch-none">
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
                  className="absolute top-2 right-2 px-2.5 py-1 bg-slate-100 text-slate-600 font-bold rounded text-[10px] uppercase border border-slate-300"
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
                  className="w-full bg-[#0B1D3D] border border-gold-500 rounded-xl p-4 text-center font-serif text-lg text-gold-400 focus:outline-none"
                />
              </div>
            )}

            <label className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={agreedConsent}
                onChange={(e) => {
                  setAgreedConsent(e.target.checked);
                  saveSessionProgress({ agreedConsent: e.target.checked });
                }}
                className="w-4 h-4 text-gold-500 rounded border-slate-600 mt-0.5"
              />
              <span className="leading-snug">
                Declaro que li e concordo com os termos do documento <strong>{document?.title}</strong>, autorizo
                minha assinatura eletrônica e a captura das fotos de prova de presença ao vivo, nos termos da MP
                2.200-2/2001 e Lei 14.063/2020.
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !agreedConsent}
              className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Consolidando Certificado...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Concluir e Assinar Documento
                </>
              )}
            </button>
          </form>
        )}

        {/* TELA DE SUCESSO */}
        {step === 'SUCCESS' && (
          <div className="bg-[#132A54]/90 p-8 rounded-2xl border border-white/10 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/40 uppercase">
                Assinatura Registrada com Sucesso!
              </span>
              <h2 className="text-xl font-extrabold text-white mt-2">{document?.title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sua assinatura foi vinculada ao Certificado de Evidências Jurídicas com registro imutável.
              </p>
            </div>

            <div className="p-4 bg-[#0B1D3D] rounded-xl border border-white/10 text-xs text-slate-300 space-y-2 text-left">
              <div className="flex justify-between">
                <span>Signatário:</span>
                <strong className="text-white">{signer?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Data de Conclusão:</span>
                <strong className="text-gold-400">
                  {formatBrasiliaDateTime(signer?.signedAt || new Date())}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Uma cópia assinada com certificado e QR Code de verificação foi encaminhada ao seu escritório de advocacia.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center text-[11px] text-slate-400 pt-3 border-t border-white/10">
        © 2026 {document?.officeName || 'AssinaJur'}. Respaldado pela MP 2.200-2/2001 e Lei 14.063/2020.
      </footer>
    </div>
  );
}
