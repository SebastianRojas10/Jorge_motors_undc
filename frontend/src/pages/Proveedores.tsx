import { useState, type FormEvent } from "react";
import { api, erroresPorCampo } from "../api";
import { useAviso, useDatos } from "../hooks";
import { CANALES } from "../format";
import { Aviso, Campo, Cargando } from "../components/ui";
import type { Canal, Proveedor } from "../types";

const vacio = { nombre: "", contacto: "", email: "", telefono: "", canalPreferido: "CORREO" as Canal };
const claseCanal: Record<Canal, string> = { CORREO: "ok", WHATSAPP: "low", SMS: "gray" };

// Strategy (RF-07): al elegir el canal, el formulario marca como obligatorio el dato que necesita
export function Proveedores() {
  const proveedores = useDatos<Proveedor[]>("/proveedores");
  const aviso = useAviso();
  const [sel, setSel] = useState<Proveedor | null>(null);
  const [f, setF] = useState(vacio);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const editar = (p: Proveedor | null) => {
    setSel(p);
    setErrores({});
    setF(p ? { nombre: p.nombre, contacto: p.contacto ?? "", email: p.email ?? "", telefono: p.telefono ?? "", canalPreferido: p.canalPreferido } : vacio);
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    try {
      if (sel) await api.put(`/proveedores/${sel.id}`, f);
      else await api.post("/proveedores", f);
      aviso.ok(sel ? "Proveedor actualizado" : "Proveedor registrado");
      editar(null);
      proveedores.recargar();
    } catch (err) {
      setErrores(erroresPorCampo(err));
      aviso.error(err);
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async () => {
    if (!sel || !confirm(`¿Eliminar a ${sel.nombre}? Sus productos quedarán sin proveedor.`)) return;
    try {
      await api.del(`/proveedores/${sel.id}`);
      aviso.ok("Proveedor eliminado");
      editar(null);
      proveedores.recargar();
    } catch (err) {
      aviso.error(err);
    }
  };

  const correoObligatorio = f.canalPreferido === "CORREO";

  return (
    <>
      <div className="head">
        <div>
          <h1>Proveedores</h1>
          <div className="muted sub">Reciben las alertas de bajo stock por su canal de aviso.</div>
        </div>
        <button className="btn" type="button" onClick={() => editar(null)}>
          + Nuevo proveedor
        </button>
      </div>
      <div className="grid" style={{ ["--min" as string]: "340px" }}>
        <div className="card flush span2">
          {!proveedores.datos ? (
            <div style={{ padding: 16 }}>
              <Cargando error={proveedores.error} />
            </div>
          ) : (
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Contacto</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                    <th>Canal de aviso</th>
                    <th className="r">Productos</th>
                    <th>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {proveedores.datos.map((p) => (
                    <tr key={p.id} className={sel?.id === p.id ? "sel" : ""}>
                      <td>
                        <strong>{p.nombre}</strong>
                      </td>
                      <td>{p.contacto ?? "—"}</td>
                      <td className={p.email ? "" : "muted"}>{p.email ?? "—"}</td>
                      <td className={p.telefono ? "" : "muted"}>{p.telefono ?? "—"}</td>
                      <td>
                        <span className={`b ${claseCanal[p.canalPreferido]}`}>{CANALES[p.canalPreferido]}</span>
                      </td>
                      <td className="r">{p._count?.productos ?? 0}</td>
                      <td>
                        <button className="link" type="button" onClick={() => editar(p)}>
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
        <form className="card" onSubmit={guardar} noValidate>
          <h2>{sel ? "Editar proveedor" : "Nuevo proveedor"}</h2>
          <Campo id="pn" label="Nombre" error={errores.nombre}>
            <input id="pn" value={f.nombre} onChange={set("nombre")} />
          </Campo>
          <Campo id="pc" label="Contacto (opcional)">
            <input id="pc" value={f.contacto} onChange={set("contacto")} />
          </Campo>
          <Campo id="pa" label="Canal de aviso" error={errores.canalPreferido}>
            <select id="pa" value={f.canalPreferido} onChange={set("canalPreferido")}>
              {(Object.keys(CANALES) as Canal[]).map((c) => (
                <option key={c} value={c}>
                  {CANALES[c]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="pe" label="Correo" req={correoObligatorio ? "Obligatorio para Correo" : undefined} error={errores.email}>
            <input id="pe" type="email" value={f.email} onChange={set("email")} placeholder={correoObligatorio ? "" : "opcional"} aria-required={correoObligatorio} />
          </Campo>
          <Campo id="pt" label="Teléfono" req={!correoObligatorio ? `Obligatorio para ${CANALES[f.canalPreferido]}` : undefined} error={errores.telefono}>
            <input id="pt" type="tel" value={f.telefono} onChange={set("telefono")} placeholder={!correoObligatorio ? "" : "opcional"} aria-required={!correoObligatorio} />
          </Campo>
          <div className="actions">
            <button className="btn" type="submit" disabled={enviando} style={{ flex: "1 1 140px" }}>
              {enviando ? "Guardando…" : "Guardar"}
            </button>
            {sel && (
              <>
                <button className="btn alt" type="button" onClick={() => editar(null)}>
                  Cancelar
                </button>
                <button className="btn danger" type="button" onClick={eliminar}>
                  Eliminar
                </button>
              </>
            )}
          </div>
        </form>
      </div>
      <Aviso aviso={aviso.aviso} />
    </>
  );
}
