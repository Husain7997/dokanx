# Media API - Quick Reference

Complete API documentation for the DokanX Media Management System.

## Base URL

```
/api/media
```

## Authentication

All endpoints require:
- Bearer token in Authorization header
- Valid merchant/shop ID in request context
- Appropriate permissions

## Endpoints

### 1. Generate Upload URL

Get a signed URL for uploading directly to R2.

```http
POST /api/media/upload-url
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "product|banner|logo|rider-proof|kyc|theme",
  "fileName": "image.jpg",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "uploadUrl": "https://...",
  "fileUrl": "https://cdn.dokanx.com/...",
  "key": "dokanx/merchants/..."
}
```

**Status Codes:**
- `200`: Success
- `400`: Missing required fields
- `401`: Unauthorized
- `500`: Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/media/upload-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "product",
    "fileName": "shoe.jpg",
    "mimeType": "image/jpeg"
  }'
```

---

### 2. Save Media Metadata

Save image metadata after uploading to R2.

```http
POST /api/media
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "product|banner|logo|rider-proof|kyc|theme",
  "fileName": "image.jpg",
  "fileUrl": "https://cdn.dokanx.com/...",
  "key": "dokanx/merchants/..."
}
```

**Response:**
```json
{
  "_id": "media-id",
  "url": "https://cdn.dokanx.com/...",
  "type": "product",
  "fileName": "image.jpg",
  "fileSize": 0,
  "mimeType": "image/webp",
  "variants": [],
  "createdAt": "2026-04-24T...",
  "updatedAt": "2026-04-24T..."
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "product",
    "fileName": "shoe.jpg",
    "fileUrl": "https://cdn.dokanx.com/dokanx/merchants/...",
    "key": "dokanx/merchants/..."
  }'
```

---

### 3. List Media

Get all media for the current merchant.

```http
GET /api/media?type=product&limit=50&offset=0
Authorization: Bearer {token}
```

**Query Parameters:**
- `type` (optional): Filter by type (product, banner, logo, etc.)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Skip results (default: 0)

**Response:**
```json
{
  "media": [
    {
      "_id": "media-id",
      "url": "https://cdn.dokanx.com/...",
      "type": "product",
      "fileName": "image.jpg",
      "fileSize": 65536,
      "mimeType": "image/webp",
      "variants": [
        {
          "size": "thumbnail",
          "url": "https://cdn.dokanx.com/...",
          "width": 300,
          "height": 300,
          "fileSize": 15360
        }
      ],
      "createdAt": "2026-04-24T...",
      "updatedAt": "2026-04-24T..."
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/api/media?type=product&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Get Media by ID

Get details of a specific media file.

```http
GET /api/media/{mediaId}
Authorization: Bearer {token}
```

**Path Parameters:**
- `mediaId`: Media document ID

**Response:**
```json
{
  "media": {
    "_id": "media-id",
    "url": "https://cdn.dokanx.com/...",
    "type": "product",
    "fileName": "image.jpg",
    "fileSize": 65536,
    "mimeType": "image/webp",
    "variants": [...]
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/media/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Delete Media

Delete a media file from storage and database.

```http
DELETE /api/media/{mediaId}
Authorization: Bearer {token}
```

**Path Parameters:**
- `mediaId`: Media document ID

**Response:**
```json
{
  "success": true,
  "message": "Media deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/media/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Frontend Integration

### Using the useMedia Hook

```typescript
import { useMedia } from '@/hooks/use-media';

function MyComponent() {
  const {
    media,
    loading,
    error,
    uploadProgress,
    listMedia,
    uploadFile,
    deleteMedia,
    getVariantUrl
  } = useMedia();

  // List all product images
  useEffect(() => {
    listMedia('product');
  }, []);

  // Upload a file
  const handleUpload = async (file: File) => {
    const uploaded = await uploadFile(file, 'product');
    if (uploaded) {
      console.log('Success:', uploaded);
    }
  };

  // Delete media
  const handleDelete = async (mediaId: string) => {
    const success = await deleteMedia(mediaId);
    if (success) {
      console.log('Deleted');
    }
  };

  // Get specific variant URL
  const thumbnailUrl = getVariantUrl(media[0], 'thumbnail');
}
```

---

## Image Types & Sizes

### Type: "product"
- Sizes: 300x300 (thumbnail), 800x800 (medium), 1200x1200 (large)
- Quality: 80
- Best for: Product images, gallery

### Type: "banner"
- Sizes: 1200x400 (medium), 1920x640 (large)
- Quality: 85
- Best for: Store banners, promotions

### Type: "logo"
- Sizes: 150x150 (thumbnail), 300x300 (medium)
- Quality: 90
- Best for: Merchant logos, brand icons

### Type: "rider-proof"
- Sizes: 300x300 (thumbnail), 800x600 (medium)
- Quality: 75
- Best for: Delivery photos

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## Error Responses

### Invalid Request
```json
{
  "success": false,
  "error": "Missing required fields: type, fileName, mimeType"
}
```

### Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### File Too Large
```json
{
  "success": false,
  "error": "File size too large. Maximum 5MB allowed."
}
```

### Invalid File Type
```json
{
  "success": false,
  "error": "Invalid file type. Only JPEG, PNG, and WebP are allowed."
}
```

---

## Complete Upload Flow

### Step 1: Get Upload URL
```bash
POST /api/media/upload-url
```

### Step 2: Upload to R2
```bash
PUT {uploadUrl} (signed URL)
```

### Step 3: Save Metadata
```bash
POST /api/media
```

---

## Rate Limiting

- 100 requests per minute per user
- 10,000 requests per hour per user
- Large file uploads not rate-limited

---

## Best Practices

1. **Always validate files on client side first**
   ```typescript
   const validateFile = (file: File) => {
     const maxSize = 5 * 1024 * 1024;
     const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
     
     if (file.size > maxSize) throw new Error('File too large');
     if (!allowedTypes.includes(file.type)) throw new Error('Invalid type');
   };
   ```

2. **Use progress tracking for UX**
   ```typescript
   const progress = (uploadProgress / 100) * 100;
   console.log(`Upload ${progress}% complete`);
   ```

3. **Implement retry logic**
   ```typescript
   const maxRetries = 3;
   let retryCount = 0;
   while (retryCount < maxRetries) {
     try {
       return await uploadFile(file, type);
     } catch (error) {
       retryCount++;
       await new Promise(r => setTimeout(r, 1000 * retryCount));
     }
   }
   ```

4. **Cache variant URLs**
   ```typescript
   const variantCache = new Map();
   ```

5. **Monitor CDN performance**
   - Track cache hits
   - Monitor bandwidth
   - Watch error rates

---

## Troubleshooting

### "Failed to get upload URL"
- Check API authentication token
- Verify merchant/shop ID
- Check server logs for details

### "Failed to upload file"
- Verify signed URL not expired
- Check file size < 5MB
- Verify Content-Type header matches
- Check R2 permissions

### "Media metadata not saved"
- Verify file actually uploaded to R2
- Check database connection
- Review error logs

### "Image not loading from CDN"
- Verify CDN_BASE_URL configuration
- Check R2 bucket public access
- Verify URL format correct
- Check Cloudflare cache

---

## Examples

### JavaScript/Node.js

```javascript
// Upload and save
async function uploadImage(file) {
  // Get upload URL
  const urlResponse = await fetch('/api/media/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'product',
      fileName: file.name,
      mimeType: file.type
    })
  });

  const { uploadUrl, fileUrl } = await urlResponse.json();

  // Upload to R2
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  });

  // Save metadata
  const saveResponse = await fetch('/api/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'product',
      fileName: file.name,
      fileUrl
    })
  });

  return await saveResponse.json();
}
```

### React

```typescript
import { useMedia } from '@/hooks/use-media';
import { ImageUpload } from '@/components/image-upload';

export function ProductImageUpload() {
  const { uploadFile } = useMedia();

  return (
    <ImageUpload
      type="product"
      onUploadComplete={(media) => console.log('Uploaded:', media)}
      onError={(error) => console.error('Upload failed:', error)}
    />
  );
}
```

---

## Performance Metrics

| Metric | Target | Typical |
|--------|--------|---------|
| Upload speed | 2s | 1-3s |
| Image load | <1s | <500ms |
| CDN hit rate | >80% | >90% |
| Average image size | <150KB | 80-120KB |
| Availability | >99.9% | 99.95% |

---

## Support

For issues or questions:
- Check documentation
- Review error logs
- Contact support team
- Open an issue on GitHub

