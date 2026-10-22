import type { PrismaClient } from "@prisma/client";

// Segunda barrera: reglas que la propia base de datos hace cumplir aunque el
// backend tenga un error. Prisma no expresa CHECK, triggers ni índices parciales
// en el esquema, así que se crean aquí después de `prisma db push`.
const sentencias = [
  // Facade / RNF-04: el stock nunca queda negativo
  `CREATE TRIGGER IF NOT EXISTS trg_stock_no_negativo_ins BEFORE INSERT ON stock
   WHEN NEW.cantidadActual < 0 BEGIN SELECT RAISE(ABORT, 'El stock no puede ser negativo'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_stock_no_negativo_upd BEFORE UPDATE OF cantidadActual ON stock
   WHEN NEW.cantidadActual < 0 BEGIN SELECT RAISE(ABORT, 'El stock no puede ser negativo'); END`,

  // RNF-04: aritmética del movimiento (stock resultante = anterior ± cantidad)
  `CREATE TRIGGER IF NOT EXISTS trg_movimiento_aritmetica BEFORE INSERT ON movimiento
   WHEN NEW.cantidad <= 0
     OR NEW.tipo NOT IN ('ENTRADA', 'SALIDA')
     OR (NEW.tipo = 'ENTRADA' AND NEW.stockResultante <> NEW.stockAnterior + NEW.cantidad)
     OR (NEW.tipo = 'SALIDA' AND NEW.stockResultante <> NEW.stockAnterior - NEW.cantidad)
   BEGIN SELECT RAISE(ABORT, 'Movimiento con aritmética incorrecta'); END`,

  // RNF-06: el historial es un kardex, no se edita ni se borra
  `CREATE TRIGGER IF NOT EXISTS trg_movimiento_inmutable_upd BEFORE UPDATE ON movimiento
   BEGIN SELECT RAISE(ABORT, 'Los movimientos no se pueden editar'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_movimiento_inmutable_del BEFORE DELETE ON movimiento
   BEGIN SELECT RAISE(ABORT, 'Los movimientos no se pueden eliminar'); END`,

  // State: solo PENDIENTE -> ENVIADA -> ATENDIDA
  `CREATE TRIGGER IF NOT EXISTS trg_alerta_estado_inicial BEFORE INSERT ON alerta_stock
   WHEN NEW.estado <> 'PENDIENTE'
   BEGIN SELECT RAISE(ABORT, 'Una alerta nace en estado PENDIENTE'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_alerta_transicion BEFORE UPDATE OF estado ON alerta_stock
   WHEN NOT (OLD.estado = NEW.estado
     OR (OLD.estado = 'PENDIENTE' AND NEW.estado = 'ENVIADA')
     OR (OLD.estado = 'ENVIADA' AND NEW.estado = 'ATENDIDA'))
   BEGIN SELECT RAISE(ABORT, 'Transición de alerta no permitida'); END`,

  // Observer: como máximo una alerta abierta por producto
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_alerta_abierta_por_producto
   ON alerta_stock (productoId) WHERE estado <> 'ATENDIDA'`,

  // Chain of Responsibility / RF-02: solo dos roles válidos
  `CREATE TRIGGER IF NOT EXISTS trg_usuario_rol_ins BEFORE INSERT ON usuario
   WHEN NEW.rol NOT IN ('ADMINISTRADOR', 'MECANICO')
   BEGIN SELECT RAISE(ABORT, 'Rol inválido'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_usuario_rol_upd BEFORE UPDATE OF rol ON usuario
   WHEN NEW.rol NOT IN ('ADMINISTRADOR', 'MECANICO')
   BEGIN SELECT RAISE(ABORT, 'Rol inválido'); END`,

  // Strategy: cada canal exige su dato de contacto
  `CREATE TRIGGER IF NOT EXISTS trg_proveedor_canal_ins BEFORE INSERT ON proveedor
   WHEN NEW.canalPreferido NOT IN ('CORREO', 'SMS', 'WHATSAPP')
     OR (NEW.canalPreferido = 'CORREO' AND COALESCE(NEW.email, '') = '')
     OR (NEW.canalPreferido IN ('SMS', 'WHATSAPP') AND COALESCE(NEW.telefono, '') = '')
   BEGIN SELECT RAISE(ABORT, 'El canal de aviso exige su dato de contacto'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_proveedor_canal_upd BEFORE UPDATE ON proveedor
   WHEN NEW.canalPreferido NOT IN ('CORREO', 'SMS', 'WHATSAPP')
     OR (NEW.canalPreferido = 'CORREO' AND COALESCE(NEW.email, '') = '')
     OR (NEW.canalPreferido IN ('SMS', 'WHATSAPP') AND COALESCE(NEW.telefono, '') = '')
   BEGIN SELECT RAISE(ABORT, 'El canal de aviso exige su dato de contacto'); END`,
];

export async function aplicarReglasDeIntegridad(prisma: PrismaClient) {
  for (const sql of sentencias) {
    await prisma.$executeRawUnsafe(sql);
  }
}
