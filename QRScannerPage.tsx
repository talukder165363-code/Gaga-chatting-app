import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { ChevronLeft, Search, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface QRScannerPageProps {
  onBack: () => void;
  onAddFriend: (id: string) => void;
}

const QRScannerPage = ({ onBack, onAddFriend }: QRScannerPageProps) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [manualId, setManualId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { user } = useAuth();

  const myId = useMemo(() => user?.id || '', [user?.id]);

  const copyMyId = () => {
    if (!myId) {
      toast.error('No GaGa ID available to copy.');
      return;
    }

    try {
      navigator.clipboard.writeText(myId);
      setCopied(true);
      toast.success('Your GaGa ID copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Clipboard write failed:', error);
      toast.error('Unable to copy ID. Please copy it manually.');
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleFoundId = useCallback((id: string) => {
    const cleanId = id?.trim();
    if (!cleanId) {
      toast.error('Invalid GaGa ID scanned.');
      return;
    }
    if (cleanId === myId) {
      toast.error('This is your own GaGa ID.');
      return;
    }
    stopCamera();
    onAddFriend(cleanId);
    onBack();
  }, [myId, onAddFriend, onBack, stopCamera]);

  type BarcodeDetectorConstructor = {
    new (options?: { formats?: string[] }): {
      detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string | null }>>;
    };
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);

      const BarcodeDetectorClass = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (BarcodeDetectorClass) {
        const barcodeDetector = new BarcodeDetectorClass({ formats: ['qr_code'] });
        let active = true;
        const detect = async () => {
          if (!active || !videoRef.current) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const raw = barcodes[0].rawValue;
              if (raw?.startsWith('gagachat:')) {
                const id = raw.split(':')[1];
                handleFoundId(id);
                return;
              }
            }
          } catch (error) {
            console.warn('QR detect error', error);
          }
          requestAnimationFrame(detect);
        };
        detect();
        return () => { active = false; };
      }
      setCameraError('QR scanning is not supported by your browser. Use manual entry.');
    } catch (err) {
      console.error('Camera error:', err);
      setHasPermission(false);
      toast.error('Unable to access camera');
    }
  }, [handleFoundId]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleManualSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!manualId.trim()) return;

    setIsLoading(true);
    try {
      // In a real app, we'd verify the user exists first
      handleFoundId(manualId.trim());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between bg-black/50 backdrop-blur-md absolute top-0 left-0 right-0 z-20">
        <button type="button" onClick={onBack} aria-label="Go back" title="Go back" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-white">Add Friends</h1>
        <button
          type="button"
          onClick={copyMyId}
          aria-label="Copy my GaGa ID"
          title="Copy my GaGa ID"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-xs font-bold"
        >
          {copied ? <Check size={14} className="text-[#00FF7F]" /> : <Copy size={14} className="text-white/40" />}
          <span className="text-white/70">My ID</span>
        </button>
      </div>

      {/* Scanner View */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
        {hasPermission === false ? (
          <div className="px-10 text-center space-y-4 animate-fade-in">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-white/20" />
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Camera access was denied or is not supported. Please check your browser settings or enter the GaGa ID manually below.
            </p>
            <button type="button" onClick={startCamera} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white text-sm hover:bg-white/10 transition-all">
              Retry camera
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover opacity-60"
            />
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <div className="bg-black/80 border border-white/10 rounded-3xl px-6 py-5 text-center">
                  <p className="text-sm text-white/80 leading-relaxed">
                    {cameraError}
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 transition-all"
                  >
                    Retry camera
                  </button>
                </div>
              </div>
            ) : null}
            {/* Scanner Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative overflow-hidden">
                <div className="absolute inset-0 border-2 border-[#00FF7F] rounded-3xl animate-pulse opacity-40" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00FF7F] shadow-[0_0_15px_rgba(0,255,127,0.8)] animate-scan" />
              </div>
              <p className="absolute bottom-[20%] text-xs font-bold text-white/40 uppercase tracking-[0.2em]">
                Align QR code within frame
              </p>
            </div>
          </>
        )}
      </div>

      {/* Manual Input Panel */}
      <div className="bg-[#05070a] border-t border-white/10 rounded-t-[40px] p-8 pb-12 animate-slide-up relative z-20">
        <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-8" />
        <h2 className="text-[10px] font-black text-[#00FF7F] uppercase tracking-[0.3em] mb-6 text-center">Manual Identification</h2>
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="relative group">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#00FF7F] transition-colors" />
            <input
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              placeholder="Enter GaGa ID (e.g. user_abc123)"
              aria-label="GaGa ID"
              className="w-full bg-white/5 border border-white/10 text-white rounded-[24px] pl-14 pr-4 py-5 text-[15px] outline-none focus:border-[#00FF7F]/40 focus:bg-white/[0.08] transition-all placeholder:text-white/10 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={!manualId.trim() || isLoading}
            className="w-full h-16 bg-[#00FF7F] text-black rounded-[24px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 shadow-xl shadow-[#00FF7F]/10 active:scale-[0.98] transition-all"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
              <>
                <Search size={18} />
                Find User
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default QRScannerPage;
