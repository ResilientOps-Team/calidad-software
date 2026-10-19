import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NextConfig } from 'next'

// semantic-release escribe la versión del release en package.json antes del build
const { version } = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf8')
) as { version: string }

// La exportación estática solo se usa para GitHub Pages; el CI sigue validando con next start
const isStaticExport = process.env.NEXT_OUTPUT === 'export'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_COMMIT: (process.env.APP_COMMIT_SHA ?? 'local').slice(0, 7),
  },
  ...(isStaticExport && {
    output: 'export',
    // GitHub Pages sirve el sitio bajo /<repositorio>
    basePath: process.env.PAGES_BASE_PATH ?? '',
  }),
}

export default nextConfig
