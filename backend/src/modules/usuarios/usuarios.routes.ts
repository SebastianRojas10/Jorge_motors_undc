import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { AppError } from "../../errors";
import { permitirRol, validar } from "../../middlewares/cadena";

const rol = z.enum(["ADMINISTRADOR", "MECANICO"]);
const crearSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre"),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  rol,
  activo: z.boolean().default(true),
});
const editarSchema = crearSchema.extend({ password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional().or(z.literal("")) });

const publico = { id: true, nombre: true, email: true, rol: true, activo: true, _count: { select: { movimientos: true } } } as const;

export const usuariosRouter = Router();
usuariosRouter.use(permitirRol("ADMINISTRADOR"));

usuariosRouter.get("/", async (_req, res) => {
  res.json(await prisma.usuario.findMany({ select: publico, orderBy: { id: "asc" } }));
});

usuariosRouter.post("/", validar(crearSchema), async (req, res) => {
  const { password, ...datos } = req.body as z.infer<typeof crearSchema>;
  const usuario = await prisma.usuario.create({ data: { ...datos, passwordHash: await bcrypt.hash(password, 10) }, select: publico });
  res.status(201).json(usuario);
});

usuariosRouter.put("/:id", validar(editarSchema), async (req, res) => {
  const id = Number(req.params.id);
  const { password, ...datos } = req.body as z.infer<typeof editarSchema>;
  if (id === req.usuario!.id && (datos.rol !== "ADMINISTRADOR" || !datos.activo)) {
    throw new AppError(409, "No puedes quitarte el rol de administrador ni desactivarte", "OPERACION_NO_PERMITIDA");
  }
  const usuario = await prisma.usuario.update({
    where: { id },
    data: { ...datos, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
    select: publico,
  });
  res.json(usuario);
});
