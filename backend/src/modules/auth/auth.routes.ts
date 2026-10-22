import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { config } from "../../config";
import { AppError } from "../../errors";
import { validar, verificarJWT, type UsuarioToken } from "../../middlewares/cadena";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const authRouter = Router();

// RF-01: inicio de sesión con credenciales válidas -> token JWT
authRouter.post("/login", validar(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const valido = usuario && (await bcrypt.compare(password, usuario.passwordHash));
  if (!usuario || !valido) throw new AppError(401, "Correo o contraseña incorrectos", "CREDENCIALES_INVALIDAS");
  if (!usuario.activo) throw new AppError(403, "Tu usuario está inactivo", "USUARIO_INACTIVO");

  const datos: UsuarioToken = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol as UsuarioToken["rol"] };
  const token = jwt.sign(datos, config.jwtSecreto, { expiresIn: config.jwtExpira as jwt.SignOptions["expiresIn"] });
  res.json({ token, usuario: datos });
});

// RF-04: usuario autenticado
authRouter.get("/me", verificarJWT, (req, res) => {
  res.json(req.usuario);
});
