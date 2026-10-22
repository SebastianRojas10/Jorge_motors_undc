import { useState, type FormEvent } from "react";
import { api, erroresPorCampo } from "../api";
import { useAviso, useDatos } from "../hooks";
import { ROLES } from "../format";
import { useAuth } from "../auth";
import { Aviso, Campo, Cargando, Modal } from "../components/ui";
import type { Rol, UsuarioFila } from "../types";

// La misma matriz que aplica el filtro de roles de la API (permitirRol)
const permisos: [string, boolean, boolean][] = [
  ["Registrar salidas", true, true],
  ["Consultar stock", true, true],
  ["Registrar entradas", true, false],
  ["Gestionar productos y categorías", true, false],
  ["Gestionar proveedores", true, false],
  ["Ver precios y reportes", true, false],
  ["Enviar y atender alertas", true, false],
  ["Gestionar usuarios", true, false],
];

export function Usuarios() {
  const usuarios = useDatos<UsuarioFila[]>("/usuarios");
  const aviso = useAviso();
  const [editando, setEditando] = useState<UsuarioFila | "nuevo" | null>(null);

  return (
    <>
      <div className="head">
        <h1>Usuarios y roles</h1>
        <button className="btn" type="button" onClick={() => setEditando("nuevo")}>
          + Nuevo usuario
        </button>
      </div>
      <div className="card flush">
        {!usuarios.datos ? (
          <div style={{ padding: 16 }}>
            <Cargando error={usuarios.error} />
          </div>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th className="r">Movimientos</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuarios.datos.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.nombre}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`b ${u.rol === "ADMINISTRADOR" ? "ok" : "low"}`}>{ROLES[u.rol]}</span>
                    </td>
                    <td className="r">{u._count.movimientos}</td>
                    <td>{u.activo ? "Activo" : <span className="b gray">Inactivo</span>}</td>
                    <td>
                      <button className="link" type="button" onClick={() => setEditando(u)}>
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
      <div className="card">
        <h2>Matriz de permisos</h2>
        <div className="muted small">La API rechaza (403) cualquier acción que el rol no tenga permitida.</div>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Acción</th>
                <th className="c">Administrador</th>
                <th className="c">Mecánico</th>
              </tr>
            </thead>
            <tbody>
              {permisos.map(([accion, admin, mec]) => (
                <tr key={accion}>
                  <td>{accion}</td>
                  <td className="c" style={{ fontWeight: 700, color: "#1a2b88" }}>
                    {admin ? "Sí" : "No"}
                  </td>
                  <td className="c" style={mec ? { fontWeight: 700, color: "#1a2b88" } : { color: "#5a6072" }}>
                    {mec ? "Sí" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editando && (
        <UsuarioForm
          usuario={editando === "nuevo" ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(t) => {
            setEditando(null);
            aviso.ok(t);
            usuarios.recargar();
          }}
        />
      )}
      <Aviso aviso={aviso.aviso} />
    </>
  );
}

function UsuarioForm({ usuario, onCerrar, onGuardado }: { usuario: UsuarioFila | null; onCerrar: () => void; onGuardado: (t: string) => void }) {
  const { usuario: yo } = useAuth();
  const [f, setF] = useState({ nombre: usuario?.nombre ?? "", email: usuario?.email ?? "", password: "", rol: (usuario?.rol ?? "MECANICO") as Rol, activo: usuario?.activo ?? true });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const soyYo = usuario?.id === yo?.id;

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (usuario) await api.put(`/usuarios/${usuario.id}`, f);
      else await api.post("/usuarios", f);
      onGuardado(usuario ? "Usuario actualizado" : "Usuario creado");
    } catch (err) {
      setErrores(erroresPorCampo(err));
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal titulo={usuario ? "Editar usuario" : "Nuevo usuario"} onCerrar={onCerrar}>
      <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 16 }} noValidate>
        {error && <div className="aviso error">{error}</div>}
        <Campo id="un" label="Nombre" error={errores.nombre}>
          <input id="un" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        </Campo>
        <Campo id="ue" label="Correo" error={errores.email}>
          <input id="ue" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Campo>
        <Campo id="up" label={usuario ? "Nueva contraseña (déjala vacía para no cambiarla)" : "Contraseña"} error={errores.password}>
          <input id="up" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Campo>
        <div className="fields">
          <Campo id="ur" label="Rol" error={errores.rol}>
            <select id="ur" value={f.rol} disabled={soyYo} onChange={(e) => setF({ ...f, rol: e.target.value as Rol })}>
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="MECANICO">Mecánico</option>
            </select>
          </Campo>
          <Campo id="ua" label="Estado">
            <select id="ua" value={f.activo ? "1" : "0"} disabled={soyYo} onChange={(e) => setF({ ...f, activo: e.target.value === "1" })}>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </Campo>
        </div>
        <div className="actions">
          <button className="btn" type="submit" style={{ flex: "1 1 160px" }}>
            Guardar
          </button>
          <button className="btn alt" type="button" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
