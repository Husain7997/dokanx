const mediaService = require('./src/services/media.service');

// Test validateUploadParams
console.log('Testing validateUploadParams...');
try {
  mediaService.validateUploadParams('product', '507f1f77bcf86cd799439011', 'test.jpg', 'image/jpeg');
  console.log('✓ Valid parameters passed');
} catch (error) {
  console.log('✗ Valid parameters failed:', error.message);
}

try {
  mediaService.validateUploadParams('invalid', '507f1f77bcf86cd799439011', 'test.jpg', 'image/jpeg');
  console.log('✗ Invalid type should have failed');
} catch (error) {
  console.log('✓ Invalid type correctly rejected:', error.message);
}

// Test validateFile
console.log('\nTesting validateFile...');
try {
  mediaService.validateFile({ size: 1024 * 1024, mimetype: 'image/jpeg' });
  console.log('✓ Valid file passed');
} catch (error) {
  console.log('✗ Valid file failed:', error.message);
}

try {
  mediaService.validateFile({ size: 10 * 1024 * 1024, mimetype: 'image/jpeg' });
  console.log('✗ Large file should have failed');
} catch (error) {
  console.log('✓ Large file correctly rejected:', error.message);
}

// Test getSizesForType
console.log('\nTesting getSizesForType...');
const sizes = mediaService.getSizesForType('product');
console.log('Product sizes:', sizes);
if (JSON.stringify(sizes) === JSON.stringify([300, 800, 1200])) {
  console.log('✓ Product sizes correct');
} else {
  console.log('✗ Product sizes incorrect');
}

// Test extractKeyFromUrl
console.log('\nTesting extractKeyFromUrl...');
const key = mediaService.extractKeyFromUrl('https://cdn.example.com/media/uploads/507f1f77bcf86cd799439011/product/test-uuid.webp');
console.log('Extracted key:', key);
if (key === 'media/uploads/507f1f77bcf86cd799439011/product/test-uuid.webp') {
  console.log('✓ Key extraction correct');
} else {
  console.log('✗ Key extraction incorrect');
}

console.log('\nMedia service validation complete!');