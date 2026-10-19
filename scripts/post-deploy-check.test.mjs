import { describe, expect, it } from 'vitest'
import { formatSummary, parsePage, runChecks } from './post-deploy-check.mjs'

const BASE = 'https://example.github.io/calidad-software/'

const page = (version = '1.2.0') => `<!DOCTYPE html><html><head>
<title>ResilientOps | Simulador de Continuidad Operativa ante Desastres</title>
<meta name="app-version" content="${version}"/>
<meta name="app-commit" content="abc1234"/>
<link rel="stylesheet" href="/calidad-software/_next/static/css/app.css"/>
<script src="/calidad-software/_next/static/chunks/main.js" async=""></script>
<script src="/calidad-software/_next/static/chunks/main.js" async=""></script>
</head><body><span>v${version}</span></body></html>`

function fakeFetch(routes) {
  const calls = []
  const impl = async (url) => {
    calls.push(url)
    const route = routes[url] ?? { status: 404, body: 'Not Found' }
    const current = Array.isArray(route) ? route[Math.min(calls.filter((u) => u === url).length - 1, route.length - 1)] : route
    return new Response(current.body ?? '', {
      status: current.status,
      headers: { 'content-type': current.type ?? 'text/html; charset=utf-8' },
    })
  }
  impl.calls = calls
  return impl
}

const healthySite = (version = '1.2.0') => ({
  [BASE]: { status: 200, body: page(version) },
  'https://example.github.io/calidad-software/_next/static/css/app.css': { status: 200, type: 'text/css' },
  'https://example.github.io/calidad-software/_next/static/chunks/main.js': { status: 200, type: 'text/javascript' },
})

const failed = (results) => results.filter((r) => !r.ok).map((r) => r.name)

describe('parsePage', () => {
  it('extrae título, versión, commit y recursos estáticos sin duplicados', () => {
    expect(parsePage(page())).toEqual({
      title: 'ResilientOps | Simulador de Continuidad Operativa ante Desastres',
      version: '1.2.0',
      commit: 'abc1234',
      assets: [
        '/calidad-software/_next/static/css/app.css',
        '/calidad-software/_next/static/chunks/main.js',
      ],
    })
  })

  it('devuelve null cuando faltan el título o los metadatos', () => {
    expect(parsePage('<html></html>')).toEqual({ title: null, version: null, commit: null, assets: [] })
  })
})

describe('runChecks', () => {
  it('aprueba un despliegue sano de la versión esperada', async () => {
    const results = await runChecks({ baseUrl: BASE, expectedVersion: '1.2.0', fetchImpl: fakeFetch(healthySite()) })

    expect(failed(results)).toEqual([])
    expect(results).toHaveLength(8)
  })

  it('acepta la URL sin barra final', async () => {
    const results = await runChecks({ baseUrl: BASE.slice(0, -1), fetchImpl: fakeFetch(healthySite()) })

    expect(failed(results)).toEqual([])
  })

  it('reintenta mientras se sirve la versión anterior', async () => {
    const site = healthySite()
    site[BASE] = [{ status: 200, body: page('1.1.0') }, { status: 200, body: page('1.2.0') }]
    const fetchImpl = fakeFetch(site)

    const results = await runChecks({ baseUrl: BASE, expectedVersion: '1.2.0', fetchImpl, delayMs: 0 })

    expect(failed(results)).toEqual([])
    expect(fetchImpl.calls.filter((u) => u === BASE)).toHaveLength(2)
  })

  it('falla si tras los reintentos sigue la versión anterior', async () => {
    const site = healthySite('1.1.0')

    const results = await runChecks({ baseUrl: BASE, expectedVersion: '1.2.0', fetchImpl: fakeFetch(site), attempts: 2, delayMs: 0 })

    expect(failed(results)).toEqual([
      'La versión desplegada coincide con el release',
      'La interfaz muestra la versión del release',
    ])
  })

  it('falla si la página principal no está disponible', async () => {
    const site = healthySite()
    site[BASE] = { status: 503, body: 'Service Unavailable' }

    const results = await runChecks({ baseUrl: BASE, fetchImpl: fakeFetch(site), attempts: 1 })

    expect(failed(results)).toContain('La página principal responde con HTTP 200')
  })

  it('reporta los recursos estáticos que no cargan (p. ej. basePath incorrecto)', async () => {
    const site = healthySite()
    delete site['https://example.github.io/calidad-software/_next/static/chunks/main.js']

    const results = await runChecks({ baseUrl: BASE, fetchImpl: fakeFetch(site) })
    const assets = results.find((r) => r.name === 'Los recursos estáticos (JS/CSS) cargan')

    expect(assets.ok).toBe(false)
    expect(assets.detail).toContain('main.js (HTTP 404)')
  })

  it('falla si una ruta inexistente no devuelve 404', async () => {
    const site = healthySite()
    site[`${BASE}ruta-que-no-existe`] = { status: 200, body: page() }

    const results = await runChecks({ baseUrl: BASE, fetchImpl: fakeFetch(site) })

    expect(failed(results)).toEqual(['Una ruta inexistente devuelve HTTP 404'])
  })

  it('falla si el título no corresponde a ResilientOps', async () => {
    const site = healthySite()
    site[BASE] = { status: 200, body: page().replace('ResilientOps |', 'Otra app |') }

    const results = await runChecks({ baseUrl: BASE, fetchImpl: fakeFetch(site) })

    expect(failed(results)).toEqual(['El título identifica a ResilientOps'])
  })

  it('reporta el error de red cuando el sitio no responde', async () => {
    const fetchImpl = async () => {
      throw new Error('getaddrinfo ENOTFOUND')
    }

    const results = await runChecks({ baseUrl: BASE, fetchImpl, attempts: 1 })

    expect(results).toEqual([{ name: 'La página principal responde', ok: false, detail: 'Error: getaddrinfo ENOTFOUND' }])
  })
})

describe('formatSummary', () => {
  it('genera una tabla Markdown con el estado de cada verificación', () => {
    const summary = formatSummary(BASE, [
      { name: 'A', ok: true, detail: 'bien' },
      { name: 'B', ok: false, detail: 'mal' },
    ])

    expect(summary).toContain(`URL: ${BASE}`)
    expect(summary).toContain('| ✅ | A | bien |')
    expect(summary).toContain('| ❌ | B | mal |')
  })
})
