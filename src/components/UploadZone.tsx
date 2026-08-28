import { FileText, CheckCircle, User, Camera, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PhoneAuth } from "@/components/PhoneAuth";
import { CameraCapture } from "@/components/CameraCapture";
import { toast } from "sonner";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  onImagesCapture?: (images: string[]) => void;
}

const MAX_REPORTS = 5;
const MAX_SIZE = 20 * 1024 * 1024; // 20MB per file

export const UploadZone = ({ onFileSelect, onFilesSelect, onImagesCapture }: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImagesCount, setCapturedImagesCount] = useState(0);
  const { isAuthenticated, user } = useAuth();

  const isRememberedDevice = localStorage.getItem('diagassist_remember_device') === 'true';
  const lastLogin = localStorage.getItem('diagassist_last_login');

  // Authentication bypass (kept as-is from prior behavior)
  const BYPASS_AUTH = true;
  const effectiveAuth = BYPASS_AUTH || isAuthenticated;

  const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    if (list.length === 0) return;

    setStagedFiles((prev) => {
      const next = [...prev];
      let addedAny = false;
      for (const file of list) {
        if (!isPdf(file)) {
          toast.error(`"${file.name}" is not a PDF. Only PDF reports are supported.`);
          continue;
        }
        if (file.size > MAX_SIZE) {
          toast.error(`"${file.name}" is over 20MB. Please upload a smaller PDF.`);
          continue;
        }
        // de-duplicate by name + size
        if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
        if (next.length >= MAX_REPORTS) {
          toast.error(`You can analyze up to ${MAX_REPORTS} reports at once.`);
          break;
        }
        next.push(file);
        addedAny = true;
      }
      if (addedAny) {
        toast.success(next.length > 1 ? `${next.length} reports ready` : `${next[0].name} ready`);
      }
      return next;
    });
  };

  const removeFile = (idx: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = () => {
    if (stagedFiles.length === 0) return;
    if (onFilesSelect) onFilesSelect(stagedFiles);
    else onFileSelect(stagedFiles[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (effectiveAuth) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!effectiveAuth) {
      toast.error("Please login to upload files");
      return;
    }
    if (e.dataTransfer.files.length === 0) {
      toast.error("No files detected");
      return;
    }
    addFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!effectiveAuth) return;
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = ''; // allow re-selecting the same file
  };

  const handleAuthSuccess = () => setShowLoginForm(false);

  const handleCameraCapture = (images: string[]) => {
    setCapturedImagesCount(images.length);
    setShowCamera(false);
    if (onImagesCapture) onImagesCapture(images);
  };

  if (showCamera) {
    return (
      <CameraCapture
        onImagesReady={handleCameraCapture}
        onClose={() => setShowCamera(false)}
        maxImages={15}
      />
    );
  }

  return (
    <div className="text-center space-y-4 p-4 max-w-lg mx-auto">
      {!effectiveAuth && !showLoginForm ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <User className="w-12 h-12" />
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-semibold">Login to Upload File</h3>
              <p className="max-w-md mx-auto">Please login with your mobile number to upload your PDF report</p>
            </div>
          </div>
          <Button variant="default" size="lg" onClick={() => setShowLoginForm(true)}>Login</Button>
        </div>
      ) : !effectiveAuth && showLoginForm ? (
        <div className="space-y-4 glass-card rounded-2xl p-6">
          <PhoneAuth onAuthSuccess={handleAuthSuccess} />
          <Button variant="outline" size="sm" className="w-full bg-card border-white/30 hover:bg-card" onClick={() => setShowLoginForm(false)}>Back</Button>
        </div>
      ) : (
        <div className="space-y-6" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          {isAuthenticated && isRememberedDevice && (
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">Welcome back — device remembered</p>
              {lastLogin && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Last login: {new Date(lastLogin).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}

          {capturedImagesCount > 0 ? (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mx-auto" />
              <p className="text-base sm:text-lg font-medium">
                {capturedImagesCount} {capturedImagesCount === 1 ? 'Photo' : 'Photos'} Captured
              </p>
            </div>
          ) : stagedFiles.length > 0 ? (
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-medium text-foreground">
                  {stagedFiles.length} of {MAX_REPORTS} report{stagedFiles.length > 1 ? 's' : ''} ready
                </p>
                {stagedFiles.length > 1 && (
                  <span className="text-xs text-muted-foreground">Analyzed together for more context</span>
                )}
              </div>
              <ul className="space-y-2">
                {stagedFiles.map((f, i) => (
                  <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-3 rounded-lg border border-white/15 bg-card p-3">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${f.name}`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div
              className={`flex flex-col items-center space-y-3 text-center transition-all duration-300 rounded-xl p-6 ${
                isDragOver ? 'bg-card border-4 border-dashed scale-105' : 'border-2 border-transparent'
              }`}
              style={{ borderColor: isDragOver ? 'hsl(95 24% 20%)' : 'transparent' }}
            >
              <Camera className="w-12 h-12 sm:w-16 sm:h-16 transition-transform" />
              <div className="space-y-2 text-center px-4">
                <h3 className="text-lg sm:text-xl font-semibold">
                  {isDragOver ? 'Drop PDFs here' : 'Upload Your Medical Report(s)'}
                </h3>
                <p className="text-sm sm:text-base">
                  {isDragOver ? 'Release to add' : 'Drag & drop one or more PDFs, take photos, or click to browse'}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 px-4">
            <input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />

            {stagedFiles.length > 0 ? (
              <>
                <Button
                  variant="default"
                  size="lg"
                  className="w-full flex items-center justify-center gap-3 h-14 text-base"
                  onClick={submit}
                >
                  <CheckCircle className="w-5 h-5" />
                  Analyze {stagedFiles.length > 1 ? `${stagedFiles.length} Reports` : 'Report'}
                </Button>
                {stagedFiles.length < MAX_REPORTS && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full flex items-center justify-center gap-3 h-12 text-sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Plus className="w-4 h-4" />
                    Add another report
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="default"
                  size="lg"
                  className="w-full flex items-center justify-center gap-3 h-14 text-base"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <FileText className="w-5 h-5" />
                  Upload PDF(s)
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full flex items-center justify-center gap-3 h-14 text-base"
                  onClick={() => setShowCamera(true)}
                >
                  <Camera className="w-5 h-5" />
                  Take Photos
                </Button>
              </>
            )}
          </div>

          <div className={`text-xs text-center px-4 space-y-1 transition-opacity ${isDragOver ? 'opacity-0' : 'opacity-100'}`}>
            <p>You can add up to {MAX_REPORTS} reports — from the same visit or different dates and labs — and analyze them together.</p>
            <p>For photos, ensure good lighting and clear text.</p>
          </div>
        </div>
      )}
    </div>
  );
};
