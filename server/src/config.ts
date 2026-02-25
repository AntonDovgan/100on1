const isProd = process.env.NODE_ENV === 'production';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  adminPassword: process.env.ADMIN_PASSWORD || 'admin8march',
  clientUrl: process.env.CLIENT_URL || (isProd ? undefined : 'http://localhost:5173'),
};
