import { Upload, FileText, CheckCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PhoneAuth } from "@/components/PhoneAuth";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export const UploadZone = ({ onFileSelect }: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isAuthenticated) {
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
    if (!isAuthenticated) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) return;
    
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
    }
  };

  const handleAuthSuccess = () => {
    setShowLoginForm(false);
  };

  return (
    <div className="text-center space-y-6 p-4">
      {!isAuthenticated && !showLoginForm ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <User className="w-12 h-12 text-white drop-shadow-lg" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white drop-shadow-lg">
                Login to Upload File
              </h3>
              <p className="text-white/90 drop-shadow-md max-w-md">
                Please login with your mobile number to upload your PDF report
              </p>
            </div>
          </div>
          
          <Button 
            variant="default" 
            size="lg" 
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white"
            onClick={() => setShowLoginForm(true)}
          >
            Login
          </Button>
        </div>
      ) : !isAuthenticated && showLoginForm ? (
        <div className="space-y-4 bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white drop-shadow-lg mb-2">
              Login with Mobile Number
            </h3>
          </div>
          <PhoneAuth onAuthSuccess={handleAuthSuccess} />
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
            onClick={() => setShowLoginForm(false)}
          >
            Back
          </Button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="space-y-6"
        >
          {selectedFile ? (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto drop-shadow-lg" />
              <div>
                <p className="text-lg font-medium text-white drop-shadow-lg break-all">{selectedFile.name}</p>
                <p className="text-white/70 drop-shadow-md">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <Upload className="w-16 h-16 text-white drop-shadow-lg" />
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white drop-shadow-lg">
                  Upload Your Report
                </h3>
                <p className="text-white/90 drop-shadow-md max-w-md">
                  Drop your PDF report here, or click to browse files
                </p>
              </div>
            </div>
          )}

          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          
          <Button 
            variant="default" 
            size="lg" 
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white flex items-center gap-2"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <FileText className="w-5 h-5" />
            {selectedFile ? 'Choose Different File' : 'Browse Files'}
          </Button>
        </div>
      )}
    </div>
  );
};