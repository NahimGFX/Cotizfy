# Cotizfy

Cotizfy es una aplicación de escritorio local para Windows que permite administrar proyectos y proveedores, importar matrices de presupuestos de Excel y comparar sus cotizaciones. La aplicación guarda la información en SQLite mediante Prisma y muestra los resultados de comparación y ahorro en tablas e indicadores.

> El repositorio está en desarrollo. La versión del paquete indicada en `package.json` es `1.0.0`; no se encontró una declaración de licencia.

## Capturas de pantalla

Todavía no hay capturas de pantalla versionadas en el repositorio. Se pueden agregar aquí cuando estén disponibles:

| Pantalla | Captura |
| --- | --- |
| Dashboard | Pendiente |
| Comparación de matrices | Pendiente |
| Importación y vista previa | Pendiente |
| Gestión de proyectos y proveedores | Pendiente |

## Características principales

- Crear, consultar, editar y eliminar proyectos. La eliminación solicita confirmación y borra sus partidas, cotizaciones y asociaciones, conservando los proveedores del catálogo.
- Mantener un catálogo de proveedores con opciones para crear, editar y eliminar registros.
- Asociar varios proveedores a un proyecto mediante `ProjectSupplier`.
- Importar libros `.xlsx` y `.xls` desde la primera hoja del archivo.
- Detectar dinámicamente los grupos de precios a partir de encabezados `PRECIO UNITARIO_N` y `PRECIO TOTAL_N`, incluidos sufijos no consecutivos y columnas en distinto orden.
- Revisar una vista previa, asignar grupos a proveedores, asociar proveedores del catálogo o crear y asociar un proveedor durante la importación.
- Validar partidas y precios, e informar sobre columnas incompletas, ITEM repetidos y diferencias entre el total y cantidad × precio unitario.
- Guardar partidas y cotizaciones en SQLite mediante operaciones transaccionales de Prisma.
- Comparar precios unitarios y totales, destacar mínimos y empates y señalar partidas sin cotización.
- Consultar totales cotizados, partidas ganadas, costo estimado comprando cada partida al menor precio disponible y ahorro potencial.
- Ver gráficos de costos por proveedor, partidas ganadas, diferencias por partida y distribución de cotizaciones en la pantalla de comparación.
- Agregar, editar y eliminar partidas y cotizaciones desde el editor de matrices.
- Ver en el Dashboard indicadores de proyectos, proveedores, partidas y ahorros calculados a partir de los datos guardados.
- Cambiar el idioma entre español e inglés y elegir tema claro, oscuro o automático según el sistema operativo.
- Persistir las preferencias de idioma y tema en SQLite, con `localStorage` como apoyo para la carga inicial.

### Consideraciones de datos

- Una cotización vacía no se importa como una oferta de precio cero. Cuando solo falta el precio unitario o el total, la ausencia se conserva en las notas de la cotización y la comparación omite el campo faltante.
- ITEM repetidos en un archivo producen advertencias, pero no se deduplican automáticamente.
- Eliminar un proveedor del catálogo también elimina sus cotizaciones relacionadas, conforme a la regla de cascada de `ItemQuote`.
- Cada grupo de importación debe asignarse a un proveedor distinto. El esquema permite una cotización por combinación de partida y proveedor (`@@unique([itemId, supplierId])`), por lo que no se permiten asignaciones repetidas del mismo proveedor a varios grupos del mismo archivo.
- La comparación usa los datos asociados al proyecto seleccionado. Los totales de proveedores con distinta cobertura se advierten como no directamente comparables.
- El gráfico de tendencias del Dashboard contiene datos de ejemplo estáticos. Los cuatro gráficos de la pantalla Comparar se calculan con los datos del proyecto.
- El indicador de ahorro del Dashboard suma proyectos únicamente cuando comparten moneda; si hay varias monedas muestra `—`.
- No se encontró una funcionalidad de exportación de matrices o informes implementada en el código actual.

## Tecnologías utilizadas

Las dependencias y versiones indicadas proceden de `package.json` (rangos semver):

| Tecnología | Uso | Dependencia declarada |
| --- | --- | --- |
| React 18 | Interfaz de usuario | `react` `^18.3.1`, `react-dom` `^18.3.1` |
| TypeScript | Tipado y compilación | `typescript` `^5.6.3` |
| Vite | Servidor y compilación del renderer | `vite` `^5.4.11`, `@vitejs/plugin-react` `^4.3.4` |
| Electron | Aplicación de escritorio y procesos main/renderer | `electron` `^33.2.1` |
| SQLite | Almacenamiento local | Proveedor `sqlite` de Prisma |
| Prisma ORM | Cliente y modelo relacional | `prisma` `^5.22.0`, `@prisma/client` `^5.22.0` |
| Tailwind CSS | Estilos | `tailwindcss` `^3.4.17`, `postcss`, `autoprefixer` |
| SheetJS | Lectura y pruebas de archivos Excel | `xlsx` `^0.18.5` |
| Recharts | Gráficos del comparador y Dashboard | `recharts` `^2.15.0` |
| i18next | Internacionalización | `i18next` `^24.2.0`, `i18next-browser-languagedetector` `^8.0.2`, `react-i18next` `^15.4.0` |
| Lucide React | Iconos | `lucide-react` `^0.468.0` |
| Electron Builder | Empaquetado e instalador de Windows | `electron-builder` `^25.1.8` |
| tsup | Compilación de main y preload | `tsup` `^8.3.5` |
| Zod | No se utiliza actualmente | No está declarado en `package.json` |

La validación de importaciones y operaciones CRUD está implementada con comprobaciones en TypeScript dentro del proceso principal; no se usa Zod.

## Arquitectura y estructura de carpetas

```text
cotizfy/
├── electron/
│   ├── main/
│   │   ├── index.ts          # Ventana, inicio de SQLite y ciclo de vida de Electron
│   │   ├── db.ts             # Cliente Prisma, ruta de base de datos y migraciones
│   │   ├── excel.ts          # Lectura, detección de grupos y validación Excel
│   │   ├── importer.ts       # Persistencia transaccional de matrices
│   │   ├── matrix.ts         # Operaciones de partidas, cotizaciones y proyectos
│   │   └── ipc/index.ts      # Controladores IPC
│   └── preload/
│       ├── index.ts          # API limitada expuesta al renderer
│       └── types.ts          # Tipos de la API y respuestas IPC
├── prisma/
│   ├── schema.prisma         # Modelos SQLite
│   └── migrations/           # Migraciones versionadas
├── scripts/                  # Pruebas de importación, comparación y CRUD
├── src/
│   ├── components/           # Componentes de layout, proyectos y matrices
│   ├── context/              # Contexto de tema
│   ├── i18n/                 # Configuración y traducciones es/en
│   ├── pages/                # Dashboard, proyectos, proveedores, comparar y ajustes
│   ├── services/api.ts       # Acceso del renderer a la API de preload
│   └── utils/                # Formateo y lógica reutilizable de comparación
├── electron-builder.json     # Empaquetado Windows x64 / NSIS
├── package.json              # Dependencias y comandos npm
├── tailwind.config.js
└── vite.config.ts
```

### Modelo de datos

| Modelo | Responsabilidad y relaciones |
| --- | --- |
| `Project` | Proyecto, moneda, cliente, descripción, proveedores asociados y partidas. |
| `Supplier` | Catálogo de proveedores y sus cotizaciones y asociaciones a proyectos. |
| `ProjectSupplier` | Tabla intermedia muchos a muchos entre `Project` y `Supplier`; almacena el orden de asociación. |
| `BudgetItem` | Partida perteneciente a un proyecto, con ITEM, descripción, cantidad y unidad. |
| `ItemQuote` | Cotización de una partida por un proveedor, con precios unitario y total y notas. Tiene unicidad por `itemId` y `supplierId`. |
| `AppSetting` | Preferencias persistidas como idioma y tema. |

El esquema usa reglas `onDelete: Cascade` en las relaciones de proyectos, partidas y cotizaciones. La operación de borrar un proyecto también elimina explícitamente sus cotizaciones, partidas y asociaciones dentro de una transacción. No elimina los registros `Supplier`.

## Requisitos previos

- Windows de 64 bits para generar el instalador configurado.
- Node.js y npm. Las pruebas usan `node:sqlite`; se recomienda Node.js 22.13 o posterior para ejecutar la suite con la API estable.
- Dependencias nativas compatibles con Electron/Prisma para la plataforma de desarrollo. El empaquetado incluye los recursos de Prisma declarados en `electron-builder.json`.

No se declara un campo `engines` en `package.json`; la versión mínima de Node para compilar la aplicación no está fijada allí.

## Instalación y configuración

Desde la raíz del repositorio:

```bash
npm install
npm run prisma:generate
```

Prisma usa `DATABASE_URL` en `prisma/schema.prisma` para sus comandos de CLI. En PowerShell, para apuntar el CLI a `prisma/dev.db`:

```powershell
$env:DATABASE_URL = "file:./dev.db"
npm run prisma:generate
```

La aplicación Electron calcula su ruta local mediante `electron/main/db.ts`; no necesita un servidor o servicio remoto.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | URL declarada por el datasource Prisma y usada por los comandos Prisma de CLI. La aplicación Electron reemplaza la URL del cliente con la ruta local resuelta por `getDatabasePath()`. |
| `COTIZFY_DATABASE_PATH` | Ruta alternativa de SQLite en modo no empaquetado. Útil para ejecutar instancias o pruebas aisladas; no se aplica a la aplicación empaquetada. |
| `NODE_ENV` | Distingue desarrollo/producción y configura el registro de Prisma. Los scripts de desarrollo lo establecen donde corresponde. |
| `VITE_DEV_SERVER_URL` | URL del renderer Vite que consume Electron en desarrollo; el script `dev:electron` la establece en `http://localhost:5173`. |

No se encontró un archivo `.env.example`. `.env` y `.env.local` están excluidos por `.gitignore`.

## Comandos disponibles

Scripts definidos en `package.json`:

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Arranca Vite y Electron en desarrollo; ejecuta primero `predev` (`npm run build:electron`). |
| `npm run dev:renderer` | Inicia solamente el servidor Vite del renderer en el puerto 5173. |
| `npm run dev:electron` | Espera el servidor Vite e inicia Electron en modo desarrollo. |
| `npm run build` | Ejecuta `build:renderer` y `build:electron`. |
| `npm run build:renderer` | Ejecuta `tsc --noEmit` y `vite build`; escribe el renderer en `dist/`. |
| `npm run build:electron` | Compila main y preload con tsup en `dist-electron/`. |
| `npm run preview:electron` | Compila la aplicación e inicia Electron usando el bundle de producción local. |
| `npm test` | Ejecuta las pruebas Excel/SQLite, comparación y CRUD. |
| `npm run test:excel-import` | Ejecuta parser e integración de importación con SQLite aislado. |
| `npm run test:comparison` | Ejecuta pruebas de la lógica de comparación. |
| `npm run test:matrix-crud` | Prueba operaciones CRUD y eliminación transaccional contra SQLite aislado. |
| `npm run prisma:generate` | Ejecuta `prisma generate`. |
| `npm run prisma:push` | Ejecuta `prisma db push`; no forma parte de la inicialización de producción. |
| `npm run prisma:migrate` | Ejecuta `prisma migrate dev` para desarrollo. |
| `npm run package:win` | Compila y crea el instalador Windows NSIS x64 en `release/`. |
| `npm run package:dir` | Compila y empaqueta la aplicación en un directorio sin instalador. |

## Ejecución en modo desarrollo

```bash
npm run dev
```

Vite sirve el renderer en `http://localhost:5173`. Electron espera a que ese servidor esté disponible antes de abrir la ventana. En modo desarrollo, la base de datos predeterminada es `prisma/dev.db`.

Para iniciar solamente la interfaz web:

```bash
npm run dev:renderer
```

El renderer dispone de una API simulada para algunas operaciones en navegador; la persistencia real de SQLite corresponde a la ejecución con Electron.

## Ejecución de pruebas

```bash
npm test
```

Las pruebas crean bases de datos temporales bajo `work/`, aplican las migraciones y eliminan sus directorios temporales al terminar. Incluyen:

- Lectura `.xlsx` y `.xls`, grupos de precios de 1, 2, 3, 5 y 10 proveedores, columnas reordenadas, sufijos no consecutivos y grupos incompletos.
- Validaciones, asignaciones de proveedores, persistencia, reapertura de conexión, importación transaccional y rollback.
- Comparación con precios decimales, empates, precios faltantes, cobertura desigual y proyectos sin cotizaciones.
- CRUD de partidas y cotizaciones, recálculo de comparación y eliminación de proyectos, comprobando que proveedores del catálogo y datos de otros proyectos permanezcan intactos.

## Compilación y empaquetado

Compilar renderer y procesos Electron:

```bash
npm run build
```

Crear el instalador configurado para Windows x64:

```bash
npm run package:win
```

Electron Builder usa NSIS, permite elegir el directorio de instalación y configura accesos directos para escritorio y menú Inicio. El directorio de salida definido es `release/`.

## Base de datos y migraciones Prisma

- El datasource del esquema es SQLite y su URL Prisma se define mediante `DATABASE_URL`.
- En desarrollo, Electron usa `prisma/dev.db`, salvo que se indique `COTIZFY_DATABASE_PATH`.
- En la versión empaquetada, la base se guarda como `cotizfy.db` bajo el directorio `userData` de Electron.
- Al arrancar, `electron/main/index.ts` espera a `initDatabase()` antes de registrar IPC y cargar la interfaz. `electron/main/db.ts` aplica las migraciones pendientes en orden alfabético y registra su estado en `_prisma_migrations`.
- Las migraciones presentes son `20261102000000_init` y `20261102010000_supplier_many_to_many`.
- `npm run prisma:migrate` y `npm run prisma:push` son scripts del paquete para tareas de desarrollo. La aplicación no usa `db push` al iniciar; el runtime aplica las migraciones versionadas incluidas en `prisma/migrations`.

Para revisar el estado del esquema con Prisma CLI se puede ejecutar, con `DATABASE_URL` definido:

```bash
npx prisma validate --schema prisma/schema.prisma
npx prisma migrate status --schema prisma/schema.prisma
```

## Funcionamiento de la importación Excel

1. En Comparar Matrices se selecciona el proyecto y se abre el selector de `.xlsx` o `.xls`.
2. El proceso principal lee la primera hoja del libro. El archivo tiene un límite de 30 MB.
3. Se requieren los encabezados base `ITEM`, `DESCRIPCION`, `CANTIDAD` y `UNIDAD`. Los grupos se detectan por encabezados `PRECIO UNITARIO_N` o `PRECIO TOTAL_N`, donde `N` es un sufijo numérico positivo. La interfaz actual espera esos nombres de encabezado en español, aunque el idioma de la aplicación sea inglés.
4. Los sufijos se ordenan numéricamente; por ejemplo, `_1`, `_2`, `_4`, `_5` producen cuatro grupos. Una estructura incompleta genera una advertencia y los valores faltantes se tratan como ausentes.
5. Antes de confirmar, cada grupo requiere un proveedor asociado y distinto. El usuario puede asociar uno existente del catálogo o crear uno nuevo desde la vista previa. No se crean proveedores sin una acción explícita.
6. Se muestran errores y advertencias sobre cantidades, precios negativos o no numéricos, ITEM repetidos, campos incompletos y discrepancias del total.
7. Al confirmar, `importExcelRows` valida las asignaciones dentro de una transacción Prisma, crea las partidas y guarda las cotizaciones no vacías. Un fallo revierte la operación.
8. La comparación consulta las cotizaciones persistidas; no altera los precios originales.

## Seguridad y comunicación Electron

- La ventana se crea en `electron/main/index.ts` con `contextIsolation: true`, `nodeIntegration: false` y `webSecurity: true`.
- `electron/preload/index.ts` publica mediante `contextBridge` una API tipada y acotada en `window.api`.
- El renderer usa `src/services/api.ts`; las operaciones de base de datos y los diálogos de archivos se ejecutan en el proceso principal mediante `ipcRenderer.invoke` / `ipcMain.handle`.
- El proceso principal valida los datos de partidas, cotizaciones, asociaciones y filas importadas antes de persistirlos.
- La política CSP de `index.html` restringe orígenes de scripts, conexiones y recursos al origen de la aplicación y al servidor Vite local de desarrollo.

## Estado actual

El repositorio contiene la aplicación React/Electron, las operaciones SQLite/Prisma, las migraciones inicial y muchos-a-muchos, las pantallas de proyectos/proveedores/comparación, el editor de partidas y cotizaciones, importación dinámica de Excel, traducciones y temas. `npm test` y `npm run build` están configurados en `package.json`; las pruebas de integración utilizan bases aisladas.

No se encontró una licencia ni una carpeta de capturas. El gráfico de tendencias del Dashboard todavía muestra datos de muestra; los gráficos del comparador sí utilizan las cotizaciones del proyecto. Tampoco se encontró una función de exportación de matrices o informes.

## Licencia

No se especifica una licencia en el repositorio. Consulta con el titular del proyecto antes de redistribuirlo o reutilizarlo bajo términos de licencia.
