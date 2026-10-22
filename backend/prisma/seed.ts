import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { aplicarReglasDeIntegridad } from "./integridad";

// Datos de prueba del taller. Credenciales de prueba (solo desarrollo):
//   admin@jorgemotors.pe   / Admin123!     (ADMINISTRADOR)
//   ltorres@jorgemotors.pe / Mecanico123!  (MECANICO)
const prisma = new PrismaClient();

const fecha = (d: string) => new Date(`2026-${d}:00-05:00`);

async function main() {
  await aplicarReglasDeIntegridad(prisma);
  if ((await prisma.usuario.count()) > 0) {
    console.log("La base ya tiene datos: no se cargan los datos de prueba otra vez.");
    return;
  }

  const [admin, luis, carlos] = await Promise.all([
    prisma.usuario.create({ data: { nombre: "Jorge Quispe", email: "admin@jorgemotors.pe", passwordHash: await bcrypt.hash("Admin123!", 10), rol: "ADMINISTRADOR" } }),
    prisma.usuario.create({ data: { nombre: "Luis Torres", email: "ltorres@jorgemotors.pe", passwordHash: await bcrypt.hash("Mecanico123!", 10), rol: "MECANICO" } }),
    prisma.usuario.create({ data: { nombre: "Carlos Mendoza", email: "cmendoza@jorgemotors.pe", passwordHash: await bcrypt.hash("Mecanico123!", 10), rol: "MECANICO" } }),
  ]);
  await prisma.usuario.create({ data: { nombre: "Pedro Huamán", email: "phuaman@jorgemotors.pe", passwordHash: await bcrypt.hash("Mecanico123!", 10), rol: "MECANICO", activo: false } });

  const categorias: Record<string, number> = {};
  for (const [nombre, descripcion] of [
    ["Repuestos", "Piezas mecánicas de reemplazo"],
    ["Lubricantes", "Aceites y líquidos"],
    ["Filtros", "Filtros de aceite, aire y combustible"],
    ["Baterías", "Baterías automotrices"],
    ["Herramientas", "Herramientas propias del taller"],
    ["Accesorios", "Accesorios y consumibles"],
  ]) {
    categorias[nombre] = (await prisma.categoria.create({ data: { nombre, descripcion } })).id;
  }

  const lubIca = await prisma.proveedor.create({ data: { nombre: "Lubricantes Ica", contacto: "Rosa Gutiérrez", telefono: "987654321", canalPreferido: "WHATSAPP" } });
  const das = await prisma.proveedor.create({ data: { nombre: "Distribuidora Automotriz del Sur", contacto: "Martín Salas", email: "ventas@das.pe", telefono: "056271400", canalPreferido: "CORREO" } });
  const batChincha = await prisma.proveedor.create({ data: { nombre: "Baterías Chincha", contacto: "Ana Rojas", telefono: "956112334", canalPreferido: "SMS" } });

  // [código, nombre, categoría, ubicación, precio, mínimo, proveedor]
  const catalogo: [string, string, string, string, number, number, number | null][] = [
    ["REP-0001", "Pastillas de freno delanteras", "Repuestos", "C-04", 95, 4, das.id],
    ["REP-0002", "Bujía NGK estándar", "Repuestos", "C-01", 12, 20, das.id],
    ["REP-0003", "Faja de distribución", "Repuestos", "C-02", 140, 2, das.id],
    ["LUB-0001", "Aceite de motor 20W-50 (galón)", "Lubricantes", "A-02", 85, 6, lubIca.id],
    ["LUB-0002", "Aceite 10W-30 sintético", "Lubricantes", "A-03", 120, 6, lubIca.id],
    ["LUB-0003", "Líquido de frenos DOT 4", "Lubricantes", "A-04", 28, 5, lubIca.id],
    ["FIL-0001", "Filtro de aceite Toyota", "Filtros", "B-01", 18, 5, das.id],
    ["FIL-0002", "Filtro de aire Hyundai", "Filtros", "B-02", 35, 5, das.id],
    ["FIL-0003", "Filtro de combustible", "Filtros", "B-03", 25, 5, das.id],
    ["BAT-0001", "Batería 12V 13 placas", "Baterías", "D-01", 380, 2, batChincha.id],
    ["BAT-0002", "Batería 12V 11 placas", "Baterías", "D-02", 320, 2, batChincha.id],
    ["HER-0001", "Llave de torque 1/2\"", "Herramientas", "E-01", 260, 1, null],
    ["HER-0002", "Juego de dados 40 piezas", "Herramientas", "E-02", 95, 2, null],
    ["ACC-0001", "Refrigerante verde 1 L", "Accesorios", "A-05", 22, 8, lubIca.id],
    ["ACC-0002", "Plumillas limpiaparabrisas", "Accesorios", "F-01", 30, 6, das.id],
  ];
  const productos: Record<string, { id: number; stock: number; proveedorId: number | null; minimo: number }> = {};
  for (const [codigo, nombre, cat, ubicacion, precioUnitario, stockMinimo, proveedorId] of catalogo) {
    const p = await prisma.producto.create({
      data: { codigo, nombre, ubicacion, precioUnitario, stockMinimo, categoriaId: categorias[cat], proveedorId, stock: { create: { cantidadActual: 0 } } },
    });
    productos[codigo] = { id: p.id, stock: 0, proveedorId, minimo: stockMinimo };
  }

  // Historial (kardex). Cada movimiento calcula su stock anterior y resultante.
  const historial: [string, "ENTRADA" | "SALIDA", string, number, string, string, number][] = [
    ["LUB-0001", "ENTRADA", "COMPRA", 12, "F001-2201", "10-01T10:05", admin.id],
    ["REP-0001", "ENTRADA", "COMPRA", 6, "F001-2202", "10-01T10:20", admin.id],
    ["REP-0002", "ENTRADA", "COMPRA", 44, "F001-2202", "10-01T10:20", admin.id],
    ["REP-0003", "ENTRADA", "COMPRA", 10, "F001-2202", "10-01T10:20", admin.id],
    ["LUB-0002", "ENTRADA", "COMPRA", 14, "F001-2201", "10-01T10:05", admin.id],
    ["LUB-0003", "ENTRADA", "COMPRA", 14, "F001-2201", "10-01T10:05", admin.id],
    ["FIL-0001", "ENTRADA", "COMPRA", 6, "F001-2202", "10-01T10:20", admin.id],
    ["FIL-0002", "ENTRADA", "COMPRA", 10, "F001-2202", "10-01T10:20", admin.id],
    ["FIL-0003", "ENTRADA", "COMPRA", 15, "F001-2202", "10-01T10:20", admin.id],
    ["BAT-0001", "ENTRADA", "COMPRA", 4, "B002-0310", "10-01T11:00", admin.id],
    ["BAT-0002", "ENTRADA", "COMPRA", 8, "B002-0310", "10-01T11:00", admin.id],
    ["HER-0001", "ENTRADA", "AJUSTE", 2, "INV-INICIAL", "10-01T09:00", admin.id],
    ["HER-0002", "ENTRADA", "AJUSTE", 8, "INV-INICIAL", "10-01T09:00", admin.id],
    ["ACC-0001", "ENTRADA", "COMPRA", 10, "F001-2201", "10-01T10:05", admin.id],
    ["ACC-0002", "ENTRADA", "COMPRA", 19, "F001-2202", "10-01T10:20", admin.id],
    ["LUB-0001", "SALIDA", "USO_TALLER", 2, "OT-0110", "10-05T11:40", luis.id],
    ["FIL-0001", "SALIDA", "USO_TALLER", 2, "OT-0112", "10-06T09:30", carlos.id],
    ["REP-0001", "SALIDA", "USO_TALLER", 4, "OT-0115", "10-08T14:10", carlos.id],
    ["LUB-0001", "SALIDA", "USO_TALLER", 3, "OT-0118", "10-09T15:22", carlos.id],
    ["LUB-0001", "SALIDA", "VENTA", 2, "B001-0457", "10-14T09:10", luis.id],
    ["ACC-0001", "SALIDA", "USO_TALLER", 5, "OT-0131", "10-20T16:20", luis.id],
    ["REP-0001", "ENTRADA", "COMPRA", 6, "F001-2389", "10-21T17:02", admin.id],
    ["REP-0002", "SALIDA", "USO_TALLER", 4, "OT-0139", "10-21T11:30", luis.id],
    ["FIL-0002", "SALIDA", "USO_TALLER", 1, "OT-0140", "10-21T12:05", luis.id],
    ["FIL-0001", "SALIDA", "USO_TALLER", 1, "OT-0141", "10-21T18:15", carlos.id],
    ["LUB-0001", "SALIDA", "USO_TALLER", 2, "OT-0142", "10-21T18:41", luis.id],
  ];
  for (const [codigo, tipo, motivo, cantidad, documento, f, usuarioId] of historial) {
    const p = productos[codigo];
    const stockAnterior = p.stock;
    p.stock = tipo === "ENTRADA" ? stockAnterior + cantidad : stockAnterior - cantidad;
    await prisma.movimiento.create({
      data: { productoId: p.id, usuarioId, tipo, motivo, cantidad, stockAnterior, stockResultante: p.stock, documento, fecha: fecha(f) },
    });
  }
  for (const p of Object.values(productos)) {
    await prisma.stock.update({ where: { productoId: p.id }, data: { cantidadActual: p.stock } });
  }

  // Alertas en los tres estados del tablero
  const alerta = async (codigo: string, stockActual: number, minimo: number, generada: string, mensaje: string) => {
    const p = productos[codigo];
    return prisma.alertaStock.create({
      data: { productoId: p.id, proveedorId: p.proveedorId, stockActual, stockMinimo: minimo, mensaje, fechaGeneracion: fecha(generada) },
    });
  };
  await alerta("LUB-0001", 3, 6, "10-21T18:41", "El stock bajó a 3 unidades tras la salida OT-0142.");
  await alerta("FIL-0001", 3, 5, "10-21T18:15", "El stock bajó a 3 unidades tras la salida OT-0141.");
  const refrigerante = await alerta("ACC-0001", 5, 8, "10-20T16:20", "El stock bajó a 5 unidades tras la salida OT-0131.");
  await prisma.alertaStock.update({ where: { id: refrigerante.id }, data: { estado: "ENVIADA", fechaEnvio: fecha("10-20T16:32") } });
  const pastillas = await alerta("REP-0001", 2, 4, "10-08T14:10", "El stock bajó a 2 unidades tras la salida OT-0115.");
  await prisma.alertaStock.update({ where: { id: pastillas.id }, data: { estado: "ENVIADA", fechaEnvio: fecha("10-18T10:00") } });
  await prisma.alertaStock.update({ where: { id: pastillas.id }, data: { estado: "ATENDIDA" } });

  console.log("Base de datos lista: 15 productos, 3 proveedores, 4 usuarios, 4 alertas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
