# 🚀 SIGER-FMC - Sistema Integral de Gestión y Reparación

Sistema web especializado para el taller de servicio técnico **Franyer Mobile Center, S.R.L.**

---

## 🛠️ Stack Tecnológico

- **Backend:** Node.js, Express, PostgreSQL (`pg` Connection Pool), JWT, BcryptJS, Cloudinary SDK, Multer (Memory Storage).
- **Frontend:** React (Vite), React Router v6, Tailwind CSS (Estilo Supabase Dark/Light), Lucide React, Morphicons (Iconos animados), Sileo (Toaster), Axios.
- **Base de Datos:** PostgreSQL (`siger_fmc_db`).
- **Gestión Multimedia / Cloudinary:** Carga optimizada en buffer, streaming WebP (`siger-fmc/personal-fmc` y `siger-fmc/evidencias-tickets`) y eliminación automática de recursos huérfanos.
- **Flujo de Ramas Git:**
  - `main`: Rama principal / producción estable.
  - `develop`: Rama de integración activa para desarrollo.

---

## 📂 Estructura del Proyecto

```
SIGER-FMC/
├── backend/                  # Servidor API Express + PostgreSQL
│   ├── src/
│   │   ├── config/           # db.js (PostgreSQL pool), cloudinary.js (SDK & Upload)
│   │   ├── controllers/      # auth, workers, clients, etc.
│   │   ├── middlewares/      # authMiddleware.js, roleMiddleware.js, upload.js (Multer)
│   │   ├── routes/           # auth.routes.js, workers.routes.js, clients.routes.js, etc.
│   │   ├── db/               # init.sql (DDL + Seeds para PostgreSQL)
│   │   └── app.js            # Configuración Express, CORS y middlewares
│   ├── server.js             # Entrada del servidor backend
│   ├── package.json
│   ├── .env                  # Variables de entorno privadas (ignorado por Git)
│   └── .env.example          # Plantilla pública de variables requeridas
│
├── frontend/                 # Aplicación Cliente React + Vite
│   ├── src/
│   │   ├── components/       # Layouts, Modales (WorkerModal, ClientModal), Select, Dropzones
│   │   ├── context/          # AuthContext (Sesión), ThemeContext (Dark/Light)
│   │   ├── pages/            # LoginPage, DashboardPage, WorkersPage, ClientsPage, etc.
│   │   ├── services/         # api.js (Axios), workers.service.js, clients.service.js
│   │   ├── App.jsx           # Rutas y providers
│   │   ├── main.jsx          # Montaje
│   │   └── index.css         # Tailwind y tipografía Sora/Outfit/Inter
│   ├── package.json
│   ├── tailwind.config.js    # Paleta corporativa (Grafito, Rose/Red acento)
│   ├── vite.config.js        # Proxy a /api
│   └── .env                  # Variables de entorno frontend
│
└── docs/
    ├── DOCUMENTACION_GENERAL.md # Índice maestro y mapa documental del proyecto
    ├── ARCHITECTURE.md          # Arquitectura global, capas y pipeline de imágenes
    ├── API.md                   # Catálogo completo de endpoints REST y ejemplos
    ├── DATABASE.md              # Diccionario de datos y modelo relacional PostgreSQL
    ├── GUIDELINES.md            # Guía de estándares de desarrollo y UI/UX
    ├── PROJECT_CONTEXT.md       # Visión, roles y reglas de negocio
    ├── AI_RULES.md              # Reglas y restricciones de desarrollo para agentes AI
    └── CHANGELOG.md             # Registro cronológico de cambios y versiones
```

---

## ⚙️ Pasos de Instalación y Ejecución

### 1. Inicialización de la Base de Datos (PostgreSQL)
Ejecuta el script [backend/src/db/init.sql](file:///c:/Users/pc/Desktop/SIGER-FMC/backend/src/db/init.sql) en pgAdmin, DBeaver o `psql` para crear las tablas, roles, usuario inicial y estados en la base de datos `siger_fmc_db`.

### 2. Ejecución del Backend
```bash
cd backend
npm install   # Si no están instaladas
npm run dev   # Inicia con nodemon en http://localhost:5000
```

### 3. Ejecución del Frontend
```bash
cd frontend
npm install   # Si no están instaladas
npm run dev   # Inicia Vite en http://localhost:5173
```

---

## 🔐 Credenciales de Acceso por Defecto (Semilla)

| Campo | Valor |
| :--- | :--- |
| **Usuario** | `admin` (Columna `usuario` en `Datos_Trabajadores`) |
| **Contraseña** | `password` (o la configurada en `init.sql`) |
| **Rol** | `SuperAdmin` |
