# Sistema de Gestión de Inventario — Jorge Motors

Plataforma web para controlar el inventario de repuestos de Jorge Motors (Pueblo Nuevo, Chincha):
entradas y salidas en tiempo real, permisos por rol, alertas automáticas al proveedor y reportes
(inventario valorizado y kardex).

| Capa | Tecnología | Carpeta |
|---|---|---|
| Presentación (SPA) | React + Vite + TypeScript | `frontend/` |
| Negocio (API REST `/api/v1`) | Node.js + Express + TypeScript, JWT, Zod | `backend/src/` |
| Datos | SQLite vía Prisma ORM (PostgreSQL cambiando el `provider`) | `backend/prisma/` |

## Puesta en marcha

Requisitos: Node.js 20 o superior.

```bash
cd backend
npm install
npm run db:setup     # crea jorge_motors.db, aplica reglas de integridad y carga datos de prueba
npm run dev          # API en http://localhost:3000/api/v1
```

En otra terminal:

```bash
cd frontend
npm install
npm run dev          # aplicación en http://localhost:5173
```

En Windows también puedes hacer doble clic en `iniciar.bat` (después de instalar y crear la base).

Para volver a los datos de prueba desde cero, borra `backend/prisma/jorge_motors.db` y ejecuta
`npm run db:setup` otra vez.

### Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@jorgemotors.pe | Admin123! |
| Mecánico | ltorres@jorgemotors.pe | Mecanico123! |

## Modelo de datos

Siete tablas, según el modelo del Figma: `usuario`, `categoria`, `proveedor`, `producto`, `stock`,
`movimiento` y `alerta_stock`. Se agregó `proveedor.canalPreferido` (`CORREO`, `SMS` o `WHATSAPP`)
para el envío de alertas.

### Ver la base de datos

- El archivo de la base es `backend/prisma/jorge_motors.db` (SQLite) y ya viene con los datos de prueba.
- Para verla y editarla en el navegador: `cd backend` y `npm run db:studio` (Prisma Studio, http://localhost:5555).
- También se puede abrir con [DB Browser for SQLite](https://sqlitebrowser.org/) o la extensión SQLite de VS Code.
- `backend/prisma/esquema.sql` tiene las sentencias `CREATE TABLE` generadas desde `schema.prisma`.

`prisma/integridad.ts` crea en SQLite la "segunda barrera" que la base hace cumplir aunque el código
falle: stock nunca negativo, aritmética del movimiento, movimientos inmutables, transición de alertas
`PENDIENTE → ENVIADA → ATENDIDA`, una sola alerta abierta por producto, roles válidos y dato de contacto
obligatorio según el canal.

## Patrones de diseño en el código

| Patrón | Dónde |
|---|---|
| Singleton | `backend/src/db/prisma.ts`: una sola instancia de `PrismaClient` |
| Facade | `backend/src/modules/inventario/inventario.facade.ts`: `registrarSalida()` / `registrarEntrada()` en una transacción con descuento condicional |
| Observer | `backend/src/events/eventos.ts` + `modules/notificaciones/notificador-stock.ts`: Inventario publica `STOCK_ACTUALIZADO` después del commit y Notificaciones crea la alerta |
| Strategy | `modules/notificaciones/canales.ts`: `CorreoStrategy`, `SmsStrategy`, `WhatsAppStrategy` |
| State | `modules/notificaciones/estados.ts`: `Pendiente`, `Enviada`, `Atendida` |
| Chain of Responsibility | `backend/src/middlewares/cadena.ts`: `verificarJWT → permitirRol → validar(zod) → controlador → manejarErrores` |

Los envíos de alertas se registran en la consola de la API: no hay un servidor de correo, SMS o WhatsApp
conectado. Para enviar de verdad basta con implementar cada estrategia con su servicio.

## Endpoints principales

- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `GET /api/v1/health`
- `GET|POST|PUT|DELETE /api/v1/productos`, `/categorias`, `/proveedores`; `GET|POST|PUT /api/v1/usuarios`
- `POST /api/v1/movimientos/entrada` (administrador), `POST /api/v1/movimientos/salida`, `GET /api/v1/movimientos`
- `GET /api/v1/alertas`, `PATCH /api/v1/alertas/:id/enviar`, `PATCH /api/v1/alertas/:id/atender`
- `GET /api/v1/reportes/resumen`, `/reportes/inventario`, `/reportes/kardex/:productoId?desde=&hasta=`
