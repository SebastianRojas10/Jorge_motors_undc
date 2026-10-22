import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { inicioDe, useAuth } from "../auth";

export function Login() {
  const { usuario, ingresar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={inicioDe(usuario.rol)} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const u = await ingresar(email, password);
      navigate(inicioDe(u.rol), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login">
      <div className="login-brand">
        <div className="brand" style={{ padding: 0, fontSize: 24 }}>
          JORGE <span>MOTORS</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1>Inventario del taller, siempre al día.</h1>
          <p>Entradas y salidas de repuestos en tiempo real, alertas automáticas al proveedor y kardex por producto.</p>
        </div>
        <div className="small" style={{ color: "#c3c8ea" }}>
          Pueblo Nuevo, Chincha · Ica
        </div>
      </div>
      <div className="login-form">
        <form onSubmit={enviar} noValidate>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h2 style={{ fontSize: 28 }}>Iniciar sesión</h2>
            <p className="muted" style={{ margin: 0 }}>
              Ingresa con tu correo y contraseña del taller.
            </p>
          </div>
          {error && (
            <div className="aviso error" role="alert">
              {error}
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn full" type="submit" disabled={enviando || !email || !password}>
            {enviando ? "Ingresando…" : "Ingresar"}
          </button>
          <p className="muted small" style={{ margin: 0 }}>
            El sistema te lleva a tu vista según tu rol: Administrador o Mecánico.
          </p>
        </form>
      </div>
    </div>
  );
}
