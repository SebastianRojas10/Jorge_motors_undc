import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ROLES } from "../format";

const menuAdmin = [
  { a: "/panel", texto: "Panel" },
  { a: "/productos", texto: "Productos y stock" },
  { a: "/movimientos/nuevo", texto: "Registrar movimiento" },
  { a: "/alertas", texto: "Alertas" },
  { a: "/reportes", texto: "Reportes" },
  { a: "/proveedores", texto: "Proveedores" },
  { a: "/usuarios", texto: "Usuarios y roles" },
];

// RF-03: el mecánico solo ve sus dos opciones
const menuMecanico = [
  { a: "/mecanico/salida", texto: "Registrar salida" },
  { a: "/mecanico/stock", texto: "Consultar stock" },
];

export function Layout() {
  const { usuario, salir } = useAuth();
  const navigate = useNavigate();
  const menu = usuario?.rol === "ADMINISTRADOR" ? menuAdmin : menuMecanico;

  return (
    <div className="app">
      <nav className="side" aria-label="Menú principal">
        <div className="brand">
          JORGE <span>MOTORS</span>
        </div>
        <div className="nav">
          {menu.map((m) => (
            <NavLink key={m.a} to={m.a}>
              {m.texto}
            </NavLink>
          ))}
        </div>
        {usuario && (
          <div className="who">
            <strong>{usuario.nombre}</strong>
            <span className="rol">{ROLES[usuario.rol]}</span>
            <button
              type="button"
              onClick={() => {
                salir();
                navigate("/login");
              }}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
