import { useState, useRef, useEffect } from "react";
import { Camera, X, RotateCcw, Check, AlertCircle, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CameraCaptureProps {
  onImagesReady: (images: string[]) => void;
  onClose: () => void;
  maxImages?: number;
}

export const CameraCapture = ({ onImagesReady, onClose, maxImages = 15 }: CameraCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [imageQuality, setImageQuality] = useState<"good" | "poor">("good");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please grant camera permissions and try again.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const compressImage = (base64: string, maxSizeKB: number = 500): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Downscale if needed
        const maxDimension = 1920;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Enhance contrast for document scanning
          ctx.filter = 'contrast(1.2) brightness(1.1)';
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        // Start with quality 0.8 and adjust if needed
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        // Reduce quality until under target size
        while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(result);
      };
      img.src = base64;
    });
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      let base64Image = canvas.toDataURL('image/jpeg', 0.9);
      
      // Compress image
      base64Image = await compressImage(base64Image, 500);
      
      setCapturedImages(prev => [...prev, base64Image]);
      toast.success(`Image ${capturedImages.length + 1}/${maxImages} captured`);
      
      // Check image quality (simple brightness check)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const avgBrightness = Array.from(imageData.data)
        .filter((_, i) => i % 4 === 0)
        .reduce((sum, val) => sum + val, 0) / (canvas.width * canvas.height);
      
      if (avgBrightness < 50) {
        setImageQuality("poor");
        toast.warning("Image might be too dark. Consider using flash or better lighting.");
      } else {
        setImageQuality("good");
      }
    }
  };

  const deleteImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
    toast.info("Image deleted");
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const handleComplete = () => {
    if (capturedImages.length === 0) {
      toast.error("Please capture at least one image");
      return;
    }
    stopCamera();
    onImagesReady(capturedImages);
  };

  const canCapture = capturedImages.length < maxImages;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-foreground hover:bg-card"
          >
            <X className="w-6 h-6" />
          </Button>
          
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {capturedImages.length}/{maxImages}
          </Badge>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={switchCamera}
            className="text-foreground hover:bg-card"
          >
            <RotateCcw className="w-6 h-6" />
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {imageQuality === "poor" && (
          <Alert className="mt-2 bg-yellow-500/20 border-yellow-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Poor lighting detected. Use flash or find better light.</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Camera View */}
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Overlay guide */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="border-4 border-white/50 rounded-lg w-[85%] h-[70%] shadow-2xl">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-background text-foreground px-4 py-2 rounded-full text-sm whitespace-nowrap">
              Align report within frame
            </div>
          </div>
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        {/* Thumbnail Gallery */}
        {capturedImages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
            {capturedImages.map((img, idx) => (
              <div key={idx} className="relative flex-shrink-0">
                <img
                  src={img}
                  alt={`Capture ${idx + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border-2 border-white/30"
                />
                <button
                  onClick={() => deleteImage(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-3 h-3 text-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6">
          {canCapture && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFlashEnabled(!flashEnabled)}
              className="text-foreground hover:bg-card w-12 h-12"
            >
              {flashEnabled ? <Zap className="w-6 h-6" /> : <ZapOff className="w-6 h-6" />}
            </Button>
          )}
          
          <Button
            onClick={canCapture ? captureImage : undefined}
            disabled={!canCapture}
            className={`rounded-full w-20 h-20 ${canCapture ? 'bg-card hover:bg-card' : 'bg-card/[0.03]0'}`}
          >
            <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center">
              <Camera className="w-8 h-8 text-foreground" />
            </div>
          </Button>
          
          {capturedImages.length > 0 && (
            <Button
              onClick={handleComplete}
              className="bg-green-500 hover:bg-green-600 w-12 h-12 rounded-full"
              size="icon"
            >
              <Check className="w-6 h-6" />
            </Button>
          )}
        </div>
        
        {!canCapture && (
          <p className="text-center text-foreground mt-4">Maximum {maxImages} images reached</p>
        )}
      </div>
    </div>
  );
};
