import { useEffect, useState, type FormEvent } from "react";
import { api, erroresPorCampo } from "../api";
import { useAviso, useDatos } from "../hooks";
import { soles } from "../format";
import { Aviso, Barra, Campo, Cargando, EstadoStock, Modal } from "../components/ui";
import type { Categoria, Producto, Proveedor } from "../types";

export function Productos() {
  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [editando, setEditando] = useState<Producto | "nuevo" | null>(null);
  const [verCategorias, setVerCategorias] = useState(false);
  const aviso = useAviso();

  // Búsqueda por código o nombre con una pequeña espera al escribir
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams();
  if (busqueda) params.set("q", busqueda);
  if (categoriaId) params.set("categoriaId", String(categoriaId));
  const productos = useDatos<Producto[]>(`/productos?${params}`);
  const categorias = useDatos<Categoria[]>("/categorias");
  const proveedores = useDatos<Proveedor[]>("/proveedores");

  const bajos = productos.datos?.filter((p) => p.bajoMinimo).length ?? 0;

  return (
    <>
      <div className="head">
        <div>
          <h1>Productos y stock</h1>
          <div className="muted sub">
            {productos.datos ? `${productos.datos.length} productos · ${bajos} bajo el mínimo` : " "}
          </div>
        </div>
        <div className="actions">
          <button className="btn alt" type="button" onClick={() => setVerCategorias(true)}>
            Categorías
          </button>
          <button className="btn" type="button" onClick={() => setEditando("nuevo")}>
            + Nuevo producto
          </button>
        </div>
      </div>

      <div className="toolbar">
        <label htmlFor="q" className="sr-only">
          Buscar producto
        </label>
        <input id="q" className="search" type="search" placeholder="Buscar por código o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips" role="group" aria-label="Filtrar por categoría">
          <button type="button" className={`chip ${categoriaId === null ? "on" : ""}`} aria-pressed={categoriaId === null} onClick={() => setCategoriaId(null)}>
            Todas
          </button>
          {categorias.datos?.map((c) => (
            <button key={c.id} type="button" className={`chip ${categoriaId === c.id ? "on" : ""}`} aria-pressed={categoriaId === c.id} onClick={() => setCategoriaId(c.id)}>
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
        ) : productos.datos.length === 0 ? (
          <div className="empty">No se encontraron productos.</div>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Ubicación</th>
                  <th>Proveedor</th>
                  <th className="r">Precio unit.</th>
                  <th>Stock / mínimo</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {productos.datos.map((p) => (
                  <tr key={p.id}>
                    <td className="code">{p.codigo}</td>
                    <td>
                      <strong>{p.nombre}</strong>
                    </td>
                    <td>{p.categoria.nombre}</td>
                    <td>{p.ubicacion ?? "—"}</td>
                    <td className={p.proveedor ? "" : "muted"}>{p.proveedor?.nombre ?? "Sin proveedor"}</td>
                    <td className="r">{soles(p.precioUnitario ?? 0)}</td>
                    <td>
                      {p.cantidadActual} / {p.stockMinimo}
                      <Barra cantidad={p.cantidadActual} minimo={p.stockMinimo} />
                    </td>
                    <td>
                      <EstadoStock cantidad={p.cantidadActual} minimo={p.stockMinimo} />
                    </td>
                    <td>
                      <button className="link" type="button" onClick={() => setEditando(p)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando && categorias.datos && (
        <ProductoForm
          producto={editando === "nuevo" ? null : editando}
          categorias={categorias.datos}
          proveedores={proveedores.datos ?? []}
          onCerrar={() => setEditando(null)}
          onGuardado={(texto) => {
            setEditando(null);
            aviso.ok(texto);
            productos.recargar();
          }}
        />
      )}
      {verCategorias && (
        <CategoriasModal
          categorias={categorias.datos ?? []}
          onCerrar={() => setVerCategorias(false)}
          onCambio={() => {
            categorias.recargar();
            productos.recargar();
          }}
        />
      )}
      <Aviso aviso={aviso.aviso} />
    </>
  );
}

function ProductoForm({
  producto,
  categorias,
  proveedores,
  onCerrar,
  onGuardado,
}: {
  producto: Producto | null;
  categorias: Categoria[];
  proveedores: Proveedor[];
  onCerrar: () => void;
  onGuardado: (texto: string) => void;
}) {
  const [f, setF] = useState({
    codigo: producto?.codigo ?? "",
    nombre: producto?.nombre ?? "",
    descripcion: producto?.descripcion ?? "",
    ubicacion: producto?.ubicacion ?? "",
    precioUnitario: String(producto?.precioUnitario ?? ""),
    stockMinimo: String(producto?.stockMinimo ?? ""),
    categoriaId: String(producto?.categoria.id ?? ""),
    proveedorId: String(producto?.proveedor?.id ?? ""),
    stockInicial: "0",
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const cuerpo = {
      ...f,
      proveedorId: f.proveedorId ? Number(f.proveedorId) : null,
      descripcion: f.descripcion || null,
      ubicacion: f.ubicacion || null,
      ...(producto ? { stockInicial: undefined } : {}),
    };
    try {
      if (producto) await api.put(`/productos/${producto.id}`, cuerpo);
      else await api.post("/productos", cuerpo);
      onGuardado(producto ? "Producto actualizado" : "Producto registrado");
    } catch (err) {
      setErrores(erroresPorCampo(err));
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async () => {
    if (!producto || !confirm(`¿Eliminar ${producto.nombre}? Solo es posible si no tiene movimientos.`)) return;
    try {
      await api.del(`/productos/${producto.id}`);
      onGuardado("Producto eliminado");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal titulo={producto ? "Editar producto" : "Nuevo producto"} onCerrar={onCerrar}>
      <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 16 }} noValidate>
        {error && <div className="aviso error">{error}</div>}
        <div className="fields">
          <Campo id="codigo" label="Código" error={errores.codigo}>
            <input id="codigo" value={f.codigo} onChange={set("codigo")} placeholder="LUB-0004" />
          </Campo>
          <Campo id="ubicacion" label="Ubicación" error={errores.ubicacion}>
            <input id="ubicacion" value={f.ubicacion} onChange={set("ubicacion")} placeholder="A-01" />
          </Campo>
        </div>
        <Campo id="nombre" label="Nombre" error={errores.nombre}>
          <input id="nombre" value={f.nombre} onChange={set("nombre")} />
        </Campo>
        <Campo id="descripcion" label="Descripción (opcional)">
          <textarea id="descripcion" value={f.descripcion} onChange={set("descripcion")} />
        </Campo>
        <div className="fields">
          <Campo id="categoriaId" label="Categoría" error={errores.categoriaId}>
            <select id="categoriaId" value={f.categoriaId} onChange={set("categoriaId")}>
              <option value="">Elige una categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="proveedorId" label="Proveedor (opcional)">
            <select id="proveedorId" value={f.proveedorId} onChange={set("proveedorId")}>
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="precioUnitario" label="Precio unitario (S/)" error={errores.precioUnitario}>
            <input id="precioUnitario" type="number" min="0" step="0.01" value={f.precioUnitario} onChange={set("precioUnitario")} />
          </Campo>
          <Campo id="stockMinimo" label="Stock mínimo" error={errores.stockMinimo}>
            <input id="stockMinimo" type="number" min="0" value={f.stockMinimo} onChange={set("stockMinimo")} />
          </Campo>
          {!producto && (
            <Campo id="stockInicial" label="Stock inicial" error={errores.stockInicial}>
              <input id="stockInicial" type="number" min="0" value={f.stockInicial} onChange={set("stockInicial")} />
            </Campo>
          )}
        </div>
        {producto && <div className="muted small">El stock cambia solo con entradas y salidas. Stock actual: {producto.cantidadActual}.</div>}
        <div className="actions">
          <button className="btn" type="submit" disabled={enviando} style={{ flex: "1 1 160px" }}>
            {enviando ? "Guardando…" : "Guardar"}
          </button>
          <button className="btn alt" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          {producto && (
            <button className="btn danger" type="button" onClick={eliminar}>
              Eliminar
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function CategoriasModal({ categorias, onCerrar, onCambio }: { categorias: Categoria[]; onCerrar: () => void; onCambio: () => void }) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const cuerpo = { nombre, descripcion: descripcion || null };
      if (editId) await api.put(`/categorias/${editId}`, cuerpo);
      else await api.post("/categorias", cuerpo);
      setNombre("");
      setDescripcion("");
      setEditId(null);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const eliminar = async (c: Categoria) => {
    if (!confirm(`¿Eliminar la categoría ${c.nombre}?`)) return;
    try {
      await api.del(`/categorias/${c.id}`);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal titulo="Categorías" onCerrar={onCerrar}>
      {error && <div className="aviso error">{error}</div>}
      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th className="r">Productos</th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id} className={editId === c.id ? "sel" : ""}>
                <td>
                  <strong>{c.nombre}</strong>
                  {c.descripcion && <div className="muted small">{c.descripcion}</div>}
                </td>
                <td className="r">{c._count?.productos ?? 0}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    className="link"
                    type="button"
                    onClick={() => {
                      setEditId(c.id);
                      setNombre(c.nombre);
                      setDescripcion(c.descripcion ?? "");
                    }}
                  >
                    Editar
                  </button>
                  {(c._count?.productos ?? 0) === 0 && (
                    <button className="link" type="button" onClick={() => eliminar(c)}>
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontSize: 15 }}>{editId ? "Editar categoría" : "Nueva categoría"}</h3>
        <Campo id="cat-nombre" label="Nombre">
          <input id="cat-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo id="cat-desc" label="Descripción (opcional)">
          <input id="cat-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </Campo>
        <div className="actions">
          <button className="btn" type="submit" disabled={!nombre.trim()}>
            {editId ? "Guardar cambios" : "Agregar categoría"}
          </button>
          {editId && (
            <button
              className="btn alt"
              type="button"
              onClick={() => {
                setEditId(null);
                setNombre("");
                setDescripcion("");
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
