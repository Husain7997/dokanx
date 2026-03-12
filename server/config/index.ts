import dotenv from 'dotenv';

dotenv.config();

export const config = {
  db: {
    uri: `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    expiresIn: '7d',
  },
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
  },
};