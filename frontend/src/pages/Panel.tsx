import { Link } from "react-router-dom";
import { useDatos } from "../hooks";
import { fechaHora, soles } from "../format";
import { Cargando } from "../components/ui";
import type { Alerta, Movimiento } from "../types";

interface Resumen {
  totales: { productos: number; unidades: number; valor: number; bajoMinimo: number };
  categorias: { categoria: string; unidades: number }[];
  alertas: Alerta[];
  movimientos: Movimiento[];
}

export function Panel() {
  const { datos, error } = useDatos<Resumen>("/reportes/resumen");
  const hoy = new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });

  return (
    <>
      <div className="head">
        <div>
          <h1>Panel</h1>
          <div className="muted sub">Resumen del estado del taller · hoy {hoy}</div>
        </div>
        <Link className="btn acc" to="/movimientos/nuevo">
          + Registrar movimiento
        </Link>
      </div>
      {!datos ? (
        <Cargando error={error} />
      ) : (
        <>
          <div className="grid" style={{ ["--min" as string]: "200px" }}>
            <div className="card kpi">
              <div className="muted small">Productos activos</div>
              <div className="valor">{datos.totales.productos}</div>
            </div>
            <div className="card kpi">
              <div className="muted small">Unidades en almacén</div>
              <div className="valor">{datos.totales.unidades}</div>
            </div>
            <div className={`card kpi ${datos.totales.bajoMinimo ? "alerta" : ""}`}>
              <div className="muted small">Bajo el mínimo</div>
              <div className="valor">{datos.totales.bajoMinimo}</div>
            </div>
            <div className="card kpi">
              <div className="muted small">Valor del inventario</div>
              <div className="valor">{soles(datos.totales.valor)}</div>
            </div>
          </div>

          <div className="grid" style={{ ["--min" as string]: "340px" }}>
            <div className="card">
              <h2>Unidades por categoría</h2>
              {[...datos.categorias]
                .sort((a, b) => b.unidades - a.unidades)
                .map((c, _, lista) => (
                  <div key={c.categoria} style={{ fontSize: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{c.categoria}</span>
                      <strong>{c.unidades}</strong>
                    </div>
                    <div className="bar wide" aria-hidden="true">
                      <i style={{ width: `${(c.unidades / Math.max(1, lista[0].unidades)) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </div>
            <div className="card">
              <div className="head">
                <h2>Alertas abiertas</h2>
                <Link to="/alertas" className="small">
                  Ver tablero
                </Link>
              </div>
              {datos.alertas.length === 0 && <div className="muted">No hay productos bajo el mínimo.</div>}
              {datos.alertas.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid #eef0f5" }}>
                  <div>
                    <strong>{a.producto.nombre}</strong>
                    <div className="muted small">
                      Stock {a.stockActual} · mínimo {a.stockMinimo} · {a.proveedor?.nombre ?? "Sin proveedor"}
                    </div>
                  </div>
                  <span className={`b ${a.estado === "PENDIENTE" ? "low" : "ok"}`}>{a.estado === "PENDIENTE" ? "Pendiente" : "Enviada"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Últimos movimientos</h2>
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Stock</th>
                    <th>Documento</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.movimientos.map((m) => (
                    <tr key={m.id}>
                      <td>{fechaHora(m.fecha)}</td>
                      <td>{m.producto?.nombre}</td>
                      <td>
                        <span className={`b ${m.tipo === "ENTRADA" ? "ok" : "gray"}`}>{m.tipo === "ENTRADA" ? "Entrada" : "Salida"}</span>
                      </td>
                      <td>{m.cantidad}</td>
                      <td>
                        {m.stockAnterior} → {m.stockResultante}
                      </td>
                      <td>{m.documento ?? "—"}</td>
                      <td>{m.usuario?.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
