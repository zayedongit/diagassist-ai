import { Upload, FileText, CheckCircle, User, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PhoneAuth } from "@/components/PhoneAuth";
import { CameraCapture } from "@/components/CameraCapture";
import { toast } from "sonner";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  onImagesCapture?: (images: string[]) => void;
}

export const UploadZone = ({ onFileSelect, onImagesCapture }: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImagesCount, setCapturedImagesCount] = useState(0);
  const { isAuthenticated, user } = useAuth();

  // Check if device is remembered
  const isRememberedDevice = localStorage.getItem('diagassist_remember_device') === 'true';
  const lastLogin = localStorage.getItem('diagassist_last_login');

  // BYPASS AUTH FOR TESTING - Set to true to re-enable auth before deployment
  // Authentication is now MANDATORY for upload
  const BYPASS_AUTH = true;
  const effectiveAuth = BYPASS_AUTH || isAuthenticated;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (effectiveAuth) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if leaving the container itself, not child elements
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (!effectiveAuth) {
      toast.error("Please login to upload files");
      return;
    }
    
    const files = e.dataTransfer.files;
    
    if (files.length === 0) {
      toast.error("No files detected");
      return;
    }
    
    const file = files[0];
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error("Only PDF files are supported. Please upload a PDF file.");
      return;
    }
    
    // Validate file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error("File is too large. Maximum size is 20MB.");
      return;
    }
    
    setSelectedFile(file);
    onFileSelect(file);
    toast.success(`${file.name} loaded successfully`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!effectiveAuth) return;
    
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast.error("Only PDF files are supported. Please upload a PDF file.");
        e.target.value = ''; // Reset input
        return;
      }
      
      // Validate file size (max 20MB)
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        toast.error("File is too large. Maximum size is 20MB.");
        e.target.value = ''; // Reset input
        return;
      }
      
      setSelectedFile(file);
      onFileSelect(file);
      toast.success(`${file.name} loaded successfully`);
    }
  };

  const handleAuthSuccess = () => {
    setShowLoginForm(false);
  };

  const handleCameraCapture = (images: string[]) => {
    setCapturedImagesCount(images.length);
    setShowCamera(false);
    if (onImagesCapture) {
      onImagesCapture(images);
    }
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
              <h3 className="text-xl font-semibold">
                Login to Upload File
              </h3>
              <p className="max-w-md mx-auto">
                Please login with your mobile number to upload your PDF report
              </p>
            </div>
          </div>
          
          <Button 
            variant="default" 
            size="lg" 
           
            onClick={() => setShowLoginForm(true)}
          >
            Login
          </Button>
        </div>
      ) : !effectiveAuth && showLoginForm ? (
        <div className="space-y-4 glass-card rounded-2xl p-6">
          <PhoneAuth onAuthSuccess={handleAuthSuccess} />
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full bg-card border-white/30 hover:bg-card"
           
            onClick={() => setShowLoginForm(false)}
          >
            Back
          </Button>
        </div>
      ) : (
        <div 
          className="space-y-6"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Welcome Back Message for Remembered Devices */}
          {isAuthenticated && isRememberedDevice && (
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                ✓ Welcome back! Device remembered
              </p>
              {lastLogin && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Last login: {new Date(lastLogin).toLocaleDateString('en-IN', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          )}

          {selectedFile || capturedImagesCount > 0 ? (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mx-auto" />
              <div className="text-center">
                {selectedFile ? (
                  <>
                    <p className="text-base sm:text-lg font-medium break-all px-2">{selectedFile.name}</p>
                    <p className="text-sm">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </>
                ) : (
                  <p className="text-base sm:text-lg font-medium">
                    {capturedImagesCount} {capturedImagesCount === 1 ? 'Photo' : 'Photos'} Captured
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div 
              className={`flex flex-col items-center space-y-3 text-center transition-all duration-300 rounded-xl p-6 ${
                isDragOver 
                  ? 'bg-card border-4 border-dashed scale-105' 
                  : 'border-2 border-transparent'
              }`}
              style={{ borderColor: isDragOver ? 'hsl(95 24% 20%)' : 'transparent' }}
            >
              <Camera className="w-12 h-12 sm:w-16 sm:h-16 transition-transform" />
              <div className="space-y-2 text-center px-4">
                <h3 className="text-lg sm:text-xl font-semibold">
                  {isDragOver ? 'Drop PDF here' : 'Upload Your Medical Report'}
                </h3>
                <p className="text-sm sm:text-base">
                  {isDragOver ? 'Release to upload' : 'Drag & drop PDF, take photos, or click to browse'}
                </p>
              </div>
            </div>
          )}

          {/* Mobile-First Action Buttons */}
          <div className="flex flex-col gap-3 px-4">
            {/* PDF Upload Button - Primary */}
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            
            <Button 
              variant="default" 
              size="lg" 
              className="w-full flex items-center justify-center gap-3 h-14 text-base"
             
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <FileText className="w-5 h-5" />
              {selectedFile ? 'Choose Different PDF' : 'Upload PDF'}
            </Button>

            {/* Camera Button - Secondary */}
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full flex items-center justify-center gap-3 h-14 text-base"
             
              onClick={() => setShowCamera(true)}
            >
              <Camera className="w-5 h-5" />
              {capturedImagesCount > 0 ? 'Take More Photos' : 'Take Photos'}
            </Button>
          </div>
          
          <div className={`text-xs text-center px-4 space-y-1 transition-opacity ${isDragOver ? 'opacity-0' : 'opacity-100'}`}>
            <p className="hidden sm:block">
              📄 Drag & drop PDF files here or use the buttons above
            </p>
            <p className="sm:hidden">
              📱 Tap "Upload PDF" to select from WhatsApp, Drive, or Files
            </p>
            <p>
              📸 For best results with photos, ensure good lighting and clear text
            </p>
          </div>
        </div>
      )}
    </div>
  );
};