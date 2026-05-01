import React, { useState, useEffect } from "react";
import Image from "next/image";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  objectFit?: "contain" | "cover" | "fill";
  quality?: number;
  variant?: "thumbnail" | "medium" | "large"; // Size variant
  fallbackSrc?: string;
  blurPlaceholder?: boolean;
  loading?: "lazy" | "eager";
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 400,
  height = 400,
  priority = false,
  className = "",
  objectFit = "cover",
  quality = 80,
  variant = "medium",
  fallbackSrc,
  blurPlaceholder = true,
  loading = "lazy",
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [supportedFormat, setSupportedFormat] = useState<"webp" | "avif" | "jpeg">(
    "webp"
  );

  // Detect browser support for modern formats
  useEffect(() => {
    const checkFormatSupport = () => {
      // Check AVIF support
      const avifCanvas = document.createElement("canvas");
      if (avifCanvas.toDataURL("image/avif").indexOf("avif") === 0) {
        setSupportedFormat("avif");
        return;
      }

      // Check WebP support
      const webpCanvas = document.createElement("canvas");
      if (webpCanvas.toDataURL("image/webp").indexOf("webp") === 0) {
        setSupportedFormat("webp");
        return;
      }

      // Fallback to JPEG
      setSupportedFormat("jpeg");
    };

    checkFormatSupport();
  }, []);

  // Generate CDN URL with format parameter
  const getOptimizedUrl = (imageUrl: string): string => {
    if (!imageUrl) return "";

    // If URL already has query params, append to existing
    const separator = imageUrl.includes("?") ? "&" : "?";
    return `${imageUrl}${separator}format=${supportedFormat}&quality=${quality}&w=${width}`;
  };

  // Map variant to appropriate dimensions
  const getVariantDimensions = () => {
    const variants = {
      thumbnail: { width: 300, height: 300 },
      medium: { width: 800, height: 800 },
      large: { width: 1200, height: 1200 },
    };
    return variants[variant];
  };

  const dims = getVariantDimensions();
  const displayWidth = width || dims.width;
  const displayHeight = height || dims.height;

  // Generate blur placeholder (base64 encoded pixel)
  const blurDataUrl = blurPlaceholder
    ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmIgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4="
    : undefined;

  const handleError = () => {
    setError(true);
    setIsLoading(false);
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const finalSrc = error && fallbackSrc ? fallbackSrc : getOptimizedUrl(src);

  return (
    <div className={`relative ${className}`} style={{ width: displayWidth, height: displayHeight }}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}

      <picture>
        {/* AVIF format for modern browsers */}
        <source
          srcSet={`${getOptimizedUrl(src)}&format=avif`}
          type="image/avif"
          media="(min-width: 0px)"
        />

        {/* WebP format as primary fallback */}
        <source
          srcSet={`${getOptimizedUrl(src)}&format=webp`}
          type="image/webp"
          media="(min-width: 0px)"
        />

        {/* JPEG as final fallback */}
        <img
          src={finalSrc}
          alt={alt}
          width={displayWidth}
          height={displayHeight}
          loading={priority ? "eager" : loading}
          decoding="async"
          className={`w-full h-full object-${objectFit} rounded-lg ${
            isLoading ? "opacity-0" : "opacity-100"
          } transition-opacity duration-300`}
          onError={handleError}
          onLoad={handleLoadingComplete}
          style={{
            objectFit: objectFit,
            filter: isLoading ? "blur(10px)" : "blur(0px)",
            transition: "filter 0.3s ease-out",
          }}
        />
      </picture>

      {/* Skeleton loader overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer rounded-lg" />
      )}

      {/* Error state */}
      {error && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
          <div className="text-center">
            <svg
              className="w-8 h-8 text-gray-400 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs text-gray-500 mt-2">Failed to load image</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Responsive image component for different screen sizes
interface ResponsiveImageProps extends OptimizedImageProps {
  srcSizes?: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  srcSizes,
  ...props
}) => {
  return (
    <picture>
      {srcSizes?.desktop && (
        <source media="(min-width: 1024px)" srcSet={srcSizes.desktop} />
      )}
      {srcSizes?.tablet && (
        <source media="(min-width: 768px)" srcSet={srcSizes.tablet} />
      )}

      <OptimizedImage src={srcSizes?.mobile || src} {...props} />
    </picture>
  );
};

// Image gallery component for product images
interface ImageGalleryProps {
  images: string[];
  alt?: string;
  className?: string;
  onImageSelect?: (index: number) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  alt = "Product image",
  className = "",
  onImageSelect,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    onImageSelect?.(index);
  };

  if (!images || images.length === 0) {
    return (
      <div className={`${className} bg-gray-200 rounded-lg flex items-center justify-center`}>
        <span className="text-gray-500">No images available</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Main image */}
      <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
        <OptimizedImage
          src={images[selectedIndex]}
          alt={`${alt} - ${selectedIndex + 1}`}
          width={800}
          height={800}
          variant="large"
          priority={selectedIndex === 0}
        />
      </div>

      {/* Thumbnail gallery */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              className={`rounded-lg overflow-hidden border-2 transition-all ${
                selectedIndex === index
                  ? "border-blue-500"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              <OptimizedImage
                src={image}
                alt={`${alt} thumbnail ${index + 1}`}
                width={100}
                height={100}
                variant="thumbnail"
                className="cursor-pointer"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
