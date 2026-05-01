# Media System - Quick Start Guide

**Getting the Media Upload & Management System running in 30 minutes.**

---

## 🎯 What You're Getting

✅ Image upload to Cloudflare R2  
✅ Automatic image optimization (WebP, multiple sizes)  
✅ Fast CDN delivery  
✅ Production-ready security  
✅ React components for easy integration  
✅ TypeScript support  

---

## 📋 Step 1: Environment Setup (5 min)

### Create `.env.production` in backend folder:

```bash
# Cloudflare R2
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
R2_BUCKET_NAME=dokanx-media
CDN_BASE_URL=https://cdn.dokanx.com
```

**Need R2 account?**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select R2
3. Create bucket: `dokanx-media`
4. Settings → Generate API token
5. Copy credentials

---

## 📦 Step 2: Install Dependencies (2 min)

```bash
cd apps/backend
npm install sharp aws-sdk multer
```

**Already installed?** Run:
```bash
npm install
```

---

## 🔧 Step 3: Backend Verification (3 min)

Check these files exist:

```
✓ src/models/media.model.js
✓ src/services/media.service.js
✓ src/controllers/media.controller.js
✓ src/routes/media.routes.js
```

Verify routes are registered in `src/routes/index.js`:
```javascript
app.use('/api/media', require('./media.routes.js'));
```

---

## 🎨 Step 4: Frontend Components (5 min)

Create these files:

### 1. Image Upload Component
Create: `apps/frontend/merchant-dashboard/src/components/image-upload.tsx`
```
🎯 Drag-drop file upload
✓ File validation
✓ Progress tracking
✓ Preview thumbnails
```

### 2. Optimized Image Component
Create: `apps/frontend/merchant-dashboard/src/components/optimized-image.tsx`
```
✓ Responsive images
✓ Lazy loading
✓ Format detection
✓ Image gallery
```

### 3. Media Hook
Create: `apps/frontend/merchant-dashboard/src/hooks/use-media.ts`
```
✓ Upload management
✓ Media listing
✓ Delete operations
✓ Error handling
```

---

## 🧪 Step 5: Test Upload (5 min)

### Start backend:
```bash
cd apps/backend
npm run dev
```

### Start frontend:
```bash
cd apps/frontend/merchant-dashboard
npm run dev
```

### Test in browser:
```typescript
import { ImageUpload } from '@/components/image-upload';

function TestComponent() {
  return (
    <ImageUpload
      type="product"
      onUploadComplete={(media) => console.log('Success:', media)}
      onError={(error) => console.log('Error:', error)}
    />
  );
}
```

**Expected output:**
- File uploads to R2
- Console shows: `Success: { _id, url, type, ... }`
- Image loads from CDN

---

## 🎯 Step 6: Integrate with Products (5 min)

### Update Product Form:

```tsx
import { ImageUpload } from '@/components/image-upload';
import { OptimizedImage } from '@/components/optimized-image';

export function CreateProduct() {
  const [images, setImages] = useState([]);

  const handleUploadComplete = (media) => {
    setImages(prev => [...prev, media.url]);
  };

  return (
    <form>
      <input type="text" placeholder="Product name" />
      
      <ImageUpload
        type="product"
        onUploadComplete={handleUploadComplete}
      />

      <div className="grid grid-cols-4 gap-2">
        {images.map((url, i) => (
          <OptimizedImage
            key={i}
            src={url}
            alt={`Image ${i}`}
            variant="medium"
          />
        ))}
      </div>

      <button type="submit">Save Product</button>
    </form>
  );
}
```

---

## 📊 Verify Everything Works

### Checklist:

- [ ] Backend starts without errors
- [ ] R2 credentials valid
- [ ] Frontend components import correctly
- [ ] File uploads to R2 (check R2 dashboard)
- [ ] Metadata saved to MongoDB
- [ ] Image loads from CDN
- [ ] Console shows no errors

---

## 🚀 Common Tasks

### List User's Media
```typescript
const { media, listMedia } = useMedia();

useEffect(() => {
  listMedia('product'); // Get all product images
}, []);

// media = [{ _id, url, type, ... }]
```

### Upload a File
```typescript
const { uploadFile } = useMedia();

const file = fileInput.files[0];
const uploaded = await uploadFile(file, 'product');
console.log(uploaded); // { _id, url, ... }
```

### Delete Media
```typescript
const { deleteMedia } = useMedia();

await deleteMedia(mediaId);
```

### Get Specific Size
```typescript
const { getVariantUrl } = useMedia();

const thumbnail = getVariantUrl(media, 'thumbnail'); // 300x300
const medium = getVariantUrl(media, 'medium');       // 800x800
const large = getVariantUrl(media, 'large');         // 1200x1200
```

---

## 🎨 Available Image Types

| Type | Use | Sizes |
|------|-----|-------|
| `product` | Product images | 300, 800, 1200 |
| `banner` | Store banners | 1200, 1920 |
| `logo` | Merchant logos | 150, 300 |
| `rider-proof` | Delivery photos | 300, 800 |
| `kyc` | ID/documents | varies |
| `theme` | Theme images | varies |

---

## ⚡ Performance Tips

1. **Lazy load images**
```tsx
<OptimizedImage 
  src={url} 
  loading="lazy"  // ← Add this
/>
```

2. **Use blur placeholders**
```tsx
<OptimizedImage 
  src={url} 
  blurPlaceholder={true}  // ← Default enabled
/>
```

3. **Implement image gallery**
```tsx
import { ImageGallery } from '@/components/optimized-image';

<ImageGallery 
  images={[url1, url2, url3]}
  onImageSelect={(index) => console.log(index)}
/>
```

---

## 🐛 Troubleshooting

### Upload fails with "Failed to get upload URL"
```
1. Check R2 credentials in .env
2. Verify R2 bucket exists
3. Restart backend
```

### Image not visible after upload
```
1. Check CDN_BASE_URL is correct
2. Wait 5 seconds for CDN propagation
3. Check R2 bucket has public read access
```

### Upload times out on large files
```
1. Increase timeout in fetch
2. Show progress indicator
3. Split into smaller files
```

### Black/Broken images in gallery
```
1. Check image URLs are correct
2. Verify CDN access allowed
3. Check CORS settings
```

---

## 📚 Next Steps

Once running:

1. **Integrate with more modules**
   - Theme editor (banners)
   - Merchant logo (profile)
   - Rider proofs (orders)

2. **Setup analytics**
   - Track upload success rate
   - Monitor image delivery
   - Measure performance

3. **Optimize further**
   - Implement image cropping
   - Add batch uploads
   - Auto-generate thumbnails

---

## 📖 Full Documentation

- [Setup Guide](./MEDIA_SETUP_GUIDE.md) - Detailed setup
- [API Reference](./MEDIA_API_REFERENCE.md) - All endpoints
- [Product Integration](./PRODUCT_INTEGRATION_GUIDE.md) - Product module
- [Theme Integration](./THEME_INTEGRATION_GUIDE.md) - Theme editor
- [Implementation Checklist](./MEDIA_IMPLEMENTATION_CHECKLIST.md) - Full checklist

---

## 💡 Key Features

✅ **Signed URLs** - Secure, time-limited upload links  
✅ **Direct Upload** - Browser uploads directly to R2  
✅ **Auto-Optimize** - Sharp resizes & converts to WebP  
✅ **Multi-Size** - Thumbnail, medium, large variants  
✅ **Fast Delivery** - Global CDN caching  
✅ **TypeScript** - Full type safety  
✅ **Error Handling** - Comprehensive error messages  
✅ **Progress Tracking** - Real-time upload progress  
✅ **Lazy Loading** - Performance optimized images  
✅ **Mobile Ready** - Responsive components  

---

## 🎯 Success Metrics

After setup, you should see:

```
✓ Upload time: < 2 seconds
✓ Image load: < 1 second (cached)
✓ Image size: < 150KB
✓ CDN hit rate: > 80%
✓ Error rate: < 0.1%
```

---

## 🆘 Need Help?

1. Check the docs (links above)
2. Review error console in browser
3. Check backend logs
4. Review R2 dashboard

---

## 🎉 You're Ready!

Your DokanX Media System is now:

✅ Production-ready  
✅ Scalable  
✅ Optimized  
✅ Secure  

**Start using it now!** 🚀

---

**Questions?** Review docs or reach out to CTO team.

