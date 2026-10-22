import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { NoEncontradoError } from "../../errors";
import { permitirRol, validar, type Rol } from "../../middlewares/cadena";
import { inventario } from "../inventario/inventario.facade";

const productoSchema = z.object({
  codigo: z.string().trim().toUpperCase().regex(/^[A-Z]{3}-\d{4}$/, "Usa el formato ABC-0001"),
  nombre: z.string().trim().min(2, "Ingresa el nombre"),
  descripcion: z.string().trim().optional().nullable(),
  ubicacion: z.string().trim().optional().nullable(),
  precioUnitario: z.coerce.number().min(0, "El precio no puede ser negativo"),
  stockMinimo: z.coerce.number().int().min(0, "El mínimo no puede ser negativo"),
  categoriaId: z.coerce.number().int().positive("Elige una categoría"),
  proveedorId: z.coerce.number().int().positive().optional().nullable(),
});
const crearSchema = productoSchema.extend({ stockInicial: z.coerce.number().int().min(0).default(0) });

const incluir = { categoria: true, proveedor: true, stock: true } as const;
type ProductoCompleto = NonNullable<Awaited<ReturnType<typeof buscar>>>;
const buscar = (id: number) => prisma.producto.findUnique({ where: { id }, include: incluir });

// RF-03: el mecánico no ve precios ni proveedores
export function presentarProducto(p: ProductoCompleto, rol: Rol) {
  const cantidadActual = p.stock?.cantidadActual ?? 0;
  const base = {
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion,
    ubicacion: p.ubicacion,
    stockMinimo: p.stockMinimo,
    categoria: { id: p.categoria.id, nombre: p.categoria.nombre },
    cantidadActual,
    bajoMinimo: cantidadActual < p.stockMinimo,
  };
  if (rol === "MECANICO") return base;
  return { ...base, precioUnitario: p.precioUnitario, proveedor: p.proveedor ? { id: p.proveedor.id, nombre: p.proveedor.nombre } : null };
}

export const productosRouter = Router();

productosRouter.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const categoriaId = Number(req.query.categoriaId) || undefined;
  const productos = await prisma.producto.findMany({
    where: {
      categoriaId,
      ...(q ? { OR: [{ codigo: { contains: q } }, { nombre: { contains: q } }] } : {}),
    },
    include: incluir,
    orderBy: { codigo: "asc" },
  });
  const lista = productos.map((p) => presentarProducto(p, req.usuario!.rol));
  // Los que están bajo el mínimo primero
  lista.sort((a, b) => Number(b.bajoMinimo) - Number(a.bajoMinimo));
  res.json(lista);
});

productosRouter.get("/:id", async (req, res) => {
  const p = await buscar(Number(req.params.id));
  if (!p) throw new NoEncontradoError("Producto");
  res.json(presentarProducto(p, req.usuario!.rol));
});

productosRouter.post("/", permitirRol("ADMINISTRADOR"), validar(crearSchema), async (req, res) => {
  const { stockInicial, ...datos } = req.body as z.infer<typeof crearSchema>;
  const creado = await prisma.producto.create({ data: { ...datos, stock: { create: { cantidadActual: 0 } } } });
  if (stockInicial > 0) {
    await inventario.registrarEntrada({ productoId: creado.id, cantidad: stockInicial, motivo: "AJUSTE", documento: "INV-INICIAL" }, req.usuario!.id);
  }
  res.status(201).json(presentarProducto((await buscar(creado.id))!, "ADMINISTRADOR"));
});

productosRouter.put("/:id", permitirRol("ADMINISTRADOR"), validar(productoSchema), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.producto.update({ where: { id }, data: req.body });
  res.json(presentarProducto((await buscar(id))!, "ADMINISTRADOR"));
});

// RESTRICT: un producto con movimientos no se borra (el kardex se conserva)
productosRouter.delete("/:id", permitirRol("ADMINISTRADOR"), async (req, res) => {
  await prisma.producto.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});
