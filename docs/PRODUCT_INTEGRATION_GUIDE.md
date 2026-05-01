# Product Integration with Media System

## 🎯 Overview

This guide shows how to integrate the Media Management System with product creation and editing.

## 📦 Updated Product Model

Assuming your product model has these fields for images:

```javascript
{
  // ... other fields
  images: [
    {
      url: "cdn-url",
      mediaId: "media-model-id",
      order: 0
    }
  ],
  thumbnail: "cdn-url",
  // ... other fields
}
```

## 🏗️ Backend Changes

### 1. Update Product Controller

```javascript
const productController = {
  // Add image to product
  async addProductImage(req, res) {
    try {
      const { productId } = req.params;
      const { mediaId, imageUrl } = req.body;
      const merchantId = req.user.shopId;

      const product = await Product.findOne({
        _id: productId,
        merchantId
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Add image
      product.images.push({
        url: imageUrl,
        mediaId,
        order: product.images.length
      });

      // Set as thumbnail if first image
      if (product.images.length === 1) {
        product.thumbnail = imageUrl;
      }

      await product.save();

      res.json({
        success: true,
        product,
        message: 'Image added successfully'
      });
    } catch (error) {
      console.error('Error adding product image:', error);
      res.status(500).json({ error: 'Failed to add image' });
    }
  },

  // Remove image from product
  async removeProductImage(req, res) {
    try {
      const { productId, imageIndex } = req.params;
      const merchantId = req.user.shopId;

      const product = await Product.findOne({
        _id: productId,
        merchantId
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Remove image
      const [removedImage] = product.images.splice(imageIndex, 1);

      // Delete media from storage if needed
      if (removedImage.mediaId) {
        await mediaService.deleteMedia(removedImage.mediaId, merchantId);
      }

      // Update thumbnail
      if (product.images.length > 0) {
        product.thumbnail = product.images[0].url;
      } else {
        product.thumbnail = null;
      }

      await product.save();

      res.json({
        success: true,
        product,
        message: 'Image removed successfully'
      });
    } catch (error) {
      console.error('Error removing product image:', error);
      res.status(500).json({ error: 'Failed to remove image' });
    }
  },

  // Reorder images
  async reorderProductImages(req, res) {
    try {
      const { productId } = req.params;
      const { imageOrder } = req.body;
      const merchantId = req.user.shopId;

      const product = await Product.findOne({
        _id: productId,
        merchantId
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Reorder images
      const reorderedImages = imageOrder.map(index => product.images[index]);
      product.images = reorderedImages;

      // Update thumbnail to first image
      if (product.images.length > 0) {
        product.thumbnail = product.images[0].url;
      }

      await product.save();

      res.json({
        success: true,
        product,
        message: 'Images reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering images:', error);
      res.status(500).json({ error: 'Failed to reorder images' });
    }
  }
};
```

### 2. Add Routes

```javascript
// In product.routes.js
router.post('/:productId/images', protect, productController.addProductImage);
router.delete('/:productId/images/:imageIndex', protect, productController.removeProductImage);
router.put('/:productId/images/reorder', protect, productController.reorderProductImages);
```

## 🎨 Frontend Product Form

### Complete Product Form with Image Upload

```tsx
'use client';

import React, { useState } from 'react';
import { useMedia } from '@/hooks/use-media';
import { ImageUpload } from '@/components/image-upload';
import { OptimizedImage } from '@/components/optimized-image';
import Image from 'next/image';

interface ProductFormProps {
  onSubmit?: (product: any) => void;
  initialProduct?: any;
}

export function ProductForm({ onSubmit, initialProduct }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: initialProduct?.name || '',
    description: initialProduct?.description || '',
    price: initialProduct?.price || '',
    images: initialProduct?.images || [],
    ...initialProduct
  });

  const [uploadProgress, setUploadProgress] = useState(0);
  const { media, error: mediaError } = useMedia();

  const handleImageUploadComplete = (uploadedMedia: any) => {
    // Add image to product form
    setFormData(prev => ({
      ...prev,
      images: [
        ...prev.images,
        {
          url: uploadedMedia.url,
          mediaId: uploadedMedia._id
        }
      ]
    }));

    // If no thumbnail set, use this image
    if (!prev.thumbnail) {
      setFormData(prev => ({
        ...prev,
        thumbnail: uploadedMedia.url
      }));
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));

    // Update thumbnail if removed
    if (formData.images.length > 0) {
      setFormData(prev => ({
        ...prev,
        thumbnail: prev.images[0].url
      }));
    }
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...formData.images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < newImages.length) {
      [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
      setFormData(prev => ({
        ...prev,
        images: newImages,
        thumbnail: newImages[0].url // Update thumbnail
      }));
    }
  };

  const handleSetThumbnail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      thumbnail: prev.images[index].url
    }));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.images.length === 0) {
      alert('Please upload at least one image');
      return;
    }

    try {
      setUploadProgress(50);

      const response = await fetch(
        initialProduct?._id
          ? `/api/products/${initialProduct._id}`
          : '/api/products',
        {
          method: initialProduct?._id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      );

      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      const product = await response.json();
      onSubmit?.(product);
      alert('Product saved successfully!');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    } finally {
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Product Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Product Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows={4}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Price
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleFormChange}
              step="0.01"
              required
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Product Images</h2>

        {/* Upload Area */}
        <div className="mb-6">
          <ImageUpload
            type="product"
            onUploadComplete={handleImageUploadComplete}
            onError={(error) => console.error(error)}
            className="mb-4"
          />
          {mediaError && (
            <div className="text-red-600 text-sm mt-2">{mediaError}</div>
          )}
        </div>

        {/* Images Grid */}
        {formData.images.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Images ({formData.images.length})
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {formData.images.map((image, index) => (
                <div
                  key={index}
                  className="relative rounded-lg overflow-hidden bg-gray-100 group"
                >
                  {/* Image */}
                  <OptimizedImage
                    src={image.url}
                    alt={`Product image ${index + 1}`}
                    width={300}
                    height={300}
                    className="w-full"
                  />

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {/* Set as thumbnail */}
                    {formData.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleSetThumbnail(index)}
                        className={`px-2 py-1 rounded text-white text-xs font-medium ${
                          formData.thumbnail === image.url
                            ? 'bg-blue-600'
                            : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        {formData.thumbnail === image.url ? '✓ Thumbnail' : 'Set Thumbnail'}
                      </button>
                    )}

                    {/* Move buttons */}
                    <div className="flex gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(index, 'up')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs"
                        >
                          ↑
                        </button>
                      )}
                      {index < formData.images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveImage(index, 'down')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs"
                        >
                          ↓
                        </button>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Badge for first image */}
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      First
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={uploadProgress > 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {uploadProgress > 0 ? `Saving... ${uploadProgress}%` : 'Save Product'}
        </button>
      </div>
    </form>
  );
}
```

## 🔄 Image Ordering Logic

The system supports:

1. **Automatic Thumbnail**: First image = product thumbnail
2. **Reordering**: Drag or use up/down buttons
3. **Multiple Images**: Gallery support
4. **Deletion**: Remove unwanted images

## 📱 Mobile Optimization

For mobile app (rider delivery proof):

```typescript
export async function uploadDeliveryProof(
  orderId: string,
  photoFile: File
): Promise<void> {
  const uploadedMedia = await uploadFile(photoFile, 'rider-proof');
  
  await fetch(`/api/orders/${orderId}/proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      proofUrl: uploadedMedia.url,
      mediaId: uploadedMedia._id,
      proofType: 'delivery-photo'
    })
  });
}
```

## ✅ Checklist

- [ ] Backend controllers updated
- [ ] Routes added
- [ ] Frontend form component created
- [ ] Image upload component integrated
- [ ] Image display component implemented
- [ ] Tested on desktop
- [ ] Tested on mobile
- [ ] Performance verified
- [ ] CDN URLs working

