/* components/common/FileUpload.tsx */
'use client';

import React, { useRef, useState } from 'react';
import { Cloud, File, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onUpload: (file: File) => void;
  loading?: boolean;
  acceptedFormats?: string[];
  maxFileSize?: number; // in MB
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  loading = false,
  acceptedFormats = ['jpg', 'png', 'pdf'],
  maxFileSize = 5,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      setError(`File size must be less than ${maxFileSize}MB`);
      return false;
    }

    // Check file format
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !acceptedFormats.includes(extension)) {
      setError(`Accepted formats: ${acceptedFormats.join(', ').toUpperCase()}`);
      return false;
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onUpload(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onUpload(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
        dragActive
          ? 'border-primary bg-primary/5'
          : selectedFile
          ? 'border-green-500 bg-green-50'
          : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleChange}
        className="hidden"
        accept={acceptedFormats.map((fmt) => `.${fmt}`).join(',')}
        disabled={loading}
      />

      {selectedFile ? (
        <div className="space-y-2">
          <div className="flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <div className="flex items-center justify-between gap-4 mt-4 p-3 bg-white rounded border border-green-200">
            <div className="flex items-center gap-3 flex-1">
              <File className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={loading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {loading && (
            <p className="text-sm text-blue-600 font-medium">
              Uploading... Please wait
            </p>
          )}
          <p className="text-xs text-green-600 font-medium">
            ✓ Ready to upload
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Cloud className="w-12 h-12 mx-auto text-gray-400" />
          <div>
            <p className="font-semibold text-gray-700">
              Drag and drop your file here
            </p>
            <p className="text-sm text-gray-500">or click to browse</p>
          </div>
          <p className="text-xs text-gray-400">
            Supported formats: {acceptedFormats.map((fmt) => fmt.toUpperCase()).join(', ')}
            {` • Max size: ${maxFileSize}MB`}
          </p>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm font-medium mt-4 p-2 bg-red-50 rounded">
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUpload;
