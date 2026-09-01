export default () => {
  const nodeEnv = process.env['NODE_ENV'] ?? 'development'
  const databaseUrl = process.env['DATABASE_URL'] ?? ''

  return {
    port: Number.parseInt(process.env['PORT'] ?? '3000', 10),
    nodeEnv,
    databaseUrl,
    databaseHost: process.env['DB_HOST'] ?? 'localhost',
    databasePort: Number.parseInt(process.env['DB_PORT'] ?? '5432', 10),
    databaseName: process.env['DB_NAME'] ?? 'unicore',
    databaseUser: process.env['DB_USER'] ?? 'postgres',
    databasePassword: process.env['DB_PASSWORD'] ?? '',
    databasePoolMax: Number.parseInt(process.env['DATABASE_POOL_MAX'] ?? '10', 10),
    jwtSecret: process.env['JWT_SECRET'] ?? '',
    corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
  }
}
