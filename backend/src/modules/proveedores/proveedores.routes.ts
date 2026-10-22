import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { permitirRol, validar } from "../../middlewares/cadena";

const opcional = z.string().trim().optional().nullable().transform((v) => (v ? v : null));

// Strategy (RF-07): cada canal exige el dato que necesita, igual que el trigger de la base
const proveedorSchema = z
  .object({
    nombre: z.string().trim().min(2, "Ingresa el nombre"),
    contacto: opcional,
    email: opcional.refine((v) => !v || z.string().email().safeParse(v).success, "Correo inválido"),
    telefono: opcional,
    canalPreferido: z.enum(["CORREO", "SMS", "WHATSAPP"]),
  })
  .superRefine((p, ctx) => {
    if (p.canalPreferido === "CORREO" && !p.email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "El correo es obligatorio para avisos por correo" });
    }
    if (p.canalPreferido !== "CORREO" && !p.telefono) {
      ctx.addIssue({ code: "custom", path: ["telefono"], message: "El teléfono es obligatorio para avisos por SMS o WhatsApp" });
    }
  });

export const proveedoresRouter = Router();
proveedoresRouter.use(permitirRol("ADMINISTRADOR"));

proveedoresRouter.get("/", async (_req, res) => {
  res.json(await prisma.proveedor.findMany({ orderBy: { nombre: "asc" }, include: { _count: { select: { productos: true } } } }));
});

proveedoresRouter.post("/", validar(proveedorSchema), async (req, res) => {
  res.status(201).json(await prisma.proveedor.create({ data: req.body }));
});

proveedoresRouter.put("/:id", validar(proveedorSchema), async (req, res) => {
  res.json(await prisma.proveedor.update({ where: { id: Number(req.params.id) }, data: req.body }));
});

// SET NULL: sus productos y alertas quedan sin proveedor
proveedoresRouter.delete("/:id", async (req, res) => {
  await prisma.proveedor.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});
