import { Router } from "express";
import { prisma } from "../../db/prisma";
import { permitirRol } from "../../middlewares/cadena";
import { atenderAlerta, enviarAlerta } from "./notificador-stock";

export const alertasRouter = Router();
alertasRouter.use(permitirRol("ADMINISTRADOR"));

alertasRouter.get("/", async (req, res) => {
  const estado = req.query.estado ? String(req.query.estado) : undefined;
  res.json(
    await prisma.alertaStock.findMany({
      where: { estado },
      include: {
        producto: { select: { id: true, codigo: true, nombre: true } },
        proveedor: { select: { id: true, nombre: true, email: true, telefono: true, canalPreferido: true } },
      },
      orderBy: { fechaGeneracion: "desc" },
    }),
  );
});

alertasRouter.patch("/:id/enviar", async (req, res) => {
  res.json(await enviarAlerta(Number(req.params.id)));
});

alertasRouter.patch("/:id/atender", async (req, res) => {
  res.json(await atenderAlerta(Number(req.params.id)));
});
