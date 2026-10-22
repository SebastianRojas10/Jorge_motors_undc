import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { permitirRol, validar } from "../../middlewares/cadena";
import { inventario } from "./inventario.facade";

const base = {
  productoId: z.coerce.number().int().positive("Elige un producto"),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor que 0"),
  documento: z.string().trim().max(40).optional().nullable(),
};
const entradaSchema = z.object({
  ...base,
  motivo: z.enum(["COMPRA", "DEVOLUCION", "AJUSTE"]),
  costoUnitario: z.coerce.number().min(0, "El costo no puede ser negativo").optional().nullable(),
});
const salidaSchema = z.object({ ...base, motivo: z.enum(["USO_TALLER", "VENTA", "AJUSTE"]) });

export const movimientosRouter = Router();

// RF-10: historial con usuario y fecha. El mecánico solo ve sus propios movimientos.
movimientosRouter.get("/", async (req, res) => {
  const limite = Math.min(Number(req.query.limite) || 50, 200);
  const productoId = Number(req.query.productoId) || undefined;
  const soloMios = req.usuario!.rol === "MECANICO" || req.query.mios === "1";
  const movimientos = await prisma.movimiento.findMany({
    where: { productoId, ...(soloMios ? { usuarioId: req.usuario!.id } : {}) },
    include: { producto: { select: { codigo: true, nombre: true } }, usuario: { select: { nombre: true } } },
    orderBy: { fecha: "desc" },
    take: limite,
  });
  res.json(movimientos);
});

// RF-08 y RF-09: entradas (solo administrador) y salidas (ambos roles)
movimientosRouter.post("/entrada", permitirRol("ADMINISTRADOR"), validar(entradaSchema), async (req, res) => {
  res.status(201).json(await inventario.registrarEntrada(req.body, req.usuario!.id));
});

movimientosRouter.post("/salida", permitirRol("ADMINISTRADOR", "MECANICO"), validar(salidaSchema), async (req, res) => {
  res.status(201).json(await inventario.registrarSalida(req.body, req.usuario!.id));
});
