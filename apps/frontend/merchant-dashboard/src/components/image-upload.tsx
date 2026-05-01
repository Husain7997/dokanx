import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";

interface ImageUploadProps {
  type: "product" | "banner" | "logo" | "rider-proof" | "kyc" | "theme";
  onUploadComplete?: (media: any) => void;
  onError?: (error: string) => void;
  maxSize?: number; // in bytes, default 5MB
  multiple?: boolean;
  accept?: string;
  className?: string;
}

interface UploadProgress {
  [key: string]: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  type,
  onUploadComplete,
  onError,
  maxSize = 5 * 1024 * 1024,
  multiple = false,
  accept = "image/jpeg,image/png,image/webp",
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragAreaRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const validateFile = (file: File) => {
    if (file.size > maxSize) {
      throw new Error(
        `File size too large. Maximum ${maxSize / 1024 / 1024}MB allowed.`
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
    }

    return true;
  };

  const generatePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadFile = async (file: File) => {
    try {
      validateFile(file);

      // Show preview
      const preview = await generatePreview(file);
      setPreviewUrls((prev) => [...prev, preview]);

      // Step 1: Get signed upload URL
      const uploadUrlResponse = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          fileName: file.name,
          mimeType: file.type,
        }),
      });

      if (!uploadUrlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, fileUrl, key } = await uploadUrlResponse.json();

      // Step 2: Upload file directly to R2 using signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Step 3: Save metadata in database
      const saveResponse = await fetch("/api/media/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          fileName: file.name,
          fileUrl,
          key,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save media metadata");
      }

      const media = await saveResponse.json();

      onUploadComplete?.(media);
      setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));

      // Clear preview after success
      setTimeout(() => {
        setPreviewUrls((prev) => prev.filter((_, i) => i > 0));
      }, 1500);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      onError?.(errorMessage);
      console.error("Upload error:", error);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    if (!multiple && fileArray.length > 1) {
      onError?.("Only one file can be uploaded");
      return;
    }

    setIsUploading(true);

    try {
      if (multiple) {
        await Promise.all(fileArray.map(uploadFile));
      } else {
        await uploadFile(fileArray[0]);
      }
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <div
        ref={dragAreaRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"
        } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-2">
            <div className="inline-block">
              <svg
                className="animate-spin h-8 w-8 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-6-8l-6-6m0 0l-6 6m6-6v12"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-900">
              Drag and drop images here, or click to select
            </p>
            <p className="text-xs text-gray-500">
              Supported formats: JPEG, PNG, WebP (Max {maxSize / 1024 / 1024}MB)
            </p>
          </>
        )}
      </div>

      {/* Preview thumbnails */}
      {previewUrls.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src={url}
                alt={`Preview ${index}`}
                fill
                className="object-cover"
                priority
              />
              {Object.values(uploadProgress).some((p) => p < 100) && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {Math.round(Object.values(uploadProgress)[0] || 0)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
