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

- [Node.js](https://nodejs.org) v20 o superior
- npm v10+ (incluido con Node.js)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/ariana-lopez/calidad-software.git
cd calidad-software

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo con hot reload |
| `npm run build` | Genera el bundle de producción optimizado |
| `npm run start` | Sirve el build de producción (requiere `npm run build` antes) |

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
   npm run build
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
| Build command | `npm run build` |
| Publish directory | `.next` |
| Node version | `20` |

---

## 🐳 Deploy con Docker

### Dockerfile

Crear un archivo `Dockerfile` en la raíz del proyecto con el siguiente contenido:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

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

# 2. Instalar dependencias y compilar
npm install
npm run build

# 3. Instalar PM2 para mantener el proceso vivo
npm install -g pm2

# 4. Iniciar con PM2
pm2 start npm --name "resilientops" -- start

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
│   │   └── SimulationContext.tsx # Estado global (React Context)
│   ├── data/
│   │   └── mockData.ts           # Datos iniciales del escenario Lima/Arequipa
│   ├── lib/
│   │   └── simulationEngine.ts   # Motor de simulación de desastres
│   └── types/
│       └── resilient.ts          # Tipos TypeScript
├── package.json
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
