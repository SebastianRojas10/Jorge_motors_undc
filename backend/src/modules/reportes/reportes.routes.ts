import { Router } from "express";
import { prisma } from "../../db/prisma";
import { NoEncontradoError } from "../../errors";
import { permitirRol } from "../../middlewares/cadena";

export const reportesRouter = Router();
reportesRouter.use(permitirRol("ADMINISTRADOR"));

async function inventarioValorizado() {
  const productos = await prisma.producto.findMany({ include: { stock: true, categoria: true }, orderBy: { codigo: "asc" } });
  const porCategoria = new Map<string, { categoria: string; productos: number; unidades: number; valor: number }>();
  const detalle = productos.map((p) => {
    const unidades = p.stock?.cantidadActual ?? 0;
    const valor = unidades * p.precioUnitario;
    const fila = porCategoria.get(p.categoria.nombre) ?? { categoria: p.categoria.nombre, productos: 0, unidades: 0, valor: 0 };
    fila.productos += 1;
    fila.unidades += unidades;
    fila.valor += valor;
    porCategoria.set(p.categoria.nombre, fila);
    return { id: p.id, codigo: p.codigo, nombre: p.nombre, categoria: p.categoria.nombre, unidades, stockMinimo: p.stockMinimo, precioUnitario: p.precioUnitario, valor };
  });
  const categorias = [...porCategoria.values()].sort((a, b) => b.valor - a.valor);
  const totales = {
    productos: productos.length,
    unidades: detalle.reduce((s, d) => s + d.unidades, 0),
    valor: detalle.reduce((s, d) => s + d.valor, 0),
    bajoMinimo: detalle.filter((d) => d.unidades < d.stockMinimo).length,
  };
  return { categorias, detalle, totales };
}

// Panel del administrador (RF-10, RF-11, RF-12)
reportesRouter.get("/resumen", async (_req, res) => {
  const [inventario, alertas, movimientos] = await Promise.all([
    inventarioValorizado(),
    prisma.alertaStock.findMany({
      where: { estado: { not: "ATENDIDA" } },
      include: { producto: { select: { nombre: true } }, proveedor: { select: { nombre: true } } },
      orderBy: { fechaGeneracion: "desc" },
    }),
    prisma.movimiento.findMany({
      include: { producto: { select: { nombre: true } }, usuario: { select: { nombre: true } } },
      orderBy: { fecha: "desc" },
      take: 6,
    }),
  ]);
  res.json({ totales: inventario.totales, categorias: inventario.categorias, alertas, movimientos });
});

reportesRouter.get("/inventario", async (_req, res) => {
  res.json(await inventarioValorizado());
});

// Kardex por producto (RF-10, RF-11)
reportesRouter.get("/kardex/:productoId", async (req, res) => {
  const productoId = Number(req.params.productoId);
  const producto = await prisma.producto.findUnique({ where: { id: productoId }, include: { stock: true } });
  if (!producto) throw new NoEncontradoError("Producto");
  const desde = req.query.desde ? new Date(`${req.query.desde}T00:00:00-05:00`) : undefined;
  const hasta = req.query.hasta ? new Date(`${req.query.hasta}T23:59:59-05:00`) : undefined;
  const movimientos = await prisma.movimiento.findMany({
    where: { productoId, fecha: { gte: desde, lte: hasta } },
    include: { usuario: { select: { nombre: true } } },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
  });
  res.json({
    producto: { id: producto.id, codigo: producto.codigo, nombre: producto.nombre, stockActual: producto.stock?.cantidadActual ?? 0 },
    movimientos,
    totales: {
      entradas: movimientos.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.cantidad, 0),
      salidas: movimientos.filter((m) => m.tipo === "SALIDA").reduce((s, m) => s + m.cantidad, 0),
    },
  });
});
