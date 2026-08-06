'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Lock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  ArrowRight,
  Check,
  Edit3,
  PenTool,
  Camera,
  RotateCcw,
  Eye
} from 'lucide-react';

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

const LIVENESS_STEPS: Array<{ key: SelfieKey; label: string; instruction: string }> = [
  { key: 'center', label: 'Centro', instruction: '👁️ Olhe para a câmera, de frente, sem se mexer…' },
  { key: 'left', label: 'Lado 1', instruction: '↔️ Agora vire o rosto lentamente para um lado…' },
  { key: 'right', label: 'Lado 2', instruction: '↔️ Agora vire para o lado oposto…' },
];

const NOSE_TIP_IDX = 1;
const FACE_EDGE_A_IDX = 234;
const FACE_EDGE_B_IDX = 454;
const YAW_CENTER_MIN = 0.32;
const YAW_CENTER_MAX = 0.68;
const YAW_TURN_THRESHOLD = 0.065;
const STEP_INITIAL_DELAY_CENTER_MS = 2200;
const STEP_INITIAL_DELAY_TURN_MS = 4200;
const STEP_RETRY_MS = 1500;
const MAX_AUTO_RETRIES = 20;

function computeYawRatio(landmarks: any[]): number | null {
  const nose = landmarks[NOSE_TIP_IDX];
  const edgeA = landmarks[FACE_EDGE_A_IDX];
  const edgeB = landmarks[FACE_EDGE_B_IDX];
  if (!nose || !edgeA || !edgeB) return null;
  const span = edgeB.x - edgeA.x;
  if (!span) return null;
  return (nose.x - edgeA.x) / span;
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
  const [step, setStep] = useState<'IDENTIFY' | 'OTP' | 'SELFIE' | 'SIGN' | 'SUCCESS'>('IDENTIFY');
  const [signer, setSigner] = useState<SignerInfo | null>(null);
  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulário de CPF e OTP
  const [cpf, setCpf] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [requestingOtp, setRequestingOtp] = useState(false);

  // Termos e Assinatura
  const [signatureMode, setSignatureMode] = useState<'DESENHADA' | 'DIGITADA'>('DESENHADA');
  const [typedName, setTypedName] = useState('');
  const [agreedConsent, setAgreedConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Canvas de assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Prova de presença ao vivo (3 selfies)
  const [selfieImages, setSelfieImages] = useState<Record<SelfieKey, string | null>>({
    center: null,
    left: null,
    right: null,
  });
  const [selfieStepIndex, setSelfieStepIndex] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [selfieStatus, setSelfieStatus] = useState(LIVENESS_STEPS[0].instruction);
  const [capturingSelfie, setCapturingSelfie] = useState(false);
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
  const baselineYawRef = useRef<number | null>(null);
  const centerSamplesRef = useRef<number[]>([]);
  const turnSignRef = useRef<number>(0);
  const stepIndexRef = useRef(0);
  const capturingRef = useRef(false);
  const stepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const livenessLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryRef = useRef(0);

  useEffect(() => {
    fetchSignatureData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  useEffect(() => {
    // Garante que a câmera é liberada ao sair da etapa de selfies ou ao desmontar
    return () => {
      stopSelfieCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf) return;

    setRequestingOtp(true);
    setError('');

    try {
      const res = await fetch(`/api/sign/${params.token}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao autenticar CPF.');

      setStep('OTP');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      setError('Digite o código de verificação recebido.');
      return;
    }
    setError('');
    setStep('SELFIE');
  };

  // ─────────────────────────────────────────────────────────────
  // PROVA DE PRESENÇA AO VIVO — 3 SELFIES (CENTRO, LADO 1, LADO 2)
  // ─────────────────────────────────────────────────────────────

  const clearStepTimeout = () => {
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
  };

  const scheduleStepTimeout = useCallback((source: string, delayMs: number) => {
    clearStepTimeout();
    stepTimeoutRef.current = setTimeout(async () => {
      if (capturingRef.current || stepIndexRef.current >= LIVENESS_STEPS.length || !streamRef.current) return;
      const success = await performCapture(source);
      if (!success && stepIndexRef.current < LIVENESS_STEPS.length && streamRef.current) {
        autoRetryRef.current += 1;
        if (autoRetryRef.current <= MAX_AUTO_RETRIES) {
          scheduleStepTimeout(source, STEP_RETRY_MS);
        } else {
          setSelfieStatus('Não conseguimos capturar automaticamente — use o botão abaixo para continuar manualmente.');
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, delayMs);
  }, []);

  const initFaceMesh = async () => {
    if (faceMeshRef.current) return faceMeshRef.current;
    try {
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
      const w = window as any;
      if (!w.FaceMesh) return null;
      const fm = new w.FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      fm.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      faceMeshRef.current = fm;
      return fm;
    } catch {
      return null;
    }
  };

  const handleFaceMeshResults = (results: any) => {
    if (capturingRef.current || stepIndexRef.current >= LIVENESS_STEPS.length) return;
    const landmarks = results?.multiFaceLandmarks?.[0];
    if (!landmarks) return;
    const yaw = computeYawRatio(landmarks);
    if (yaw === null) return;

    if (stepIndexRef.current === 0) {
      if (yaw >= YAW_CENTER_MIN && yaw <= YAW_CENTER_MAX) {
        centerSamplesRef.current.push(yaw);
        if (centerSamplesRef.current.length >= 3) {
          baselineYawRef.current =
            centerSamplesRef.current.reduce((a, b) => a + b, 0) / centerSamplesRef.current.length;
          performCapture('centro-detectado');
        }
      } else {
        centerSamplesRef.current = [];
      }
      return;
    }

    if (baselineYawRef.current === null) return;
    const delta = yaw - baselineYawRef.current;

    if (stepIndexRef.current === 1) {
      if (Math.abs(delta) > YAW_TURN_THRESHOLD) {
        turnSignRef.current = delta > 0 ? 1 : -1;
        performCapture('virou-lado1');
      }
      return;
    }

    if (stepIndexRef.current === 2) {
      if (turnSignRef.current !== 0 && delta * -turnSignRef.current > YAW_TURN_THRESHOLD) {
        performCapture('virou-lado2');
      }
    }
  };

  const livenessLoop = async () => {
    if (!streamRef.current || stepIndexRef.current >= LIVENESS_STEPS.length || capturingRef.current) return;
    const video = selfieVideoRef.current;
    const fm = faceMeshRef.current;
    if (video && video.videoWidth && fm) {
      try {
        await fm.send({ image: video });
      } catch {
        /* ignora falha pontual de um frame */
      }
    }
    if (streamRef.current && stepIndexRef.current < LIVENESS_STEPS.length && !capturingRef.current) {
      livenessLoopRef.current = setTimeout(livenessLoop, 150);
    }
  };

  const performCapture = async (source: string): Promise<boolean> => {
    if (capturingRef.current || stepIndexRef.current >= LIVENESS_STEPS.length) return false;
    const isManual = source === 'manual';
    const video = selfieVideoRef.current;
    const canvas = selfieCanvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      if (isManual) setError('Aguarde a câmera carregar.');
      return false;
    }

    capturingRef.current = true;
    setCapturingSelfie(true);
    clearStepTimeout();

    try {
      const maxW = 640;
      const scale = Math.min(1, maxW / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let totalBrightness = 0;
      for (let i = 0; i < pixels.length; i += 16) {
        totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      }
      const avgBrightness = totalBrightness / (pixels.length / 16);

      if (avgBrightness < 28) {
        setSelfieStatus('🔴 Foto muito escura. Acenda a luz e tente novamente.');
        if (isManual) setError('Foto muito escura. Acenda a luz!');
        return false;
      }
      if (avgBrightness > 245) {
        setSelfieStatus('🔴 Excesso de luz. Afaste-se da lâmpada e tente novamente.');
        if (isManual) setError('Excesso de luz direta. Afaste-se da lâmpada!');
        return false;
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const stepKey = LIVENESS_STEPS[stepIndexRef.current].key;
      setSelfieImages((prev) => ({ ...prev, [stepKey]: dataUrl }));

      stepIndexRef.current += 1;
      setSelfieStepIndex(stepIndexRef.current);
      autoRetryRef.current = 0;

      if (stepIndexRef.current >= LIVENESS_STEPS.length) {
        setSelfieStatus('✅ Prova de presença concluída! Confira as fotos abaixo.');
        stopSelfieCamera();
      } else {
        setSelfieStatus(LIVENESS_STEPS[stepIndexRef.current].instruction);
        scheduleStepTimeout(
          stepIndexRef.current === 1 ? 'lado1-tempo' : 'lado2-tempo',
          STEP_INITIAL_DELAY_TURN_MS
        );
      }
      return true;
    } finally {
      capturingRef.current = false;
      setCapturingSelfie(false);
    }
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
          /* geocodificação é apenas complementar, segue sem cidade/estado */
        }
      },
      () => {
        /* usuário negou permissão ou localização indisponível — segue sem geolocalização */
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const startSelfieCamera = async () => {
    setError('');
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

      stepIndexRef.current = 0;
      setSelfieStepIndex(0);
      baselineYawRef.current = null;
      centerSamplesRef.current = [];
      turnSignRef.current = 0;
      autoRetryRef.current = 0;
      setSelfieImages({ center: null, left: null, right: null });
      setSelfieStatus(LIVENESS_STEPS[0].instruction);

      const fm = await initFaceMesh();
      if (fm) {
        fm.onResults(handleFaceMeshResults);
        livenessLoop();
      }
      scheduleStepTimeout('centro-tempo', STEP_INITIAL_DELAY_CENTER_MS);

      requestGeolocation();
    } catch {
      setError('Não foi possível acessar a câmera frontal. Verifique a permissão do navegador.');
    }
  };

  const stopSelfieCamera = () => {
    clearStepTimeout();
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

  const retakeSelfies = () => {
    startSelfieCamera();
  };

  const selfieComplete = Boolean(selfieImages.center && selfieImages.left && selfieImages.right);

  // ─────────────────────────────────────────────────────────────
  // Funções do Canvas de Desenho (assinatura)
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
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
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
          otpCode,
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

      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1D3D] flex items-center justify-center text-white p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-gold-500" />
          <p className="text-sm font-semibold">Carregando ambiente seguro de assinatura...</p>
        </div>
      </div>
    );
  }

  if (error && !signer) {
    return (
      <div className="min-h-screen bg-[#0B1D3D] flex items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-[#132A54] p-8 rounded-2xl border border-white/10 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold">Link de Assinatura Inválido</h1>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1D3D] text-white flex flex-col justify-between p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Header Mobile com Marca do Escritório */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-500 text-[#0B1D3D] font-extrabold flex items-center justify-center text-lg shadow-md">
            AJ
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
              {document?.officeName || 'AssinaJur'}
            </h1>
            <p className="text-[10px] text-gold-400 font-medium mt-0.5">Assinatura Eletrônica Segura</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-500/40">
          <Lock className="w-3 h-3" /> Conexão Criptografada
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full my-auto py-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PASSO 1: Identificação de CPF */}
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
                Olá, <strong className="text-gold-400">{signer?.name}</strong>! Digite seu CPF para confirmar sua identidade e liberar a assinatura.
              </p>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seu CPF *</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-[#0B1D3D] border border-slate-600 focus:border-gold-500 rounded-xl py-3 px-4 text-center font-mono text-base text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={requestingOtp}
                className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {requestingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Confirmando CPF...
                  </>
                ) : (
                  <>
                    Continuar para Código de Verificação
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* PASSO 2: Código OTP */}
        {step === 'OTP' && (
          <div className="bg-[#132A54]/90 p-6 rounded-2xl border border-white/10 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-extrabold text-white">Código de Verificação OTP</h2>
              <p className="text-xs text-slate-300">
                Digite o código de 6 dígitos para liberar a assinatura do documento.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Código de 6 dígitos"
                  className="w-full bg-[#0B1D3D] border border-slate-600 focus:border-gold-500 rounded-xl py-3 px-4 text-center font-mono text-2xl tracking-widest text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                Validar Código
                <Check className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* PASSO 3: Prova de Presença ao Vivo (3 Selfies) */}
        {step === 'SELFIE' && (
          <div className="bg-[#132A54]/90 p-6 rounded-2xl border border-emerald-500/30 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                <Eye className="w-6 h-6" />
              </div>
              <h2 className="text-base font-extrabold text-white">🤳 Prova de Presença ao Vivo</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Olhe para a câmera e, quando indicado, vire o rosto lentamente para um lado e depois para o
                outro — o sistema captura 3 fotos sozinho, acompanhando o movimento.
              </p>
            </div>

            {!cameraActive && !selfieComplete && (
              <button
                type="button"
                onClick={startSelfieCamera}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-[#0B1D3D] font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Camera className="w-4 h-4" /> Abrir Câmera
              </button>
            )}

            {cameraActive && (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-black aspect-[4/3]">
                  <video
                    ref={selfieVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-emerald-300 text-[11px] font-semibold text-center py-2 px-3">
                    {selfieStatus}
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  {LIVENESS_STEPS.map((s, idx) => (
                    <span
                      key={s.key}
                      className={`w-2.5 h-2.5 rounded-full ${
                        idx < selfieStepIndex ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => performCapture('manual')}
                  disabled={capturingSelfie}
                  className="w-full py-2.5 bg-[#0B1D3D] border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  📸 Capturar etapa atual (manual)
                </button>
              </div>
            )}

            {selfieComplete && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {LIVENESS_STEPS.map((s) => (
                    <div key={s.key} className="space-y-1">
                      <div className="rounded-lg overflow-hidden border border-emerald-500/40 aspect-square bg-black">
                        {selfieImages[s.key] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selfieImages[s.key] as string}
                            alt={s.label}
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                          />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">{s.label}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={retakeSelfies}
                  className="w-full py-2 text-slate-400 hover:text-white font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Tirar outra foto
                </button>

                <button
                  type="button"
                  onClick={() => setStep('SIGN')}
                  className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                >
                  Continuar para Assinatura <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <canvas ref={selfieCanvasRef} className="hidden" />
          </div>
        )}

        {/* PASSO 4: Quadro de Assinatura (Desenho ou Nome Digitado) */}
        {step === 'SIGN' && (
          <form onSubmit={handleSubmitSignature} className="bg-[#132A54]/90 p-6 rounded-2xl border border-white/10 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-base font-extrabold text-white">Sua Assinatura Eletrônica</h2>
              <p className="text-xs text-slate-300">Escolha o formato e assine no quadro abaixo.</p>
            </div>

            {selfieComplete && (
              <div className="flex items-center gap-2 justify-center text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg py-2 px-3">
                <CheckCircle2 className="w-3.5 h-3.5" /> Prova de presença ao vivo registrada
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
                onChange={(e) => setAgreedConsent(e.target.checked)}
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Registrando Assinatura...
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
                Sua assinatura foi vinculada ao Certificado de Evidências Jurídicas e está armazenada com segurança.
              </p>
            </div>

            <div className="p-4 bg-[#0B1D3D] rounded-xl border border-white/10 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between">
                <span>Signatário:</span>
                <strong className="text-white">{signer?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Data de Conclusão:</span>
                <strong className="text-gold-400">
                  {signer?.signedAt ? new Date(signer.signedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')} (UTC)
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Você pode fechar esta tela. Uma cópia do documento assinado foi enviada ao seu escritório de advocacia.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center text-[11px] text-slate-400 pt-4 border-t border-white/10">
        © 2026 {document?.officeName || 'AssinaJur'}. Protegido nos termos da MP 2.200-2/2001 e Lei 14.063/2020.
      </footer>
    </div>
  );
}
