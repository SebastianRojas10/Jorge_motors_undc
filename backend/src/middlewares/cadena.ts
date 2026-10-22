import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodTypeAny } from "zod";
import { config } from "../config";
import { AppError } from "../errors";

// Chain of Responsibility: cada petición a /api/v1 recorre
// verificarJWT -> permitirRol -> validar(zod) -> controlador -> manejarErrores.
// Cada eslabón deja pasar la petición o la detiene.

export type Rol = "ADMINISTRADOR" | "MECANICO";
export interface UsuarioToken {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

declare module "express-serve-static-core" {
  interface Request {
    usuario?: UsuarioToken;
  }
}

export function verificarJWT(req: Request, _res: Response, next: NextFunction) {
  const [tipo, token] = (req.headers.authorization ?? "").split(" ");
  if (tipo !== "Bearer" || !token) throw new AppError(401, "Debes iniciar sesión", "SIN_SESION");
  try {
    req.usuario = jwt.verify(token, config.jwtSecreto) as UsuarioToken;
  } catch {
    throw new AppError(401, "La sesión expiró o no es válida", "SIN_SESION");
  }
  next();
}

export function permitirRol(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      throw new AppError(403, "Tu rol no tiene permiso para esta acción", "SIN_PERMISO");
    }
    next();
  };
}

export function validar(esquema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = esquema.parse(req.body ?? {});
    next();
  };
}

export function manejarErrores(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        codigo: "DATOS_INVALIDOS",
        mensaje: "Revisa los datos ingresados",
        detalles: err.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
      },
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ error: { codigo: "DUPLICADO", mensaje: "Ya existe un registro con ese valor único" } });
    if (err.code === "P2003") return res.status(409).json({ error: { codigo: "EN_USO", mensaje: "El registro está relacionado con otros datos" } });
    if (err.code === "P2025") return res.status(404).json({ error: { codigo: "NO_ENCONTRADO", mensaje: "Registro no encontrado" } });
  }
  // Las reglas de la base (triggers) responden con RAISE(ABORT, mensaje)
  const mensaje = err instanceof Error ? err.message : String(err);
  const trigger = mensaje.match(/(El stock no puede ser negativo|Movimiento con aritmética incorrecta|Los movimientos no se pueden (editar|eliminar)|Transición de alerta no permitida|Rol inválido|El canal de aviso exige su dato de contacto)/);
  if (trigger) return res.status(409).json({ error: { codigo: "REGLA_DE_INTEGRIDAD", mensaje: trigger[1] } });

  console.error(err);
  res.status(500).json({ error: { codigo: "ERROR_INTERNO", mensaje: "Ocurrió un error inesperado" } });
}
