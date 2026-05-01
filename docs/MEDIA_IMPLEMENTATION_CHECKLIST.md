# Media System Implementation Checklist

Complete checklist for implementing the DokanX Media Management System in production.

## ✅ Phase 1: Backend Setup

### Environment Configuration
- [ ] Create Cloudflare R2 account
- [ ] Create R2 bucket (e.g., `dokanx-media`)
- [ ] Generate R2 API credentials
  - [ ] Access Key ID
  - [ ] Secret Access Key
  - [ ] Account ID
- [ ] Set up custom domain for CDN (optional but recommended)
- [ ] Add environment variables to `.env.production`:
  ```
  R2_ACCESS_KEY_ID=xxx
  R2_SECRET_ACCESS_KEY=xxx
  R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
  R2_BUCKET_NAME=dokanx-media
  CDN_BASE_URL=https://cdn.dokanx.com
  ```

### Dependencies
- [ ] Verify Sharp is installed: `npm list sharp`
- [ ] Verify multer is installed: `npm list multer`
- [ ] Verify aws-sdk is installed: `npm list aws-sdk`
- [ ] Run npm install if needed: `npm install`

### Core Files
- [ ] Review `src/models/media.model.js`
  - [ ] Verify schema fields
  - [ ] Check indexes
  - [ ] Validate enum values
- [ ] Review `src/services/media.service.js`
  - [ ] Verify all methods present
  - [ ] Check Sharp configuration
  - [ ] Verify AWS S3 client setup
- [ ] Review `src/controllers/media.controller.js`
  - [ ] All endpoints implemented
  - [ ] Error handling in place
  - [ ] Response format correct
- [ ] Review `src/routes/media.routes.js`
  - [ ] All routes registered
  - [ ] Authentication middleware applied
  - [ ] Permission checks in place

### Testing
- [ ] Test environment variables load correctly
- [ ] Test R2 connection
- [ ] Test file upload to R2
- [ ] Test media model save
- [ ] Test API endpoints:
  - [ ] POST /api/media/upload-url
  - [ ] POST /api/media (save metadata)
  - [ ] GET /api/media (list)
  - [ ] GET /api/media/:id (single)
  - [ ] DELETE /api/media/:id (delete)

## ✅ Phase 2: Frontend Setup

### Component Files
- [ ] Create `src/components/image-upload.tsx`
  - [ ] Drag-drop upload
  - [ ] File validation
  - [ ] Progress tracking
  - [ ] Preview thumbnails
- [ ] Create `src/components/optimized-image.tsx`
  - [ ] Responsive images
  - [ ] Lazy loading
  - [ ] Blur placeholders
  - [ ] Format detection (AVIF, WebP, JPEG)
  - [ ] Image gallery component

### Hooks
- [ ] Create `src/hooks/use-media.ts`
  - [ ] listMedia function
  - [ ] uploadFile function
  - [ ] deleteMedia function
  - [ ] getVariantUrl function
  - [ ] Error handling
  - [ ] Loading states

### Testing
- [ ] Test file upload from browser
- [ ] Test drag-drop functionality
- [ ] Test image preview
- [ ] Test lazy loading
- [ ] Test responsive images
- [ ] Test on mobile devices

## ✅ Phase 3: Integration

### Product Module
- [ ] Update product model to include images array
- [ ] Add product image endpoints:
  - [ ] Add image
  - [ ] Remove image
  - [ ] Reorder images
- [ ] Update product form component
  - [ ] Add ImageUpload component
  - [ ] Add image gallery
  - [ ] Add reorder functionality
  - [ ] Add delete buttons
- [ ] Test product creation with images
- [ ] Test product editing with images
- [ ] Test product deletion (cleanup images)

### Theme Module
- [ ] Update theme model for banner/section images
- [ ] Add theme image endpoints:
  - [ ] Update banner
  - [ ] Update section image
  - [ ] Remove image
- [ ] Build theme editor component
  - [ ] Banner upload section
  - [ ] Section image management
  - [ ] Image preview
  - [ ] Delete functionality
- [ ] Test theme editor
- [ ] Test theme preview with images

### Merchant Dashboard
- [ ] Media gallery/library page
- [ ] Media upload interface
- [ ] Media management (delete, organize)
- [ ] Media usage tracking

### Mobile/Rider App
- [ ] Camera upload for delivery proofs
- [ ] Photo gallery
- [ ] Image preview
- [ ] Delete functionality

## ✅ Phase 4: Performance & Optimization

### Image Optimization
- [ ] Verify Sharp resizing:
  - [ ] Product: 300, 800, 1200
  - [ ] Banner: 1200, 1920
  - [ ] Logo: 150, 300
  - [ ] Rider proof: 300, 800
- [ ] Verify WebP conversion
- [ ] Verify quality settings by type
- [ ] Test image sizes < 150KB target

### CDN & Caching
- [ ] Configure Cloudflare caching:
  - [ ] Set cache expiration (1 year for versioned)
  - [ ] Enable compression
  - [ ] Set cache headers
- [ ] Test CDN distribution
- [ ] Verify cache hits in logs

### Frontend Performance
- [ ] Implement lazy loading
- [ ] Add blur placeholders
- [ ] Optimize bundle size
- [ ] Test Core Web Vitals:
  - [ ] LCP (Largest Contentful Paint)
  - [ ] FID (First Input Delay)
  - [ ] CLS (Cumulative Layout Shift)

### Monitoring
- [ ] Setup image delivery metrics
- [ ] Monitor CDN bandwidth
- [ ] Track error rates
- [ ] Monitor upload success rates

## ✅ Phase 5: Security & Compliance

### File Validation
- [ ] Validate MIME types (JPEG, PNG, WebP)
- [ ] Enforce 5MB size limit
- [ ] Scan for malware (optional)
- [ ] Validate image dimensions

### Access Control
- [ ] Ensure auth required for all endpoints
- [ ] Verify role-based access (OWNER, STAFF)
- [ ] Check merchant ID isolation
- [ ] Verify signed URLs only

### Data Protection
- [ ] Enable encryption in transit (HTTPS)
- [ ] Enable encryption at rest (R2)
- [ ] Backup images regularly
- [ ] Implement deletion policies

## ✅ Phase 6: Deployment

### Pre-Deployment
- [ ] Run all tests
- [ ] Performance benchmarks
- [ ] Security audit
- [ ] Load testing
- [ ] Browser compatibility check

### Staging Deployment
- [ ] Deploy to staging environment
- [ ] Test with staging data
- [ ] Verify all endpoints
- [ ] Monitor for errors
- [ ] Load test

### Production Deployment
- [ ] Final code review
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Have rollback plan ready

### Post-Deployment
- [ ] Verify all images loading
- [ ] Check CDN metrics
- [ ] Monitor user reports
- [ ] Track analytics

## ✅ Phase 7: Documentation & Training

### Documentation
- [ ] Complete setup guide ✓
- [ ] Product integration guide ✓
- [ ] Theme integration guide ✓
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] Best practices guide

### Team Training
- [ ] Backend team walkthrough
- [ ] Frontend team walkthrough
- [ ] QA test procedures
- [ ] Support documentation

## 📊 Success Criteria

- [ ] Image upload success rate > 99%
- [ ] Average image load time < 1 second
- [ ] Average image size < 150KB
- [ ] CDN cache hit rate > 80%
- [ ] Error rate < 0.1%
- [ ] User satisfaction > 4.5/5

## 🔄 Migration Plan (if migrating existing images)

- [ ] Export existing images from old storage
- [ ] Batch upload to R2
- [ ] Update URLs in database
- [ ] Verify all images display
- [ ] Monitor for broken images
- [ ] Clean up old storage

## 📝 Common Issues & Solutions

### Issue: "Failed to get upload URL"
- [ ] Check R2 credentials
- [ ] Verify bucket exists
- [ ] Check environment variables
- [ ] Test R2 connection

### Issue: "Image not appearing after upload"
- [ ] Check CDN_BASE_URL
- [ ] Verify R2 permissions
- [ ] Check image processing logs
- [ ] Verify database save succeeded

### Issue: "Slow image loading"
- [ ] Check CDN caching settings
- [ ] Verify WebP conversion
- [ ] Check image sizes
- [ ] Monitor bandwidth

### Issue: "Upload fails on mobile"
- [ ] Check file size limits
- [ ] Verify CORS settings
- [ ] Test network connectivity
- [ ] Check browser compatibility

## 📞 Support & Escalation

- **Level 1**: Merchant support (FAQ, basic troubleshooting)
- **Level 2**: Tech support (API issues, connection problems)
- **Level 3**: Development team (Architecture changes, optimization)

## 📅 Timeline Estimate

- Phase 1 (Backend): 2-3 days
- Phase 2 (Frontend): 3-4 days
- Phase 3 (Integration): 3-4 days
- Phase 4 (Optimization): 2-3 days
- Phase 5 (Security): 1-2 days
- Phase 6 (Deployment): 1-2 days
- Phase 7 (Documentation): 1-2 days

**Total: 2-3 weeks** (depending on team size and complexity)

## 🎯 Next Steps

1. [ ] Complete Phase 1 checklist
2. [ ] Get approval for Cloudflare R2 setup
3. [ ] Start Phase 2 development
4. [ ] Setup staging environment
5. [ ] Begin integration testing
6. [ ] Plan production deployment
7. [ ] Train team on system

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-24  
**Maintained By:** CTO Team

