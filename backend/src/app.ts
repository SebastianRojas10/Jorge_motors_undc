import express, { Router } from "express";
import cors from "cors";
import { config } from "./config";
import { manejarErrores, verificarJWT } from "./middlewares/cadena";
import { authRouter } from "./modules/auth/auth.routes";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes";
import { categoriasRouter } from "./modules/catalogo/categorias.routes";
import { productosRouter } from "./modules/catalogo/productos.routes";
import { proveedoresRouter } from "./modules/proveedores/proveedores.routes";
import { movimientosRouter } from "./modules/inventario/movimientos.routes";
import { alertasRouter } from "./modules/notificaciones/alertas.routes";
import { reportesRouter } from "./modules/reportes/reportes.routes";
import { suscribirNotificadorStock } from "./modules/notificaciones/notificador-stock";

suscribirNotificadorStock();

export const app = express();
app.use(cors({ origin: config.origenCors }));
app.use(express.json());

const api = Router();

// Públicas: verificación de estado (RNF-10) e inicio de sesión
api.get("/health", (_req, res) => res.json({ estado: "ok" }));
api.use("/auth", authRouter);

// Todo lo demás exige sesión (RNF-01); cada módulo aplica su filtro de roles
api.use(verificarJWT);
api.use("/usuarios", usuariosRouter);
api.use("/categorias", categoriasRouter);
api.use("/productos", productosRouter);
api.use("/proveedores", proveedoresRouter);
api.use("/movimientos", movimientosRouter);
api.use("/alertas", alertasRouter);
api.use("/reportes", reportesRouter);

app.use("/api/v1", api);
app.use("/api/v1", (_req, res) => {
  res.status(404).json({ error: { codigo: "NO_ENCONTRADO", mensaje: "Ruta no encontrada" } });
});
app.use(manejarErrores);
