import fs from 'node:fs'

fs.mkdirSync('dist/apps/backend', { recursive: true })
fs.copyFileSync('apps/backend/package.json', 'dist/apps/backend/package.json')
