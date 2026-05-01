# DokanX Media Management System - Setup Guide

## 🎯 Overview

The Media Management System handles image uploads, optimization, and delivery for DokanX platform. It supports:

- Product images (with automatic resizing and format conversion)
- Banners & themes
- Merchant logos
- Rider delivery proofs
- KYC documents

## 🏗️ Architecture

```
Upload → Request URL → Upload to R2 → Save Metadata → CDN Delivery
```

## 📋 Prerequisites

- Node.js (already installed)
- Cloudflare R2 account (recommended for production)
- AWS S3 account (alternative)

## 🚀 Step-by-Step Setup

### 1. Create Cloudflare R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select **R2**
3. Create new bucket: `dokanx-media` (or your preferred name)
4. Note the bucket name

### 2. Generate R2 API Credentials

1. In R2 dashboard, go to **Settings**
2. Click **Create API token** under "API Tokens"
3. Configure permissions:
   - ✅ Object Read/Write
   - ✅ Bucket Read
4. Generate token and note:
   - Access Key ID
   - Secret Access Key
   - Account ID

### 3. Configure Environment Variables

Add to `.env.local` or `.env.production`:

```bash
# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
R2_BUCKET_NAME=dokanx-media

# CDN Configuration (Custom Domain for R2)
CDN_BASE_URL=https://cdn.dokanx.com
# OR use Cloudflare-provided URL:
# CDN_BASE_URL=https://pub-[id].r2.dev
```

### 4. Setup Cloudflare Custom Domain (Optional but Recommended)

1. In R2 bucket settings, go to **Settings**
2. Under "Custom Domains", click **Connect Domain**
3. Point your custom domain (e.g., cdn.dokanx.com) to R2
4. Update `.env` with your custom domain

### 5. Install Dependencies

All dependencies are already installed:
- `sharp` - Image optimization
- `multer` - File upload handling
- `aws-sdk` - AWS S3 / Cloudflare R2 client

```bash
npm install
```

## 📁 File Structure

```
Backend:
- src/models/media.model.js       # MongoDB schema
- src/services/media.service.js   # Business logic
- src/controllers/media.controller.js # API handlers
- src/routes/media.routes.js      # Route definitions

Frontend:
- src/components/image-upload.tsx     # Upload component
- src/components/optimized-image.tsx  # Image display component
- src/hooks/use-media.ts              # Media management hook
```

## 🔌 API Endpoints

### 1. Generate Upload URL

```bash
POST /api/media/upload-url
Authorization: Bearer {token}

Body:
{
  "type": "product",
  "fileName": "shoe.jpg",
  "mimeType": "image/jpeg"
}

Response:
{
  "uploadUrl": "signed-url",
  "fileUrl": "cdn-url",
  "key": "s3-key"
}
```

### 2. Save Media (After Upload to R2)

```bash
POST /api/media
Authorization: Bearer {token}

Body:
{
  "type": "product",
  "fileName": "shoe.jpg",
  "fileUrl": "https://cdn.dokanx.com/dokanx/merchants/...",
  "key": "s3-key"
}

Response:
{
  "_id": "media-id",
  "url": "cdn-url",
  "type": "product",
  "variants": []
}
```

### 3. List Media

```bash
GET /api/media?type=product&limit=50&offset=0
Authorization: Bearer {token}

Response:
{
  "media": [
    {
      "_id": "media-id",
      "url": "cdn-url",
      "type": "product",
      "fileName": "shoe.jpg",
      "variants": []
    }
  ]
}
```

### 4. Delete Media

```bash
DELETE /api/media/{mediaId}
Authorization: Bearer {token}

Response: Success message
```

## 🎨 Frontend Usage

### Image Upload Component

```tsx
import { ImageUpload } from '@/components/image-upload';

export function ProductForm() {
  const handleUploadComplete = (media) => {
    console.log('Uploaded:', media);
    // Save media.url to product
  };

  return (
    <ImageUpload
      type="product"
      onUploadComplete={handleUploadComplete}
      onError={(error) => console.error(error)}
      maxSize={5 * 1024 * 1024}
    />
  );
}
```

### Optimized Image Display

```tsx
import { OptimizedImage, ImageGallery } from '@/components/optimized-image';

export function ProductDisplay({ product }) {
  return (
    <div>
      {/* Single image with optimization */}
      <OptimizedImage
        src={product.image}
        alt="Product"
        variant="large"
        loading="lazy"
      />

      {/* Image gallery */}
      <ImageGallery
        images={product.images}
        alt="Product images"
      />
    </div>
  );
}
```

### Using Media Hook

```tsx
import { useMedia } from '@/hooks/use-media';

export function MediaManager() {
  const { media, uploadFile, deleteMedia, listMedia } = useMedia();

  const handleUpload = async (file: File) => {
    const uploaded = await uploadFile(file, 'product');
    if (uploaded) {
      console.log('Success:', uploaded);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => handleUpload(e.target.files?.[0]!)}
      />
      {media.map((m) => (
        <div key={m._id}>
          <img src={m.url} alt={m.fileName} />
          <button onClick={() => deleteMedia(m._id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

## 🖼️ Image Optimization

### Automatic Resizing by Type

| Type | Sizes |
|------|-------|
| product | 300x300, 800x800, 1200x1200 |
| banner | 1200x400, 1920x640 |
| logo | 150x150, 300x300 |
| rider-proof | 300x300, 800x600 |

### Quality Settings

| Type | Quality |
|------|---------|
| product | 80 |
| banner | 85 |
| logo | 90 |
| rider-proof | 75 |

All images are converted to WebP format automatically.

## 🔐 Security Features

1. **File Validation**
   - Only JPEG, PNG, WebP allowed
   - Max 5MB per file
   - Mime type verification

2. **Signed URLs**
   - Upload URLs expire in 1 hour
   - Direct R2 uploads (backend not involved)
   - No public write access

3. **Authentication**
   - All endpoints require authentication
   - Permission checks (PRODUCT_WRITE)
   - Merchant ID isolation

## ⚡ Performance Tips

1. **Lazy Loading**
   - Use `loading="lazy"` on images
   - Implement blur placeholders

2. **CDN Caching**
   - Enable 1-year cache for versioned images
   - Use query parameters for cache busting

3. **Image Compression**
   - Automatic WebP conversion saves 30-50%
   - Different quality by type
   - Responsive sizes by device

## 📊 Monitoring

Check image delivery metrics in Cloudflare Dashboard:
- Cache hit rate
- Bandwidth usage
- Error rates

## 🐛 Troubleshooting

### "Failed to get upload URL"
- Check R2 credentials in `.env`
- Verify R2 bucket exists
- Check user permissions

### "Failed to upload file"
- Verify signed URL is valid (not expired)
- Check file size < 5MB
- Verify content-type header

### "Uploaded file not visible"
- Check CDN_BASE_URL is correct
- Wait for CDN cache (usually instant)
- Verify R2 bucket is public or signed URLs are used

## 📚 Integration Examples

See [Product Integration](./PRODUCT_INTEGRATION.md) for product image uploads.
See [Theme Integration](./THEME_INTEGRATION.md) for theme banner uploads.

## 🚀 Performance Targets

- Upload: < 2 seconds (varies with file size)
- Image load: < 1 second (with CDN caching)
- Image size: < 150KB (with optimization)

## 📖 Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [MDN - Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
