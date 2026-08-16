# 🚀 SIGER-FMC - Sistema Integral de Gestión y Reparación

Sistema web especializado para el taller de servicio técnico **Franyer Mobile Center, S.R.L.**

---

## 🛠️ Stack Tecnológico

- **Backend:** Node.js, Express, Microsoft SQL Server (`mssql` Connection Pool), JWT, BcryptJS.
- **Frontend:** React (Vite), React Router v6, Tailwind CSS (Estilo Supabase Dark/Light), Lucide React, Axios.
- **Base de Datos:** Microsoft SQL Server (`SIGER_FMC_DB`).

---

## 📂 Estructura del Proyecto

```
SIGER-FMC/
├── backend/                  # Servidor API Express + SQL Server
│   ├── src/
│   │   ├── config/           # db.js (SQL Server connection pool)
│   │   ├── controllers/      # auth.controller.js
│   │   ├── middlewares/      # authMiddleware.js (JWT)
│   │   ├── routes/           # auth.routes.js
│   │   ├── db/               # init.sql (DDL + Seeds para SQL Server)
│   │   └── app.js            # Configuración Express, CORS y middlewares
│   ├── server.js             # Entrada del servidor backend
│   ├── package.json
│   └── .env                  # Variables de entorno del backend
│
├── frontend/                 # Aplicación Cliente React + Vite
│   ├── src/
│   │   ├── components/       # ProtectedRoute, ThemeToggle
│   │   ├── context/          # AuthContext (Sesión), ThemeContext (Dark/Light)
│   │   ├── pages/
│   │   │   ├── Login/        # LoginPage (Diseño Supabase, alertas, recordar)
│   │   │   └── Dashboard/    # DashboardPage (Vista protegida, perfil, roles)
│   │   ├── services/         # api.js (Axios con interceptor JWT)
│   │   ├── App.jsx           # Rutas y providers
│   │   ├── main.jsx          # Montaje
│   │   └── index.css         # Tailwind y tipografía Inter/Outfit
│   ├── package.json
│   ├── tailwind.config.js    # Paleta Supabase (Grafito, Rose/Red acento)
│   ├── vite.config.js        # Proxy a /api
│   └── .env                  # Variables de entorno frontend
│
└── docs/
    ├── DATABASE.md           # Estructura y diccionario de base de datos
    └── GUIDELINES.md         # Guía de arquitectura y diseño UI/UX
```

---

## ⚙️ Pasos de Instalación y Ejecución

### 1. Inicialización de la Base de Datos (SQL Server)
Ejecuta el script [backend/src/db/init.sql](file:///c:/Users/pc/Desktop/SIGER-FMC/backend/src/db/init.sql) en SQL Server Management Studio (SSMS) o Azure Data Studio para crear la base de datos `SIGER_FMC_DB`, tablas, roles y usuario inicial.

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
