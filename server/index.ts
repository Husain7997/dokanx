import { createApp } from './src/app';
import { config } from './config';

/**
 * DokanX Backend Server Entry Point
 * 
 * প্রোডাকশন-গ্রেড সার্ভার স্টার্টআপ:
 * - মাল্টি-টেন্যান্ট সাপোর্ট
 * - ইরর হ্যান্ডলিং
 * - গ্রেসফুল শাটডাউন
 */

async function startServer() {
  try {
    const app = await createApp();
    
    const PORT = config.server.port || 5000;
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 DokanX API লাইভ: http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/health`);
    });

    // গ্রেসফুল শাটডাউন (প্রোডাকশন রিকোয়ার্ড)
    process.on('SIGTERM', () => {
      console.log('📤 SIGTERM রিসিভ্ড, সার্ভার শাটডাউন করা হচ্ছে...');
      server.close(() => {
        console.log('✅ সার্ভার শাটডাউন সম্পূর্ণ');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📤 SIGINT রিসিভ্ড, সার্ভার শাটডাউন করা হচ্ছে...');
      server.close(() => {
        console.log('✅ সার্ভার শাটডাউন সম্পূর্ণ');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('💥 সার্ভার স্টার্টআপ এড়ে:', error);
    process.exit(1);
  }
}

// সার্ভার স্টার্ট
startServer();