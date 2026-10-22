import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, onSesionExpirada, sesion } from "./api";
import type { Rol, Usuario } from "./types";

export const inicioDe = (rol: Rol) => (rol === "ADMINISTRADOR" ? "/panel" : "/mecanico/salida");

interface AuthCtx {
  usuario: Usuario | null;
  cargando: boolean;
  ingresar: (email: string, password: string) => Promise<Usuario>;
  salir: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const salir = useCallback(() => {
    sesion.cerrar();
    setUsuario(null);
  }, []);

  useEffect(() => {
    onSesionExpirada(salir);
    if (!sesion.token()) return setCargando(false);
    // RF-04: con el token, se consulta quién inició sesión
    api
      .get<Usuario>("/auth/me")
      .then(setUsuario)
      .catch(() => sesion.cerrar())
      .finally(() => setCargando(false));
  }, [salir]);

  const ingresar = async (email: string, password: string) => {
    const r = await api.post<{ token: string; usuario: Usuario }>("/auth/login", { email, password });
    sesion.guardar(r.token);
    setUsuario(r.usuario);
    return r.usuario;
  };

  return <Ctx.Provider value={{ usuario, cargando, ingresar, salir }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fuera de AuthProvider");
  return c;
}
