// Cliente de la API REST (/api/v1). Cada acción de la interfaz es una petición.
const BASE = "/api/v1";
const CLAVE_TOKEN = "jm_token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public codigo: string,
    public detalles?: { campo: string; mensaje: string }[],
  ) {
    super(message);
  }
}

export const sesion = {
  token: () => localStorage.getItem(CLAVE_TOKEN),
  guardar: (t: string) => localStorage.setItem(CLAVE_TOKEN, t),
  cerrar: () => localStorage.removeItem(CLAVE_TOKEN),
};

let alExpirar: (() => void) | null = null;
export const onSesionExpirada = (fn: () => void) => {
  alExpirar = fn;
};

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const token = sesion.token();
  let res: Response;
  try {
    res = await fetch(BASE + ruta, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. ¿Está encendida la API?", "SIN_CONEXION");
  }
  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && ruta !== "/auth/login") alExpirar?.();
    const e = datos.error ?? {};
    throw new ApiError(res.status, e.mensaje ?? "Error inesperado", e.codigo ?? "ERROR", e.detalles);
  }
  return datos as T;
}

export const api = {
  get: <T>(ruta: string) => pedir<T>("GET", ruta),
  post: <T>(ruta: string, cuerpo: unknown) => pedir<T>("POST", ruta, cuerpo),
  put: <T>(ruta: string, cuerpo: unknown) => pedir<T>("PUT", ruta, cuerpo),
  patch: <T>(ruta: string, cuerpo?: unknown) => pedir<T>("PATCH", ruta, cuerpo ?? {}),
  del: (ruta: string) => pedir<void>("DELETE", ruta),
};

// Errores de validación de Zod, por campo
export function erroresPorCampo(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || !e.detalles) return {};
  return Object.fromEntries(e.detalles.map((d) => [d.campo, d.mensaje]));
}
