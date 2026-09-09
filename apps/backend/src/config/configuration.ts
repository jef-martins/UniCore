export default () => ({
  port: Number.parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  jwtSecret: process.env['JWT_SECRET'] ?? '',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '9h',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
  googleServiceAccountFile: process.env['GOOGLE_SERVICE_ACCOUNT_FILE'] ?? '',
  googleClientEmail: process.env['GOOGLE_CLIENT_EMAIL'] ?? '',
  googlePrivateKey: process.env['GOOGLE_PRIVATE_KEY'] ?? '',
  googleAdminSubject: process.env['GOOGLE_ADMIN_SUBJECT'] ?? '',
})
