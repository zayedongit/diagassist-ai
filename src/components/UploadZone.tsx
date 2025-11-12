import { Upload, FileText, CheckCircle, User, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PhoneAuth } from "@/components/PhoneAuth";
import { CameraCapture } from "@/components/CameraCapture";

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

  // BYPASS AUTH FOR TESTING - Set to true to re-enable auth before deployment
  const BYPASS_AUTH = true;
  const effectiveAuth = BYPASS_AUTH || isAuthenticated;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (effectiveAuth) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!effectiveAuth) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!effectiveAuth) return;
    
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
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
            <User className="w-12 h-12 drop-shadow-lg" style={{color: 'hsl(220, 74%, 42%)'}} />
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-semibold drop-shadow-lg" style={{color: 'hsl(220, 74%, 42%)'}}>
                Login to Upload File
              </h3>
              <p className="drop-shadow-md max-w-md mx-auto" style={{color: 'hsl(220, 74%, 42%, 0.9)'}}>
                Please login with your mobile number to upload your PDF report
              </p>
            </div>
          </div>
          
          <Button 
            variant="default" 
            size="lg" 
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30"
            style={{color: 'hsl(220, 74%, 42%)'}}
            onClick={() => setShowLoginForm(true)}
          >
            Login
          </Button>
        </div>
      ) : !effectiveAuth && showLoginForm ? (
        <div className="space-y-4 bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <div className="text-center">
            <h3 className="text-xl font-semibold drop-shadow-lg mb-2" style={{color: 'hsl(220, 74%, 42%)'}}>
              Login with Mobile Number
            </h3>
          </div>
          <PhoneAuth onAuthSuccess={handleAuthSuccess} />
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full bg-white/10 border-white/30 hover:bg-white/20"
            style={{color: 'hsl(220, 74%, 42%)'}}
            onClick={() => setShowLoginForm(false)}
          >
            Back
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {selectedFile || capturedImagesCount > 0 ? (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mx-auto drop-shadow-lg" />
              <div className="text-center">
                {selectedFile ? (
                  <>
                    <p className="text-base sm:text-lg font-medium drop-shadow-lg break-all px-2" style={{color: 'hsl(220, 74%, 42%)'}}>{selectedFile.name}</p>
                    <p className="drop-shadow-md text-sm" style={{color: 'hsl(220, 74%, 42%, 0.7)'}}>
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </>
                ) : (
                  <p className="text-base sm:text-lg font-medium drop-shadow-lg" style={{color: 'hsl(220, 74%, 42%)'}}>
                    {capturedImagesCount} {capturedImagesCount === 1 ? 'Photo' : 'Photos'} Captured
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3 text-center">
              <Camera className="w-12 h-12 sm:w-16 sm:h-16 drop-shadow-lg" style={{color: 'hsl(220, 74%, 42%)'}} />
              <div className="space-y-2 text-center px-4">
                <h3 className="text-lg sm:text-xl font-semibold drop-shadow-lg" style={{color: 'hsl(220, 74%, 42%)'}}>
                  Upload Your Medical Report
                </h3>
                <p className="drop-shadow-md text-sm sm:text-base" style={{color: 'hsl(220, 74%, 42%, 0.9)'}}>
                  Take photos or upload PDF of your lab report
                </p>
              </div>
            </div>
          )}

          {/* Mobile-First Action Buttons */}
          <div className="flex flex-col gap-3 px-4">
            {/* Camera Button - Primary */}
            <Button 
              variant="default" 
              size="lg" 
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 flex items-center justify-center gap-3 h-14 text-base"
              style={{color: 'hsl(220, 74%, 42%)'}}
              onClick={() => setShowCamera(true)}
            >
              <Camera className="w-5 h-5" />
              {capturedImagesCount > 0 ? 'Take More Photos' : 'Take Photos'}
            </Button>

            {/* PDF Upload Button - Secondary */}
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/30 flex items-center justify-center gap-3 h-14 text-base"
              style={{color: 'hsl(220, 74%, 42%)'}}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <FileText className="w-5 h-5" />
              {selectedFile ? 'Choose Different PDF' : 'Upload PDF'}
            </Button>
          </div>
          
          <p className="text-xs text-center px-4" style={{color: 'hsl(220, 74%, 42%, 0.7)'}}>
            📸 For best results, take clear photos of each page of your medical report
          </p>
        </div>
      )}
    </div>
  );
};