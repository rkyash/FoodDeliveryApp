import React, { useState, useCallback } from 'react';
import { X, Image as ImageIcon, Plus, AlertCircle } from 'lucide-react';
import { api, getImageUrl } from '../../services/api';

interface MultiImageUploadProps {
  type: 'restaurant' | 'menu';
  images: string[];
  onImagesChange: (images: string[]) => void;
  onUploadError?: (error: string) => void;
  maxImages?: number;
  className?: string;
  disabled?: boolean;
}

interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  type: string;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  type,
  images,
  onImagesChange,
  onUploadError,
  maxImages = 6,
  className = '',
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = useCallback(async (files: File[]) => {
    if (disabled) return;

    // Check if we can add more images
    const availableSlots = maxImages - images.length;
    if (availableSlots <= 0) {
      const errorMsg = `Maximum ${maxImages} images allowed`;
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // Limit files to available slots
    const filesToUpload = files.slice(0, availableSlots);

    // Validate all files first
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of filesToUpload) {
      if (!allowedTypes.includes(file.type)) {
        const errorMsg = 'Please select valid image files (JPEG, PNG, WebP, or GIF)';
        setError(errorMsg);
        onUploadError?.(errorMsg);
        return;
      }

      if (file.size > maxSize) {
        const errorMsg = 'Each file must be less than 5MB';
        setError(errorMsg);
        onUploadError?.(errorMsg);
        return;
      }
    }

    setError('');
    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const response = await api.post('/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        const uploadData = response.data.data as UploadResponse;
        return uploadData.url;
      });

      const newImageUrls = await Promise.all(uploadPromises);
      const updatedImages = [...images, ...newImageUrls];
      onImagesChange(updatedImages);
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to upload images';
      setError(errorMsg);
      onUploadError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  }, [type, images, onImagesChange, onUploadError, maxImages, disabled]);

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
      handleFileSelect(files);
    }
  }, [handleFileSelect, disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value to allow selecting the same files again
    e.target.value = '';
  }, [handleFileSelect]);

  const handleRemoveImage = useCallback((index: number) => {
    if (disabled) return;
    const updatedImages = images.filter((_, i) => i !== index);
    onImagesChange(updatedImages);
    setError('');
  }, [images, onImagesChange, disabled]);

  const canAddMore = images.length < maxImages && !disabled;

  return (
    <div className={className}>
      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Existing Images */}
        {images.map((image, index) => (
          <div key={index} className="relative group aspect-square">
            <div className="relative w-full h-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src={getImageUrl(image)}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add More Button/Upload Area */}
        {canAddMore && (
          <div
            className={`relative aspect-square border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
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
                document.getElementById(`multi-file-input-${type}`)?.click();
              }
            }}
          >
            <input
              id={`multi-file-input-${type}`}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={disabled}
            />

            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Uploading...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700">
                  <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Add Image
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Text */}
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center">
          <ImageIcon className="h-4 w-4 mr-1" />
          {images.length} of {maxImages} images
          {canAddMore && (
            <span className="ml-2">• Drop files here or click to add more</span>
          )}
        </div>
        <p className="text-xs mt-1">
          PNG, JPG, WebP or GIF up to 5MB each
        </p>
      </div>

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

export default MultiImageUpload;