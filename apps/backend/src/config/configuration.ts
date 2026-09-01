export default () => ({
  port: Number.parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  databaseUrl: process.env['DATABASE_URL'] ?? '',
  jwtSecret: process.env['JWT_SECRET'] ?? '',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
})
