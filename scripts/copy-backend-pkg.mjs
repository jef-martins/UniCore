import fs from 'node:fs'

fs.copyFileSync('apps/backend/package.json', 'dist/apps/backend/package.json')
