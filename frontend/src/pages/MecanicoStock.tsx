import { useState } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../hooks";
import { Cargando, EstadoStock } from "../components/ui";
import type { Categoria, Producto } from "../types";

// Consulta de solo lectura: sin precios ni edición (RF-03)
export function MecanicoStock() {
  const productos = useDatos<Producto[]>("/productos");
  const categorias = useDatos<Categoria[]>("/categorias");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | null>(null);

  const lista =
    productos.datos?.filter((p) => (!cat || p.categoria.id === cat) && `${p.codigo} ${p.nombre}`.toLowerCase().includes(q.trim().toLowerCase())) ?? [];

  return (
    <>
      <div>
        <h1>Consultar stock</h1>
        <div className="muted sub">Solo lectura. Elige un repuesto para registrar su salida.</div>
      </div>
      <div className="toolbar">
        <label htmlFor="sq" className="sr-only">
          Buscar repuesto
        </label>
        <input id="sq" className="search" type="search" placeholder="Buscar repuesto por nombre o código" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips" role="group" aria-label="Filtrar por categoría">
          <button type="button" className={`chip ${cat === null ? "on" : ""}`} aria-pressed={cat === null} onClick={() => setCat(null)}>
            Todas
          </button>
          {categorias.datos?.map((c) => (
            <button key={c.id} type="button" className={`chip ${cat === c.id ? "on" : ""}`} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              {c.nombre}
            </button>
          ))}
        </div>
      </div>
      <div className="card flush">
        {!productos.datos ? (
          <div style={{ padding: 16 }}>
            <Cargando error={productos.error} />
          </div>
        ) : lista.length === 0 ? (
          <div className="empty">No se encontraron repuestos.</div>
        ) : (
          <div className="tbl">
            <table style={{ fontSize: 15 }}>
              <thead>
                <tr>
                  <th>Repuesto</th>
                  <th>Categoría</th>
                  <th>Estante</th>
                  <th>Unidades</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.nombre}</strong>
                      <div className="muted small">{p.codigo}</div>
                    </td>
                    <td>{p.categoria.nombre}</td>
                    <td>{p.ubicacion ?? "—"}</td>
                    <td>
                      <strong>{p.cantidadActual}</strong>
                    </td>
                    <td>
                      <EstadoStock cantidad={p.cantidadActual} minimo={p.stockMinimo} mecanico />
                    </td>
                    <td>
                      {p.cantidadActual > 0 && (
                        <Link className="btn alt sm" to={`/mecanico/salida?producto=${p.id}`}>
                          Registrar salida
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
