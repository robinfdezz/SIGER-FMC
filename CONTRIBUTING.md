# Guía de Contribución y Configuración Local - SIGER-FMC

Bienvenido al repositorio de **SIGER-FMC** (Sistema Integral de Gestión y Reparación para Franyer Mobile Center, S.R.L.). Este documento detalla los requisitos, pasos de instalación local y estándares de desarrollo para colaboradores.

---

## 1. Requisitos Previos

Asegúrate de tener instaladas las siguientes herramientas en tu entorno local:

- **Node.js:** Versión `18.x` o `20.x` LTS (incluye `npm`).
- **PostgreSQL:** Versión `15.x` o superior (local o instancia administrada en Supabase / Neon / Render).
- **Git:** Para el control de versiones.
- **Cliente de Base de Datos:** pgAdmin 4, DBeaver, Azure Data Studio o CLI `psql`.

---

## 2. Paso a Paso de Instalación

### 2.1 Clonar el Repositorio y Seleccionar Rama

```bash
# 1. Clonar el repositorio
git clone https://github.com/robinfdezz/SIGER-FMC.git
cd SIGER-FMC

# 2. Cambiar a la rama activa de desarrollo
git checkout develop
```

---

### 2.2 Inicializar la Base de Datos (PostgreSQL)

1. Crea la base de datos `siger_fmc_db` en tu servidor PostgreSQL:
   ```sql
   CREATE DATABASE siger_fmc_db;
   ```
2. Ejecuta el script oficial de inicialización [backend/src/db/init.sql](file:///c:/Users/pc/Desktop/SIGER-FMC/backend/src/db/init.sql) para crear las 11 tablas, índices y datos semilla iniciales.
3. Asegúrate de que el usuario de base de datos posea permisos completos (`GRANT ALL`) sobre las tablas y secuencias del esquema `public`.

---

### 2.3 Configuración del Backend

```bash
# 1. Entrar a la carpeta del backend
cd backend

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno desde la plantilla
copy .env.example .env    # En Windows
# cp .env.example .env    # En Linux / macOS
```

Edita el archivo `backend/.env` con tus credenciales locales:
```env
PORT=5000
NODE_ENV=development

DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_contraseña_postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=siger_fmc_db

JWT_SECRET=tu_clave_secreta_jwt_para_desarrollo
JWT_EXPIRES_IN=24h

CLIENT_URL=http://localhost:5173
```

---

### 2.4 Configuración del Frontend

```bash
# 1. Entrar a la carpeta del frontend
cd ../frontend

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
copy .env.example .env    # En Windows
# cp .env.example .env    # En Linux / macOS
```

---

### 2.5 Ejecución de Servidores en Desarrollo

Abre dos terminales independientes para ejecutar los servidores:

#### Terminal 1 - Backend API:
```bash
cd backend
npm run dev
# Servidor disponible en: http://localhost:5000
# Health Check: http://localhost:5000/api/health
```

#### Terminal 2 - Frontend Web (Vite):
```bash
cd frontend
npm run dev
# Aplicación web disponible en: http://localhost:5173
```

#### Credenciales de Prueba Iniciales (Semilla):
- **Usuario:** `superadmin`
- **Contraseña:** `admin123`

---

## 3. Estándares de Código y Buenas Prácticas

### 3.1 Nomenclatura y Convenciones
- **Base de Datos (PostgreSQL):** Tablas y columnas en `snake_case` minúsculas (ej. `datos_trabajadores`, `codigo_ticket`).
- **JavaScript / Node.js:** Variables, funciones y métodos en `camelCase` (ej. `generateToken`, `authMiddleware`).
- **Componentes React:** Archivos y componentes en `PascalCase` (ej. `DashboardLayout.jsx`, `Navbar.jsx`).
- **Consultas SQL en Backend:** Parámetros indexados `$1, $2...` y lectura vía `result.rows[0]`.

### 3.2 Principio DRY (Don't Repeat Yourself)
- Si un componente, botón, modal o función de utilidad se repite **2 o más veces**, debe extraerse como un componente reutilizable en `frontend/src/components/` o helper en `frontend/src/services/`.
- No dupliques llamadas de red ni endpoints; utiliza la instancia central de Axios configurada en [frontend/src/services/api.js](file:///c:/Users/pc/Desktop/SIGER-FMC/frontend/src/services/api.js).

### 3.3 UI / UX y Diseño
- Toda nueva interfaz debe seguir estrictamente las directrices de [docs/GUIDELINES.md](file:///c:/Users/pc/Desktop/SIGER-FMC/docs/GUIDELINES.md).
- Soporte nativo para tema Claro (predeterminado) y Oscuro (grafito Supabase).
- Uso exclusivo de `MorphIcons` y `lucide-react` para iconografía consistente.

---

## 4. Flujo de Trabajo en Git

Este proyecto maneja dos ramas principales:
- **`main`:** Rama de producción estable.
- **`develop`:** Rama base de integración activa para nuevas características.

### 4.1 Creación de Ramas

Crea ramas de trabajo a partir de `develop` usando el prefijo correspondiente:
- **Nuevas características:** `feature/nombre-de-la-funcionalidad` (ej. `feature/recepcion-tickets`)
- **Corrección de errores:** `fix/descripcion-del-bug` (ej. `fix/login-jwt-validation`)
- **Refactorizaciones:** `refactor/modulo-o-componente` (ej. `refactor/sidebar-navigation`)

```bash
git checkout develop
git pull origin develop
git checkout -b feature/recepcion-tickets
```

### 4.2 Formato de Mensajes de Commit (Conventional Commits)

Usa mensajes claros, directos y en español o inglés siguiendo el estándar:

- `feat:` Nueva funcionalidad para el usuario.
- `fix:` Corrección de un error o bug.
- `refactor:` Cambio en el código que no corrige un bug ni añade una funcionalidad.
- `docs:` Cambios exclusivos en la documentación.
- `style:` Cambios visuales, espaciados o formato sin alterar lógica.
- `chore:` Tareas de mantenimiento, actualización de dependencias o configuración.

```bash
git commit -m "feat: implementar formulario de apertura de tickets con validaciones"
```
