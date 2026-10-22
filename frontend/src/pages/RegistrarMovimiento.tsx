import { useState, type FormEvent } from "react";
import { api, erroresPorCampo } from "../api";
import { useAviso, useDatos } from "../hooks";
import { MOTIVOS } from "../format";
import { Aviso, Campo, Cargando } from "../components/ui";
import type { Movimiento, Producto, TipoMovimiento } from "../types";

const motivosPorTipo: Record<TipoMovimiento, string[]> = {
  ENTRADA: ["COMPRA", "DEVOLUCION", "AJUSTE"],
  SALIDA: ["USO_TALLER", "VENTA", "AJUSTE"],
};

// Facade en la interfaz: un solo botón "Confirmar" registra todo el movimiento
export function RegistrarMovimiento() {
  const productos = useDatos<Producto[]>("/productos");
  const aviso = useAviso();
  const [tipo, setTipo] = useState<TipoMovimiento>("SALIDA");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("USO_TALLER");
  const [documento, setDocumento] = useState("");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const producto = productos.datos?.find((p) => p.id === Number(productoId));
  const n = Math.max(0, Math.floor(Number(cantidad) || 0));
  const resultante = producto ? (tipo === "SALIDA" ? producto.cantidadActual - n : producto.cantidadActual + n) : null;
  const insuficiente = resultante !== null && resultante < 0;
  const quedaBajo = tipo === "SALIDA" && producto && resultante !== null && !insuficiente && resultante < producto.stockMinimo;

  const cambiarTipo = (t: TipoMovimiento) => {
    setTipo(t);
    setMotivo(motivosPorTipo[t][0]);
  };

  const confirmar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    setErrores({});
    try {
      const cuerpo = {
        productoId: Number(productoId),
        cantidad: n,
        motivo,
        documento: documento || null,
        ...(tipo === "ENTRADA" && costoUnitario ? { costoUnitario: Number(costoUnitario) } : {}),
      };
      const m = await api.post<Movimiento>(tipo === "SALIDA" ? "/movimientos/salida" : "/movimientos/entrada", cuerpo);
      aviso.ok(`${tipo === "SALIDA" ? "Salida" : "Entrada"} registrada: ${m.producto?.nombre}, stock ${m.stockAnterior} → ${m.stockResultante}`);
      setCantidad("1");
      setDocumento("");
      setCostoUnitario("");
      productos.recargar();
    } catch (err) {
      setErrores(erroresPorCampo(err));
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div>
        <h1>Registrar entrada o salida</h1>
        <div className="muted sub">Tres pasos. El stock y el movimiento se guardan juntos al confirmar.</div>
      </div>
      {!productos.datos ? (
        <Cargando error={productos.error} />
      ) : (
        <form className="grid" style={{ ["--min" as string]: "360px" }} onSubmit={confirmar} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <fieldset className="card" style={{ margin: 0 }}>
              <legend className="sr-only">Tipo de movimiento</legend>
              <h2 className="titulo-paso">
                <span className="n">1</span>Tipo de movimiento
              </h2>
              <div className="actions">
                {(["ENTRADA", "SALIDA"] as const).map((t) => (
                  <label key={t} className={`opt ${tipo === t ? "on" : ""}`}>
                    <input type="radio" name="tipo" checked={tipo === t} onChange={() => cambiarTipo(t)} />
                    {t === "ENTRADA" ? "Entrada" : "Salida"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="card">
              <h2 className="titulo-paso">
                <span className="n">2</span>Producto y cantidad
              </h2>
              <Campo id="producto" label="Producto" error={errores.productoId}>
                <select id="producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                  <option value="">Elige un producto</option>
                  {productos.datos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} · {p.nombre} — stock {p.cantidadActual}
                    </option>
                  ))}
                </select>
              </Campo>
              <div className="fields">
                <Campo id="cantidad" label="Cantidad" error={errores.cantidad}>
                  <input id="cantidad" type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
                </Campo>
                <Campo id="motivo" label="Motivo" error={errores.motivo}>
                  <select id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                    {motivosPorTipo[tipo].map((m) => (
                      <option key={m} value={m}>
                        {MOTIVOS[m]}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo id="documento" label={tipo === "SALIDA" ? "Orden de trabajo / documento" : "Factura / documento"} error={errores.documento}>
                  <input id="documento" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder={tipo === "SALIDA" ? "OT-0143" : "F001-2400"} />
                </Campo>
                <Campo id="costo" label="Costo unitario (solo entradas)" error={errores.costoUnitario}>
                  <input id="costo" type="number" min="0" step="0.01" placeholder="S/ 0.00" disabled={tipo === "SALIDA"} value={tipo === "SALIDA" ? "" : costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)} />
                </Campo>
              </div>
            </div>
          </div>

          <div className="card" style={{ gap: 20 }}>
            <h2 className="titulo-paso">
              <span className="n">3</span>Confirmar
            </h2>
            {!producto ? (
              <div className="muted">Elige un producto para ver el stock resultante.</div>
            ) : (
              <>
                <div>
                  <div className="muted small">{tipo === "SALIDA" ? "Salida de" : "Entrada de"}</div>
                  <strong style={{ fontSize: 18 }}>
                    {n} × {producto.nombre}
                  </strong>
                  <div className="muted">
                    {MOTIVOS[motivo]}
                    {documento && ` · ${documento}`}
                    {producto.ubicacion && ` · Ubicación ${producto.ubicacion}`}
                  </div>
                </div>
                <div className="flecha">
                  <div>
                    <div className="muted small">Stock actual</div>
                    <div className="num">{producto.cantidadActual}</div>
                  </div>
                  <svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="#1A2B88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12h34M28 4l8 8-8 8" />
                  </svg>
                  <div>
                    <div className="muted small">Stock resultante</div>
                    <div className={`num ${quedaBajo || insuficiente ? "bajo" : ""}`}>{insuficiente ? "—" : resultante}</div>
                  </div>
                </div>
                {insuficiente && <div className="aviso error">Stock insuficiente: solo hay {producto.cantidadActual} unidades.</div>}
                {quedaBajo && (
                  <div className="aviso warn">
                    <strong>Quedará bajo el mínimo ({producto.stockMinimo}).</strong> Al confirmar, el sistema generará una alerta
                    {producto.proveedor ? ` para ${producto.proveedor.nombre}.` : ". Este producto no tiene proveedor asignado."}
                  </div>
                )}
              </>
            )}
            {error && <div className="aviso error">{error}</div>}
            <button className="btn" type="submit" disabled={!producto || n < 1 || insuficiente || enviando}>
              {enviando ? "Registrando…" : tipo === "SALIDA" ? "Confirmar salida" : "Confirmar entrada"}
            </button>
            <div className="muted small">Si no hay stock suficiente no se guarda nada.</div>
          </div>
        </form>
      )}
      <Aviso aviso={aviso.aviso} />
    </>
  );
}
