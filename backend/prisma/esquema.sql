-- CreateTable
CREATE TABLE "categoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT
);

-- CreateTable
CREATE TABLE "proveedor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "contacto" TEXT,
    "canalPreferido" TEXT NOT NULL DEFAULT 'CORREO'
);

-- CreateTable
CREATE TABLE "producto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "ubicacion" TEXT,
    "precioUnitario" REAL NOT NULL,
    "stockMinimo" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "proveedorId" INTEGER,
    CONSTRAINT "producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "producto_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productoId" INTEGER NOT NULL,
    "cantidadActual" INTEGER NOT NULL DEFAULT 0,
    "ultimaActualizacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movimiento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productoId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stockAnterior" INTEGER NOT NULL,
    "stockResultante" INTEGER NOT NULL,
    "costoUnitario" REAL,
    "documento" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimiento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "movimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alerta_stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productoId" INTEGER NOT NULL,
    "proveedorId" INTEGER,
    "stockActual" INTEGER NOT NULL,
    "stockMinimo" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "mensaje" TEXT,
    "fechaGeneracion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEnvio" DATETIME,
    CONSTRAINT "alerta_stock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alerta_stock_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nombre_key" ON "categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "producto_codigo_key" ON "producto"("codigo");

-- CreateIndex
CREATE INDEX "producto_nombre_idx" ON "producto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "stock_productoId_key" ON "stock"("productoId");

-- CreateIndex
CREATE INDEX "movimiento_productoId_fecha_idx" ON "movimiento"("productoId", "fecha");

-- CreateIndex
CREATE INDEX "movimiento_fecha_idx" ON "movimiento"("fecha");

-- CreateIndex
CREATE INDEX "alerta_stock_estado_idx" ON "alerta_stock"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

