import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, erroresPorCampo } from "../api";
import { useDatos } from "../hooks";
import { MOTIVOS, fechaCorta } from "../format";
import { Campo, Cargando, EstadoStock } from "../components/ui";
import type { Movimiento, Producto } from "../types";

const PASOS = ["Repuesto", "Cantidad y orden", "Confirmar"];

// Vista del mecánico: una salida en 3 pasos (RNF-13)
export function MecanicoSalida() {
  const [params, setParams] = useSearchParams();
  const productos = useDatos<Producto[]>("/productos");
  const mias = useDatos<Movimiento[]>("/movimientos?limite=6");
  const [paso, setPaso] = useState(1);
  const [productoId, setProductoId] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [orden, setOrden] = useState("");
  const [motivo, setMotivo] = useState("USO_TALLER");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState<Movimiento | null>(null);

  // Desde "Consultar stock" se llega con el repuesto ya elegido (paso 2)
  useEffect(() => {
    const id = Number(params.get("producto"));
    if (id) {
      setProductoId(id);
      setPaso(2);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const producto = productos.datos?.find((p) => p.id === productoId);
  const n = Math.max(0, Math.floor(Number(cantidad) || 0));
  const resultante = producto ? producto.cantidadActual - n : 0;
  const insuficiente = !!producto && resultante < 0;
  const quedaBajo = !!producto && !insuficiente && resultante < producto.stockMinimo;
  const filtrados = productos.datos?.filter((p) => `${p.codigo} ${p.nombre}`.toLowerCase().includes(busca.trim().toLowerCase())) ?? [];

  const reiniciar = () => {
    setHecho(null);
    setPaso(1);
    setProductoId(null);
    setCantidad("1");
    setOrden("");
    setMotivo("USO_TALLER");
    setError(null);
  };

  const confirmar = async () => {
    if (!producto) return;
    setEnviando(true);
    setError(null);
    try {
      const m = await api.post<Movimiento>("/movimientos/salida", { productoId: producto.id, cantidad: n, motivo, documento: orden || null });
      setHecho(m);
      productos.recargar();
      mias.recargar();
    } catch (err) {
      setErrores(erroresPorCampo(err));
      setError(err instanceof Error ? err.message : String(err));
      setPaso(2);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <h1>Registrar salida</h1>
      <div className="steps" aria-label="Progreso">
        {PASOS.map((t, i) => (
          <span key={t} style={{ display: "contents" }}>
            {i > 0 && <span className="sep" />}
            <span className={`st ${hecho || paso > i + 1 ? "done" : paso === i + 1 ? "on" : ""}`} aria-current={paso === i + 1 ? "step" : undefined}>
              <b>{i + 1}</b>
              {t}
            </span>
          </span>
        ))}
      </div>

      <div className="grid" style={{ ["--min" as string]: "340px" }}>
        <div className="card span2" style={{ padding: 24, gap: 18 }}>
          {!productos.datos ? (
            <Cargando error={productos.error} />
          ) : hecho ? (
            <>
              <div className="aviso ok" role="status">
                <strong>Salida registrada.</strong> {hecho.cantidad} × {hecho.producto?.nombre}: stock {hecho.stockAnterior} → {hecho.stockResultante}.
              </div>
              {hecho.stockResultante < (hecho.producto?.stockMinimo ?? 0) && (
                <div className="aviso warn">El repuesto quedó bajo el mínimo: el sistema avisará al proveedor.</div>
              )}
              <div className="actions">
                <button className="btn" type="button" onClick={reiniciar}>
                  Registrar otra salida
                </button>
                <Link className="btn alt" to="/mecanico/stock">
                  Consultar stock
                </Link>
              </div>
            </>
          ) : paso === 1 ? (
            <>
              <h2>¿Qué repuesto vas a usar?</h2>
              <label htmlFor="busca" className="sr-only">
                Buscar repuesto
              </label>
              <input id="busca" type="search" placeholder="Buscar repuesto por nombre o código" value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
                {filtrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="opt"
                    style={{ justifyContent: "space-between", background: "#fff", textAlign: "left", minHeight: 64, font: "inherit", flex: "none" }}
                    disabled={p.cantidadActual === 0}
                    onClick={() => {
                      setProductoId(p.id);
                      setPaso(2);
                    }}
                  >
                    <span>
                      <strong>{p.nombre}</strong>
                      <span className="muted small" style={{ display: "block", fontWeight: 400 }}>
                        {p.codigo} · Estante {p.ubicacion ?? "—"} · {p.cantidadActual} disponibles
                      </span>
                    </span>
                    <EstadoStock cantidad={p.cantidadActual} minimo={p.stockMinimo} mecanico />
                  </button>
                ))}
                {filtrados.length === 0 && <div className="muted">No se encontraron repuestos.</div>}
              </div>
            </>
          ) : producto ? (
            <>
              <div className="elegido">
                <div>
                  <strong style={{ fontSize: 17 }}>{producto.nombre}</strong>
                  <div className="muted small">
                    {producto.codigo} · Estante {producto.ubicacion ?? "—"} · {producto.cantidadActual} disponibles
                  </div>
                </div>
                <button className="link" type="button" onClick={() => setPaso(1)}>
                  Cambiar
                </button>
              </div>
              {paso === 2 ? (
                <>
                  <div className="fields">
                    <Campo id="mc" label="Cantidad" error={errores.cantidad}>
                      <input id="mc" type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
                    </Campo>
                    <Campo id="mo" label="Orden de trabajo" error={errores.documento}>
                      <input id="mo" value={orden} onChange={(e) => setOrden(e.target.value)} placeholder="OT-0143" />
                    </Campo>
                    <Campo id="mm" label="Motivo">
                      <select id="mm" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                        <option value="USO_TALLER">Uso en taller</option>
                        <option value="VENTA">Venta</option>
                      </select>
                    </Campo>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, padding: "18px 20px", border: "1px solid #e1e4ee", borderRadius: 10 }}>
                    <span className="muted">Stock resultante</span>
                    <span style={{ fontFamily: "Poppins, sans-serif", fontSize: 30, fontWeight: 600 }}>
                      {producto.cantidadActual} → <span style={{ color: quedaBajo || insuficiente ? "#8a5a00" : undefined }}>{insuficiente ? "—" : resultante}</span>
                    </span>
                    {quedaBajo && <span className="aviso warn" style={{ padding: "8px 12px" }}>Quedará bajo el mínimo: el sistema avisará al proveedor.</span>}
                    {insuficiente && <span className="aviso error" style={{ padding: "8px 12px" }}>Solo hay {producto.cantidadActual} unidades.</span>}
                  </div>
                  {error && <div className="aviso error">{error}</div>}
                  <div className="actions">
                    <button className="btn alt" type="button" onClick={() => setPaso(1)}>
                      Atrás
                    </button>
                    <button className="btn" type="button" style={{ flex: "1 1 220px" }} disabled={n < 1 || insuficiente} onClick={() => setPaso(3)}>
                      Continuar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flecha">
                    <div>
                      <div className="muted small">Saco</div>
                      <div className="num">{n}</div>
                    </div>
                    <div>
                      <div className="muted small">Stock</div>
                      <div className="num">
                        {producto.cantidadActual} → <span className={quedaBajo ? "num bajo" : ""} style={{ fontSize: "inherit" }}>{resultante}</span>
                      </div>
                    </div>
                  </div>
                  <div className="muted">
                    {MOTIVOS[motivo]}
                    {orden && ` · ${orden}`}
                  </div>
                  {quedaBajo && <div className="aviso warn">Quedará bajo el mínimo ({producto.stockMinimo}): el sistema avisará al proveedor.</div>}
                  <div className="actions">
                    <button className="btn alt" type="button" onClick={() => setPaso(2)}>
                      Atrás
                    </button>
                    <button className="btn" type="button" style={{ flex: "1 1 220px" }} disabled={enviando} onClick={confirmar}>
                      {enviando ? "Registrando…" : "Confirmar salida"}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <Cargando />
          )}
        </div>

        <aside className="card" style={{ gap: 4 }}>
          <h2 style={{ marginBottom: 8 }}>Mis últimas salidas</h2>
          {mias.datos?.length === 0 && <div className="muted small">Aún no registras salidas.</div>}
          {mias.datos?.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid #eef0f5", fontSize: 14 }}>
              <div>
                <strong>{m.producto?.nombre}</strong>
                <div className="muted">
                  {fechaCorta(m.fecha).slice(0, 5)} · {m.documento ?? MOTIVOS[m.motivo]}
                </div>
              </div>
              <div style={{ whiteSpace: "nowrap" }}>
                {m.stockAnterior} → {m.stockResultante}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
