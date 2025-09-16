import { Upload, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export const UploadZone = ({ onFileSelect }: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      onFileSelect(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`transition-all duration-300 cursor-pointer ${
        isDragOver ? 'scale-105' : ''
      }`}
    >
      {selectedFile ? (
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-white mx-auto" />
          <div>
            <p className="text-xl font-medium text-white break-all">{selectedFile.name}</p>
            <p className="text-white/80">
              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
              <Upload className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-white">
                Upload Your Report
              </h3>
              <p className="text-white/90 text-lg max-w-md">
                Drop your PDF report here, or click to browse files
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2 text-white/80">
            <FileText className="w-4 h-4" />
            <span>PDF files only • Max 10MB</span>
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
        variant="secondary" 
        size="lg" 
        className="w-full max-w-sm mx-auto mt-6 bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        {selectedFile ? 'Choose Different File' : 'Browse Files'}
      </Button>
    </div>
  );
};