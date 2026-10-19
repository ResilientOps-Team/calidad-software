# 🛡️ ResilientOps

**Simulador de Continuidad Operativa ante Desastres**

ResilientOps es una aplicación web interactiva que permite modelar infraestructuras digitales, simular fallos y evaluar la disponibilidad de los servicios, la recuperabilidad de los datos y la resiliencia de la infraestructura frente a desastres.

> Proyecto desarrollado para el curso de **Calidad de Software** — Universidad Nacional de Ingeniería (UNI)

---

## 📸 Vista previa

![Dashboard ResilientOps](https://raw.githubusercontent.com/ariana-lopez/calidad-software/main/public/preview.png)

---

## ✨ Funcionalidades

- **Dashboard de continuidad** — KPIs en tiempo real: servicios disponibles, SPOF, RTO, RPO, pérdida potencial de datos
- **Modelado de infraestructura** — Canvas interactivo para configurar servidores, bases de datos, servicios y centros de datos
- **Gestión de datos y respaldos** — Registro de datasets críticos y copias de respaldo con su disponibilidad post-desastre
- **Motor de simulación** — Ejecución de escenarios de desastre: caída de datacenter, ataque ransomware, fallo de red, etc.
- **Análisis de resultados** — Comparación antes/después, hallazgos accionables, puntos únicos de fallo identificados
- **Historial de simulaciones** — Log completo de todas las pruebas realizadas con carga de resultados anteriores
- **Informe técnico DRP** — Generación de Plan de Recuperación ante Desastres en formato imprimible

---

## 🏗️ Stack Tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| [Next.js](https://nextjs.org) | 16.x | Framework React (App Router) |
| [React](https://react.dev) | 19.x | UI Library |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Estilos |
| [Lucide React](https://lucide.dev) | 1.x | Iconografía |
| TypeScript | 5.x | Tipado estático |

> **Sin backend**: toda la lógica corre en el cliente. Los datos se persisten en `localStorage` del navegador.

---

## 🚀 Correr en local

### Prerrequisitos

- [Node.js](https://nodejs.org) v22.12 o superior (requerido por Vitest; Next.js exige ≥20.9)
- [pnpm](https://pnpm.io) 12.14.0 — el proyecto usa `pnpm-lock.yaml`

Si no tienes pnpm instalado:

```bash
npm install -g pnpm@12.14.0
# o, sin instalarlo globalmente: npx pnpm@12.14.0 <comando>
```

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/ariana-lopez/calidad-software.git
cd calidad-software

# 2. Instalar dependencias (respetando el lockfile)
pnpm install --frozen-lockfile

# 3. Iniciar servidor de desarrollo
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Inicia el servidor de desarrollo con hot reload |
| `pnpm build` | Genera el bundle de producción optimizado |
| `pnpm start` | Sirve el build de producción (requiere `pnpm build` antes) |
| `pnpm test` | Ejecuta las pruebas automatizadas con Vitest (`vitest run`) |
| `pnpm lint` | Análisis estático con ESLint (`eslint-config-next`); falla con errores o con más de 35 warnings |
| `pnpm exec tsc --noEmit` | Verifica los tipos de TypeScript sin generar archivos |

> `pnpm-workspace.yaml` deniega el script de instalación de `unrs-resolver` (dependencia de `eslint-config-next`). Ese script solo comprueba que el binario nativo opcional esté presente, y pnpm ya lo instala por plataforma.

---

## ✅ Integración continua

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) se ejecuta en cada `push` y `pull_request` sobre Ubuntu con Node.js 22 y pnpm 12.14.0. Cualquier paso que falle detiene el job y lo marca en rojo, y el job tiene un límite de 15 minutos.

| # | Paso | Comando | Detecta |
|---|---|---|---|
| 1 | Instalación | `pnpm install --frozen-lockfile` | `package.json` desincronizado de `pnpm-lock.yaml` |
| 2 | Tipos | `pnpm exec tsc --noEmit` | Errores de TypeScript (`strict`) |
| 3 | Análisis estático | `pnpm lint` | Errores de ESLint y warnings por encima del umbral |
| 4 | Pruebas | `pnpm test` | Regresiones en el motor de simulación y en la restauración desde `localStorage` |
| 5 | Compilación | `pnpm run build` | Fallos de compilación de Next.js |
| 6 | Artefactos | `test -s .next/BUILD_ID …` | Build sin `BUILD_ID` o sin la página `/` prerenderizada |
| 7 | Prueba de humo | `pnpm start` + `curl` | El servidor de producción no responde o no sirve ResilientOps |

Para reproducir el pipeline en local, ejecuta los pasos en ese orden.

**Pruebas automatizadas:**
- `src/lib/simulationEngine.test.ts`: motor de simulación en entorno Node. Cubre el escenario sin fallos, la caída del DC Lima, el corte del enlace troncal, el fallo del SAN Lima, la inmutabilidad de las entradas y casos límite.
- `src/context/SimulationContext.test.tsx`: en jsdom, renderiza en servidor, hidrata y comprueba que no hay errores de hidratación y que los datos de `localStorage` se restauran (o se ignoran si están corruptos).

**Evidencia:** en [`docs/evidencias/`](docs/evidencias/) están los logs y las capturas del pipeline en local, la inyección de un fallo por etapa y las ejecuciones en GitHub Actions.

---

## ☁️ Deploy en Vercel (Recomendado)

Vercel es la plataforma oficial de Next.js — el deploy es automático con 0 configuración.

### Opción A — Deploy con un click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ariana-lopez/calidad-software)

### Opción B — Deploy manual

1. Crear cuenta en [vercel.com](https://vercel.com)
2. Instalar la CLI de Vercel:
   ```bash
   npm install -g vercel
   ```
3. Dentro del directorio del proyecto:
   ```bash
   vercel
   ```
4. Seguir el wizard interactivo — Vercel detecta Next.js automáticamente.
5. Para producción:
   ```bash
   vercel --prod
   ```

> **Variables de entorno**: Este proyecto no requiere ninguna variable de entorno. No necesitas configurar nada adicional en el dashboard de Vercel.

---

## 🌐 Deploy en Netlify

1. Crear cuenta en [netlify.com](https://netlify.com)
2. Generar el build estático:
   ```bash
   pnpm build
   ```
3. Instalar la CLI de Netlify:
   ```bash
   npm install -g netlify-cli
   ```
4. Hacer deploy:
   ```bash
   netlify deploy --dir=.next --prod
   ```

> ⚠️ **Nota**: Para Netlify con Next.js (App Router + SSR) se recomienda usar el adaptador oficial [`@netlify/plugin-nextjs`](https://github.com/netlify/netlify-plugin-nextjs).

Alternativa: conectar el repositorio de GitHub directamente desde el dashboard de Netlify con las siguientes configuraciones:

| Campo | Valor |
|---|---|
| Build command | `pnpm build` |
| Publish directory | `.next` |
| Node version | `22` |

---

## 🐳 Deploy con Docker

### Dockerfile

Crear un archivo `Dockerfile` en la raíz del proyecto con el siguiente contenido:

```dockerfile
FROM node:22-alpine AS base
RUN npm install -g pnpm@12.14.0

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

> Para que el standalone output funcione, añadir `output: 'standalone'` en `next.config.ts`.

### Comandos Docker

```bash
# Construir la imagen
docker build -t resilientops .

# Correr el contenedor
docker run -p 3000:3000 resilientops

# Con Docker Compose
docker compose up --build
```

---

## 🖥️ Deploy en servidor propio (VPS/Ubuntu)

```bash
# 1. Clonar en el servidor
git clone https://github.com/ariana-lopez/calidad-software.git /var/www/resilientops
cd /var/www/resilientops

# 2. Instalar pnpm, dependencias y compilar (requiere Node.js 22.12+)
npm install -g pnpm@12.14.0
pnpm install --frozen-lockfile
pnpm build

# 3. Instalar PM2 para mantener el proceso vivo
npm install -g pm2

# 4. Iniciar con PM2
pm2 start pnpm --name "resilientops" -- start

# 5. Guardar configuración de PM2 para reinicios del sistema
pm2 save
pm2 startup
```

**Configuración Nginx** (proxy inverso):
```nginx
server {
    listen 80;
    server_name tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📁 Estructura del Proyecto

```
calidad-software/
├── src/
│   ├── app/
│   │   ├── globals.css           # Estilos globales (Tailwind)
│   │   ├── layout.tsx            # Layout raíz + metadata SEO
│   │   └── page.tsx              # Punto de entrada + routing de secciones
│   ├── components/
│   │   ├── dashboard/            # Vista de métricas e KPIs
│   │   ├── data/                 # Gestión de datasets y backups
│   │   ├── history/              # Historial de simulaciones
│   │   ├── infrastructure/       # Canvas interactivo de infraestructura
│   │   ├── layout/               # Sidebar, Header y modales
│   │   ├── report/               # Informe técnico DRP
│   │   ├── results/              # Análisis de resultados post-simulación
│   │   └── simulations/          # Wizard de configuración de escenarios
│   ├── context/
│   │   ├── SimulationContext.tsx      # Estado global (React Context)
│   │   └── SimulationContext.test.tsx # Prueba de hidratación (jsdom)
│   ├── data/
│   │   └── mockData.ts           # Datos iniciales del escenario Lima/Arequipa
│   ├── lib/
│   │   ├── simulationEngine.ts       # Motor de simulación de desastres
│   │   └── simulationEngine.test.ts  # Pruebas unitarias (Vitest)
│   └── types/
│       └── resilient.ts          # Tipos TypeScript
├── .github/
│   └── workflows/
│       └── ci.yml                # Pipeline de CI (tipos, lint, pruebas, build)
├── docs/
│   └── evidencias/               # Logs y capturas de validación del pipeline
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── next.config.ts
├── tsconfig.json
└── README.md
```

---

## 🧪 Escenario de demostración

La aplicación incluye un escenario preconfigurado con la infraestructura de una empresa peruana con dos centros de datos:

- **DC Lima** (Principal): Servidor App 01, Servidor DB Primario, Firewall Principal, Load Balancer
- **DC Arequipa** (DR/Secundario): Servidor DB Replica, Servidor App Backup, Enlace Satelital

Se pueden simular 5 tipos de desastres:
1. 🏢 Caída de Datacenter (Lima o Arequipa)
2. 🦠 Ataque Ransomware
3. 🌐 Fallo de Conectividad de Red
4. 💾 Corrupción de Base de Datos
5. ⚡ Corte de Energía

---

## 👩‍💻 Autora

**Ariana López** — ariana.lopez.j@uni.pe  
Universidad Nacional de Ingeniería — Facultad de Ingeniería Industrial y de Sistemas  
Curso: Calidad de Software

---

## 📄 Licencia

MIT License — libre para uso académico y comercial.
