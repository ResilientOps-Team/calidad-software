#!/usr/bin/env node
// Validaciones automáticas posteriores al despliegue de ResilientOps.
// Uso: node scripts/post-deploy-check.mjs <url> [--version <x.y.z>]
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const MAX_RESPONSE_MS = 3000

export function parsePage(html) {
  const meta = (name) =>
    html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] ?? null

  const assets = [
    ...html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+\.(?:js|css))"/g),
  ].map((m) => m[1])

  return {
    title: html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null,
    version: meta('app-version'),
    commit: meta('app-commit'),
    assets: [...new Set(assets)],
  }
}

async function timedFetch(fetchImpl, url) {
  const start = performance.now()
  const response = await fetchImpl(url, { redirect: 'follow', cache: 'no-store' })
  const body = await response.text()
  return { response, body, ms: Math.round(performance.now() - start) }
}

// GitHub Pages puede servir la versión anterior unos segundos tras el despliegue
async function fetchHome(fetchImpl, url, expectedVersion, { attempts, delayMs }) {
  let last
  for (let i = 1; i <= attempts; i++) {
    try {
      last = await timedFetch(fetchImpl, url)
      const ready = last.response.ok
      const versionOk = !expectedVersion || parsePage(last.body).version === expectedVersion
      if (ready && versionOk) return last
    } catch (error) {
      last = { error }
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, delayMs))
  }
  return last
}

export async function runChecks({
  baseUrl,
  expectedVersion,
  fetchImpl = fetch,
  attempts = 12,
  delayMs = 10000,
}) {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const results = []
  const check = (name, ok, detail) => results.push({ name, ok, detail })

  const home = await fetchHome(fetchImpl, base, expectedVersion, { attempts, delayMs })
  if (!home?.response) {
    check('La página principal responde', false, String(home?.error ?? 'sin respuesta'))
    return results
  }

  const { response, body, ms } = home
  check('La página principal responde con HTTP 200', response.status === 200, `HTTP ${response.status}`)
  check(
    'Se sirve como HTML',
    (response.headers.get('content-type') ?? '').includes('text/html'),
    response.headers.get('content-type') ?? 'sin content-type'
  )
  check(`Tiempo de respuesta menor a ${MAX_RESPONSE_MS} ms`, ms < MAX_RESPONSE_MS, `${ms} ms`)

  const page = parsePage(body)
  check('El título identifica a ResilientOps', page.title?.startsWith('ResilientOps') ?? false, page.title ?? 'sin <title>')

  if (expectedVersion) {
    check('La versión desplegada coincide con el release', page.version === expectedVersion, `esperada ${expectedVersion}, servida ${page.version}`)
    check(
      'La interfaz muestra la versión del release',
      body.includes(`v${expectedVersion}`),
      body.includes(`v${expectedVersion}`) ? `v${expectedVersion}` : 'no aparece en el HTML'
    )
  }

  const brokenAssets = []
  for (const asset of page.assets) {
    const url = new URL(asset, base).href
    try {
      const res = await fetchImpl(url)
      if (!res.ok) brokenAssets.push(`${asset} (HTTP ${res.status})`)
    } catch (error) {
      brokenAssets.push(`${asset} (${error.message})`)
    }
  }
  check(
    'Los recursos estáticos (JS/CSS) cargan',
    page.assets.length > 0 && brokenAssets.length === 0,
    page.assets.length === 0 ? 'no se encontraron recursos' : brokenAssets.join(', ') || `${page.assets.length} recursos`
  )

  try {
    const missing = await fetchImpl(new URL('ruta-que-no-existe', base).href)
    check('Una ruta inexistente devuelve HTTP 404', missing.status === 404, `HTTP ${missing.status}`)
  } catch (error) {
    check('Una ruta inexistente devuelve HTTP 404', false, error.message)
  }

  return results
}

export function formatSummary(baseUrl, results) {
  const rows = results.map((r) => `| ${r.ok ? '✅' : '❌'} | ${r.name} | ${r.detail} |`)
  return [
    `### Validación posterior al despliegue`,
    ``,
    `URL: ${baseUrl}`,
    ``,
    `| | Verificación | Detalle |`,
    `|---|---|---|`,
    ...rows,
    ``,
  ].join('\n')
}

async function main() {
  const args = process.argv.slice(2)
  const baseUrl = args.find((a) => !a.startsWith('--'))
  const versionIndex = args.indexOf('--version')
  const expectedVersion = versionIndex >= 0 ? args[versionIndex + 1] : undefined

  if (!baseUrl) {
    console.error('Uso: node scripts/post-deploy-check.mjs <url> [--version <x.y.z>]')
    process.exit(2)
  }

  const results = await runChecks({ baseUrl, expectedVersion })
  for (const r of results) console.log(`${r.ok ? 'OK   ' : 'FALLA'} ${r.name} — ${r.detail}`)

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, formatSummary(baseUrl, results))
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    console.error(`::error::${failed.length} validación(es) fallaron tras el despliegue`)
    process.exit(1)
  }
  console.log(`Despliegue validado: ${results.length} verificaciones correctas`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
