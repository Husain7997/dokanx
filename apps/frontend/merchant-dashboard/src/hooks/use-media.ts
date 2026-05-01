import { useState, useCallback } from "react";

interface Media {
  _id: string;
  url: string;
  type: "product" | "banner" | "logo" | "rider-proof" | "kyc" | "theme";
  fileName: string;
  fileSize: number;
  mimeType: string;
  variants?: Array<{
    size: string;
    url: string;
    width: number;
    height: number;
    fileSize: number;
  }>;
  createdAt: string;
}

interface UseMediaReturn {
  media: Media[];
  loading: boolean;
  error: string | null;
  uploadProgress: number;
  listMedia: (type?: string) => Promise<void>;
  uploadFile: (file: File, type: Media["type"]) => Promise<Media | null>;
  deleteMedia: (mediaId: string) => Promise<boolean>;
  getVariantUrl: (media: Media, size?: "thumbnail" | "medium" | "large") => string;
}

export const useMedia = (): UseMediaReturn => {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const listMedia = useCallback(async (type?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (type) params.append("type", type);

      const response = await fetch(`/api/media?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch media");
      }

      const data = await response.json();
      setMedia(data.media || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load media";
      setError(message);
      console.error("List media error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadFile = useCallback(
    async (file: File, type: Media["type"]): Promise<Media | null> => {
      try {
        setError(null);
        setUploadProgress(0);

        // Validate file
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          throw new Error(`File size too large. Maximum ${maxSize / 1024 / 1024}MB allowed.`);
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
          throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
        }

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
        setUploadProgress(30);

        // Step 2: Upload file directly to R2 using signed URL
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to storage");
        }

        setUploadProgress(70);

        // Step 3: Save metadata in database
        const saveResponse = await fetch("/api/media", {
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

        const uploadedMedia = await saveResponse.json();
        setUploadProgress(100);

        // Add to local state
        setMedia((prev) => [uploadedMedia, ...prev]);

        return uploadedMedia;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        console.error("Upload error:", err);
        return null;
      } finally {
        setUploadProgress(0);
      }
    },
    []
  );

  const deleteMedia = useCallback(async (mediaId: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`/api/media/${mediaId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete media");
      }

      // Remove from local state
      setMedia((prev) => prev.filter((m) => m._id !== mediaId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      setError(message);
      console.error("Delete error:", err);
      return false;
    }
  }, []);

  const getVariantUrl = useCallback(
    (mediaItem: Media, size: "thumbnail" | "medium" | "large" = "medium"): string => {
      if (!mediaItem) return "";

      const variant = mediaItem.variants?.find((v) => v.size === size);
      return variant?.url || mediaItem.url || "";
    },
    []
  );

  return {
    media,
    loading,
    error,
    uploadProgress,
    listMedia,
    uploadFile,
    deleteMedia,
    getVariantUrl,
  };
};
