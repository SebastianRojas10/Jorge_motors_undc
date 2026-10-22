import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "./api";

// Carga datos de la API y permite recargarlos después de una acción
export function useDatos<T>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    if (!ruta) return;
    setCargando(true);
    try {
      setDatos(await api.get<T>(ruta));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudieron cargar los datos");
    } finally {
      setCargando(false);
    }
  }, [ruta]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { datos, error, cargando, recargar };
}

export function useAviso() {
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);
  return { aviso, ok: (texto: string) => setAviso({ tipo: "ok", texto }), error: (e: unknown) => setAviso({ tipo: "error", texto: e instanceof Error ? e.message : String(e) }) };
}
