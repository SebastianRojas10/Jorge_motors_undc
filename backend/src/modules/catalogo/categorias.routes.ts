import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { permitirRol, validar } from "../../middlewares/cadena";

const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre"),
  descripcion: z.string().trim().optional().nullable(),
});

export const categoriasRouter = Router();

categoriasRouter.get("/", async (_req, res) => {
  res.json(await prisma.categoria.findMany({ orderBy: { nombre: "asc" }, include: { _count: { select: { productos: true } } } }));
});

categoriasRouter.post("/", permitirRol("ADMINISTRADOR"), validar(categoriaSchema), async (req, res) => {
  res.status(201).json(await prisma.categoria.create({ data: req.body }));
});

categoriasRouter.put("/:id", permitirRol("ADMINISTRADOR"), validar(categoriaSchema), async (req, res) => {
  res.json(await prisma.categoria.update({ where: { id: Number(req.params.id) }, data: req.body }));
});

// RESTRICT: no se puede borrar una categoría con productos
categoriasRouter.delete("/:id", permitirRol("ADMINISTRADOR"), async (req, res) => {
  await prisma.categoria.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});
