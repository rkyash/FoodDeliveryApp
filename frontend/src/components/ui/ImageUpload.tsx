import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

interface ImageUploadProps {
  type: 'restaurant' | 'menu';
  onUploadSuccess: (imageUrl: string, filename: string) => void;
  onUploadError?: (error: string) => void;
  currentImage?: string;
  onRemoveImage?: () => void;
  className?: string;
  disabled?: boolean;
}

interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  type: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  type,
  onUploadSuccess,
  onUploadError,
  currentImage,
  onRemoveImage,
  className = '',
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = 'Please select a valid image file (JPEG, PNG, WebP, or GIF)';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const errorMsg = 'File size must be less than 5MB';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const uploadData = response.data.data as UploadResponse;
      onUploadSuccess(uploadData.url, uploadData.filename);
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to upload image';
      setError(errorMsg);
      onUploadError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  }, [type, onUploadSuccess, onUploadError, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect, disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  const handleRemoveImage = useCallback(() => {
    setError('');
    onRemoveImage?.();
  }, [onRemoveImage]);

  return (
    <div className={`relative ${className}`}>
      {currentImage ? (
        // Display current image with remove option
        <div className="relative group">
          <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            <img
              src={currentImage}
              alt="Uploaded image"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={handleRemoveImage}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {!disabled && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Hover and click × to remove, or drag a new image to replace
            </p>
          )}
        </div>
      ) : (
        // Upload area
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          } ${
            disabled
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled) {
              document.getElementById(`file-input-${type}`)?.click();
            }
          }}
        >
          <input
            id={`file-input-${type}`}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={disabled}
          />

          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Uploading...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700">
                <Upload className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Drop an image here, or click to select
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PNG, JPG, WebP or GIF up to 5MB
                </p>
              </div>

              <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
                <ImageIcon className="h-4 w-4 mr-1" />
                Drag & drop or click to upload
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;