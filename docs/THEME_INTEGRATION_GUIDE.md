# Theme Editor - Image Upload Integration

## 🎯 Overview

This guide shows how to integrate the Media System with the Theme Editor for banner uploads.

## 🏗️ Backend Changes

### 1. Update Theme Model

```javascript
const themeSchema = new mongoose.Schema({
  // ... existing fields
  
  banner: {
    url: String,
    mediaId: mongoose.Schema.Types.ObjectId,
    width: Number,
    height: Number
  },
  
  hero: {
    backgroundImage: {
      url: String,
      mediaId: mongoose.Schema.Types.ObjectId
    },
    textColor: String
  },
  
  sections: [{
    type: String, // 'banner', 'featured-products', 'testimonials', etc
    backgroundImage: {
      url: String,
      mediaId: mongoose.Schema.Types.ObjectId
    },
    // ... other section properties
  }],
  
  // ... rest of fields
});
```

### 2. Update Theme Controller

```javascript
const themeController = {
  async updateBanner(req, res) {
    try {
      const { themeId } = req.params;
      const { bannerUrl, mediaId } = req.body;
      const merchantId = req.user.shopId;

      const theme = await Theme.findOne({
        _id: themeId,
        merchantId
      });

      if (!theme) {
        return res.status(404).json({ error: 'Theme not found' });
      }

      // Update banner
      theme.banner = {
        url: bannerUrl,
        mediaId,
        width: 1920,
        height: 640
      };

      await theme.save();

      res.json({
        success: true,
        theme,
        message: 'Banner updated successfully'
      });
    } catch (error) {
      console.error('Error updating banner:', error);
      res.status(500).json({ error: 'Failed to update banner' });
    }
  },

  async updateSectionImage(req, res) {
    try {
      const { themeId, sectionIndex } = req.params;
      const { imageUrl, mediaId } = req.body;
      const merchantId = req.user.shopId;

      const theme = await Theme.findOne({
        _id: themeId,
        merchantId
      });

      if (!theme) {
        return res.status(404).json({ error: 'Theme not found' });
      }

      if (!theme.sections[sectionIndex]) {
        return res.status(404).json({ error: 'Section not found' });
      }

      // Update section background image
      theme.sections[sectionIndex].backgroundImage = {
        url: imageUrl,
        mediaId
      };

      await theme.save();

      res.json({
        success: true,
        theme,
        message: 'Section image updated successfully'
      });
    } catch (error) {
      console.error('Error updating section image:', error);
      res.status(500).json({ error: 'Failed to update section image' });
    }
  },

  async removeImage(req, res) {
    try {
      const { themeId, imageType, index } = req.params;
      const merchantId = req.user.shopId;

      const theme = await Theme.findOne({
        _id: themeId,
        merchantId
      });

      if (!theme) {
        return res.status(404).json({ error: 'Theme not found' });
      }

      let mediaId;

      if (imageType === 'banner') {
        mediaId = theme.banner?.mediaId;
        theme.banner = null;
      } else if (imageType === 'section') {
        mediaId = theme.sections[index]?.backgroundImage?.mediaId;
        if (theme.sections[index]) {
          theme.sections[index].backgroundImage = null;
        }
      }

      // Delete media from storage
      if (mediaId) {
        await mediaService.deleteMedia(mediaId, merchantId);
      }

      await theme.save();

      res.json({
        success: true,
        theme,
        message: 'Image removed successfully'
      });
    } catch (error) {
      console.error('Error removing image:', error);
      res.status(500).json({ error: 'Failed to remove image' });
    }
  }
};
```

### 3. Add Routes

```javascript
// In theme.routes.js
router.put('/:themeId/banner', protect, themeController.updateBanner);
router.put('/:themeId/sections/:sectionIndex/image', protect, themeController.updateSectionImage);
router.delete('/:themeId/images/:imageType/:index', protect, themeController.removeImage);
```

## 🎨 Frontend Theme Editor Component

### Complete Theme Editor with Image Upload

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ImageUpload } from '@/components/image-upload';
import { OptimizedImage } from '@/components/optimized-image';
import { useMedia } from '@/hooks/use-media';

interface ThemeEditorProps {
  themeId: string;
  onSave?: (theme: any) => void;
}

export function ThemeEditor({ themeId, onSave }: ThemeEditorProps) {
  const [theme, setTheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'banner' | 'sections' | 'colors'>('banner');

  const { uploadFile, deleteMedia, error: mediaError } = useMedia();

  // Load theme
  useEffect(() => {
    loadTheme();
  }, [themeId]);

  const loadTheme = async () => {
    try {
      const response = await fetch(`/api/themes/${themeId}`);
      const data = await response.json();
      setTheme(data.theme);
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle banner upload
  const handleBannerUpload = async (uploadedMedia: any) => {
    try {
      setSaving(true);

      const response = await fetch(`/api/themes/${themeId}/banner`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bannerUrl: uploadedMedia.url,
          mediaId: uploadedMedia._id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update banner');
      }

      const data = await response.json();
      setTheme(data.theme);
    } catch (error) {
      console.error('Error updating banner:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle section image upload
  const handleSectionImageUpload = async (
    sectionIndex: number,
    uploadedMedia: any
  ) => {
    try {
      setSaving(true);

      const response = await fetch(`/api/themes/${themeId}/sections/${sectionIndex}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedMedia.url,
          mediaId: uploadedMedia._id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update section image');
      }

      const data = await response.json();
      setTheme(data.theme);
    } catch (error) {
      console.error('Error updating section image:', error);
    } finally {
      setSaving(false);
    }
  };

  // Remove image
  const handleRemoveImage = async (imageType: string, index?: number) => {
    try {
      setSaving(true);

      const response = await fetch(
        `/api/themes/${themeId}/images/${imageType}/${index || 0}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove image');
      }

      const data = await response.json();
      setTheme(data.theme);
    } catch (error) {
      console.error('Error removing image:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading theme...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b">
        {(['banner', 'sections', 'colors'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Banner Tab */}
      {activeTab === 'banner' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Store Banner</h2>

          {theme?.banner?.url ? (
            <div className="space-y-4">
              {/* Preview */}
              <div className="rounded-lg overflow-hidden">
                <OptimizedImage
                  src={theme.banner.url}
                  alt="Store banner"
                  width={1200}
                  height={400}
                  variant="medium"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleRemoveImage('banner')}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                >
                  Remove Banner
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">No banner uploaded</p>
            </div>
          )}

          {/* Upload Area */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              {theme?.banner?.url ? 'Replace Banner' : 'Upload Banner'}
            </h3>
            <ImageUpload
              type="banner"
              onUploadComplete={handleBannerUpload}
              onError={(error) => console.error(error)}
            />
          </div>
        </div>
      )}

      {/* Sections Tab */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          {theme?.sections?.map((section: any, index: number) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold capitalize">
                  {section.type} Section
                </h3>
                <span className="text-sm text-gray-500">#{index + 1}</span>
              </div>

              {section.backgroundImage?.url && (
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="rounded-lg overflow-hidden">
                    <OptimizedImage
                      src={section.backgroundImage.url}
                      alt={`${section.type} background`}
                      width={1200}
                      height={400}
                      variant="medium"
                    />
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveImage('section', index)}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                  >
                    Remove Image
                  </button>
                </div>
              )}

              {/* Upload Area */}
              <div className={section.backgroundImage?.url ? 'mt-6 border-t pt-6' : ''}>
                <h4 className="text-sm font-medium text-gray-700 mb-4">
                  {section.backgroundImage?.url ? 'Replace Image' : 'Upload Background Image'}
                </h4>
                <ImageUpload
                  type="banner"
                  onUploadComplete={(media) => handleSectionImageUpload(index, media)}
                  onError={(error) => console.error(error)}
                />
              </div>
            </div>
          ))}

          {(!theme?.sections || theme.sections.length === 0) && (
            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
              No sections configured
            </div>
          )}
        </div>
      )}

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Color Scheme</h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* Color picker would go here */}
            <div className="text-gray-500 text-center py-8">
              Color customization coming soon
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {mediaError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {mediaError}
        </div>
      )}

      {/* Status */}
      {saving && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          Saving changes...
        </div>
      )}
    </div>
  );
}
```

## 🎨 Advanced: Drag-Drop Image Reordering

For multi-image sections:

```tsx
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";

export function SortableImageGallery({ images, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = images.findIndex(img => img.id === active.id);
      const newIndex = images.findIndex(img => img.id === over.id);
      onReorder(arrayMove(images, oldIndex, newIndex));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={images.map(img => img.id)} strategy={verticalListSortingStrategy}>
        {/* Images */}
      </SortableContext>
    </DndContext>
  );
}
```

## ✅ Checklist

- [ ] Theme model updated with image fields
- [ ] Backend controllers created
- [ ] Routes added
- [ ] Frontend editor component built
- [ ] Image upload integrated
- [ ] Image preview working
- [ ] Delete functionality tested
- [ ] Replace image working
- [ ] Mobile responsive
- [ ] Performance optimized

## 🔄 Image Size Recommendations

For best performance:

| Use Case | Size | Format | Quality |
|----------|------|--------|---------|
| Store Banner | 1920x640 | WebP | 85 |
| Section Background | 1200x400 | WebP | 85 |
| Hero Image | 1920x1080 | WebP | 80 |

All images are automatically optimized by the Sharp pipeline.

