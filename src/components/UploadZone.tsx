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
    <div className={`transition-all duration-300 ${
      isDragOver && isAuthenticated ? 'border-white bg-white/10' : ''
    }`}>
      <div className="p-6 sm:p-8 md:p-12">
        {!isAuthenticated && !showLoginForm ? (
          <div className="text-center space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-muted rounded-full">
                <User className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-muted-foreground" />
              </div>
              <div className="space-y-2 px-4">
                <h3 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-orange-400 to-purple-600 bg-clip-text text-transparent">
                  Login to Upload File
                </h3>
                <p className="text-sm sm:text-base text-white/90 max-w-md">
                  Please login with your mobile number to upload your PDF report
                </p>
              </div>
            </div>
            
            <Button 
              variant="default" 
              size="lg" 
              className="w-full max-w-sm mx-auto"
              onClick={() => setShowLoginForm(true)}
            >
              Login
            </Button>
          </div>
        ) : !isAuthenticated && showLoginForm ? (
          <div className="space-y-4">
            <div className="text-center px-4">
              <h3 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-orange-400 to-purple-600 bg-clip-text text-transparent mb-2">
                Login with Mobile Number
              </h3>
            </div>
            <PhoneAuth onAuthSuccess={handleAuthSuccess} />
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
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
            className="text-center space-y-6"
          >
            {selectedFile ? (
              <div className="space-y-3 sm:space-y-4">
                <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-success mx-auto" />
                <div className="px-4">
                  <p className="text-base sm:text-lg font-medium bg-gradient-to-r from-orange-400 to-purple-600 bg-clip-text text-transparent break-all">{selectedFile.name}</p>
                  <p className="text-sm text-white/70">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                  <div className="p-3 sm:p-4 bg-primary rounded-full">
                    <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                  </div>
                  <div className="space-y-2 px-4">
                    <h3 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-orange-400 to-purple-600 bg-clip-text text-transparent">
                      Upload Your Report
                    </h3>
                    <p className="text-sm sm:text-base text-white/90 max-w-md">
                      Drop your PDF report here, or click to browse files
                    </p>
                  </div>
                </div>

              </>
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
              className="w-full max-w-sm mx-auto"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {selectedFile ? 'Choose Different File' : 'Browse Files'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};