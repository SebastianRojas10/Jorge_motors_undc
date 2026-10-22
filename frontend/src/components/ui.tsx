import { useEffect, type ReactNode } from "react";

export function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCerrar]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-head">
          <h2>{titulo}</h2>
          <button className="x" type="button" aria-label="Cerrar" onClick={onCerrar}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Aviso({ aviso }: { aviso: { tipo: "ok" | "error"; texto: string } | null }) {
  if (!aviso) return null;
  return (
    <div className={`aviso toast ${aviso.tipo}`} role="status">
      {aviso.texto}
    </div>
  );
}

export function Campo({ id, label, error, req, children }: { id: string; label: string; error?: string; req?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {req && <span className="req">{req}</span>}
      </label>
      {children}
      {error && <div className="err">{error}</div>}
    </div>
  );
}

export function EstadoStock({ cantidad, minimo, mecanico }: { cantidad: number; minimo: number; mecanico?: boolean }) {
  const bajo = cantidad < minimo;
  if (mecanico) return <span className={`b ${bajo ? "low" : "ok"}`}>{cantidad === 0 ? "Sin stock" : bajo ? "Pocas unidades" : "Disponible"}</span>;
  return <span className={`b ${bajo ? "low" : "ok"}`}>{bajo ? "Bajo el mínimo" : "Normal"}</span>;
}

export function Barra({ cantidad, minimo }: { cantidad: number; minimo: number }) {
  const pct = minimo === 0 ? 100 : Math.min(100, Math.round((cantidad / minimo) * 100));
  return (
    <div className="bar" aria-hidden="true">
      <i className={cantidad < minimo ? "l" : ""} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Cargando({ error }: { error?: string | null }) {
  return error ? <div className="aviso error">{error}</div> : <div className="muted">Cargando…</div>;
}
