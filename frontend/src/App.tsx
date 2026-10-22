import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, inicioDe, useAuth } from "./auth";
import { Layout } from "./components/Layout";
import type { Rol } from "./types";
import { Login } from "./pages/Login";
import { Panel } from "./pages/Panel";
import { Productos } from "./pages/Productos";
import { RegistrarMovimiento } from "./pages/RegistrarMovimiento";
import { Alertas } from "./pages/Alertas";
import { Reportes } from "./pages/Reportes";
import { Proveedores } from "./pages/Proveedores";
import { Usuarios } from "./pages/Usuarios";
import { MecanicoSalida } from "./pages/MecanicoSalida";
import { MecanicoStock } from "./pages/MecanicoStock";

// RF-02: cada rol entra a su propia vista; las rutas del otro rol lo devuelven a la suya
function Protegida({ rol }: { rol: Rol }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== rol) return <Navigate to={inicioDe(usuario.rol)} replace />;
  return <Layout />;
}

function Inicio() {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  return <Navigate to={usuario ? inicioDe(usuario.rol) : "/login"} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protegida rol="ADMINISTRADOR" />}>
            <Route path="/panel" element={<Panel />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/movimientos/nuevo" element={<RegistrarMovimiento />} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
          <Route element={<Protegida rol="MECANICO" />}>
            <Route path="/mecanico/salida" element={<MecanicoSalida />} />
            <Route path="/mecanico/stock" element={<MecanicoStock />} />
          </Route>
          <Route path="*" element={<Inicio />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
