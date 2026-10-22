import { useEffect, useState } from "react";
import { useDatos } from "../hooks";
import { MOTIVOS, fechaHora, hoyLima, soles } from "../format";
import { Cargando } from "../components/ui";
import type { Movimiento, Producto } from "../types";

interface Inventario {
  categorias: { categoria: string; productos: number; unidades: number; valor: number }[];
  detalle: { id: number; codigo: string; nombre: string; categoria: string; unidades: number; stockMinimo: number; precioUnitario: number; valor: number }[];
  totales: { productos: number; unidades: number; valor: number };
}
interface Kardex {
  producto: { codigo: string; nombre: string; stockActual: number };
  movimientos: Movimiento[];
  totales: { entradas: number; salidas: number };
}

// Exportación a Excel como CSV (separador ; y BOM para que Excel lea las tildes)
function descargarCsv(nombre: string, filas: (string | number)[][]) {
  const texto = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export function Reportes() {
  const [pestana, setPestana] = useState<"inventario" | "kardex">("inventario");
  const productos = useDatos<Producto[]>("/productos");
  const [productoId, setProductoId] = useState<number | null>(null);
  const [desde, setDesde] = useState(`${hoyLima().slice(0, 8)}01`);
  const [hasta, setHasta] = useState(hoyLima());

  useEffect(() => {
    if (!productoId && productos.datos?.length) setProductoId(productos.datos[0].id);
  }, [productos.datos, productoId]);

  const inventario = useDatos<Inventario>("/reportes/inventario");
  const kardex = useDatos<Kardex>(productoId ? `/reportes/kardex/${productoId}?desde=${desde}&hasta=${hasta}` : null);

  const exportarExcel = () => {
    if (pestana === "inventario" && inventario.datos) {
      descargarCsv(`inventario-valorizado-${hoyLima()}.csv`, [
        ["Código", "Producto", "Categoría", "Unidades", "Mínimo", "Precio unitario", "Valor"],
        ...inventario.datos.detalle.map((d) => [d.codigo, d.nombre, d.categoria, d.unidades, d.stockMinimo, d.precioUnitario.toFixed(2), d.valor.toFixed(2)]),
        ["", "Total", "", inventario.datos.totales.unidades, "", "", inventario.datos.totales.valor.toFixed(2)],
      ]);
    }
    if (pestana === "kardex" && kardex.datos) {
      descargarCsv(`kardex-${kardex.datos.producto.codigo}-${desde}-a-${hasta}.csv`, [
        ["Fecha", "Tipo", "Motivo", "Documento", "Entrada", "Salida", "Saldo", "Registró"],
        ...kardex.datos.movimientos.map((m) => [fechaHora(m.fecha), m.tipo, MOTIVOS[m.motivo] ?? m.motivo, m.documento ?? "", m.tipo === "ENTRADA" ? m.cantidad : "", m.tipo === "SALIDA" ? m.cantidad : "", m.stockResultante, m.usuario?.nombre ?? ""]),
      ]);
    }
  };

  return (
    <>
      <div className="head">
        <h1>Reportes</h1>
        <div className="actions no-print">
          <button className="btn alt" type="button" onClick={exportarExcel}>
            Exportar a Excel
          </button>
          <button className="btn alt" type="button" onClick={() => window.print()}>
            Exportar a PDF
          </button>
        </div>
      </div>
      <div className="tabs" role="tablist">
        <button className={`tab ${pestana === "inventario" ? "on" : ""}`} type="button" role="tab" aria-selected={pestana === "inventario"} onClick={() => setPestana("inventario")}>
          Inventario valorizado
        </button>
        <button className={`tab ${pestana === "kardex" ? "on" : ""}`} type="button" role="tab" aria-selected={pestana === "kardex"} onClick={() => setPestana("kardex")}>
          Kardex por producto
        </button>
      </div>

      {pestana === "inventario" &&
        (!inventario.datos ? (
          <Cargando error={inventario.error} />
        ) : (
          <div className="grid" style={{ ["--min" as string]: "320px" }}>
            <div className="card">
              <h2>Por categoría</h2>
              <div className="tbl">
                <table>
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th className="r">Unidades</th>
                      <th className="r">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventario.datos.categorias.map((c) => (
                      <tr key={c.categoria}>
                        <td>{c.categoria}</td>
                        <td className="r">{c.unidades}</td>
                        <td className="r">{soles(c.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="r">{inventario.datos.totales.unidades}</td>
                      <td className="r">{soles(inventario.datos.totales.valor)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="card span2">
              <h2>Detalle por producto</h2>
              <div className="tbl">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th className="r">Unidades</th>
                      <th className="r">Precio unit.</th>
                      <th className="r">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventario.datos.detalle.map((d) => (
                      <tr key={d.id}>
                        <td className="code">{d.codigo}</td>
                        <td>{d.nombre}</td>
                        <td>{d.categoria}</td>
                        <td className="r">{d.unidades}</td>
                        <td className="r">{soles(d.precioUnitario)}</td>
                        <td className="r">{soles(d.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

      {pestana === "kardex" && (
        <div className="card">
          <div className="toolbar no-print" style={{ alignItems: "end" }}>
            <div className="field" style={{ flex: "1 1 320px" }}>
              <label htmlFor="kp">Producto</label>
              <select id="kp" value={productoId ?? ""} onChange={(e) => setProductoId(Number(e.target.value))}>
                {productos.datos?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="desde">Desde</label>
              <input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="hasta">Hasta</label>
              <input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
          </div>
          {!kardex.datos ? (
            <Cargando error={kardex.error} />
          ) : (
            <>
              <div>
                <h2>
                  Kardex · {kardex.datos.producto.nombre} ({kardex.datos.producto.codigo})
                </h2>
                <div className="muted small">
                  Del {desde.split("-").reverse().join("/")} al {hasta.split("-").reverse().join("/")} · stock actual {kardex.datos.producto.stockActual}
                </div>
              </div>
              {kardex.datos.movimientos.length === 0 ? (
                <div className="empty">No hay movimientos en este periodo.</div>
              ) : (
                <div className="tbl">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Motivo</th>
                        <th>Documento</th>
                        <th className="r">Entrada</th>
                        <th className="r">Salida</th>
                        <th className="r">Saldo</th>
                        <th>Registró</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kardex.datos.movimientos.map((m) => (
                        <tr key={m.id}>
                          <td>{fechaHora(m.fecha)}</td>
                          <td>
                            <span className={`b ${m.tipo === "ENTRADA" ? "ok" : "gray"}`}>{m.tipo === "ENTRADA" ? "Entrada" : "Salida"}</span>
                          </td>
                          <td>{MOTIVOS[m.motivo] ?? m.motivo}</td>
                          <td>{m.documento ?? "—"}</td>
                          <td className="r">{m.tipo === "ENTRADA" ? m.cantidad : ""}</td>
                          <td className="r">{m.tipo === "SALIDA" ? m.cantidad : ""}</td>
                          <td className="r">
                            <strong>{m.stockResultante}</strong>
                          </td>
                          <td>{m.usuario?.nombre}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4}>Totales del periodo</td>
                        <td className="r">{kardex.datos.totales.entradas}</td>
                        <td className="r">{kardex.datos.totales.salidas}</td>
                        <td className="r">{kardex.datos.movimientos.at(-1)?.stockResultante}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
