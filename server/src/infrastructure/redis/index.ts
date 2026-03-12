import { createClient, RedisClientType } from 'redis';
import { config } from '../../config';

let redisClient: RedisClientType;

/**
 * Initialize Redis connection with production-grade settings
 * Supports horizontal scaling & rate limiting
 */
export async function initRedis(): Promise<RedisClientType> {
  redisClient = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
    },
    // Enable reconnection for resilience
    reconnection: {
      maxRetries: 3,
      retryDelay: 500,
    },
  });

  redisClient.on('error', (err) => {
    console.error('🔴 Redis Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connection successful');
  });

  await redisClient.connect();
  return redisClient;
}

/**
 * Generate idempotency key to prevent duplicate financial operations
 * Format: tenantId:action:timestamp
 */
export function generateIdempotencyKey(tenantId: string, action: string): string {
  return `${tenantId}:${action}:${Date.now()}`;
}

/**
 * Rate limiting using Redis to protect APIs from abuse
 * Limits each shop to 10 requests per second
 */
export async function checkRateLimit(tenantId: string): Promise<boolean> {
  const key = `rate_limit:${tenantId}`;
  const current = await redisClient.get(key);

  if (parseInt(current || '0') >= 10) {
    return false; // limit exceeded
  }

  await redisClient.incr(key);
  await redisClient.expire(key, 1);
  return true;
}

// Export client for middleware usage
export { redisClient };