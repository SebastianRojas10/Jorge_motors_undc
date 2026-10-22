import { useState } from "react";
import { api } from "../api";
import { useAviso, useDatos } from "../hooks";
import { CANALES, fechaHora } from "../format";
import { Aviso, Cargando } from "../components/ui";
import type { Alerta, Canal, EstadoAlerta } from "../types";

const columnas: { estado: EstadoAlerta; titulo: string; clase: string }[] = [
  { estado: "PENDIENTE", titulo: "Pendiente", clase: "low" },
  { estado: "ENVIADA", titulo: "Enviada", clase: "ok" },
  { estado: "ATENDIDA", titulo: "Atendida", clase: "gray" },
];

// Observer + Strategy + State: las alertas aparecen solas, se envían por el
// canal del proveedor y cada estado ofrece solo su acción.
export function Alertas() {
  const alertas = useDatos<Alerta[]>("/alertas");
  const aviso = useAviso();
  const [ocupada, setOcupada] = useState<number | null>(null);

  const accion = async (a: Alerta, que: "enviar" | "atender") => {
    setOcupada(a.id);
    try {
      const r = await api.patch<{ envio?: { canal: Canal; destino: string } }>(`/alertas/${a.id}/${que}`);
      aviso.ok(que === "enviar" && r.envio ? `Aviso enviado por ${CANALES[r.envio.canal]} a ${r.envio.destino}` : "Alerta marcada como atendida");
      alertas.recargar();
    } catch (e) {
      aviso.error(e);
    } finally {
      setOcupada(null);
    }
  };

  return (
    <>
      <div>
        <h1>Alertas de bajo stock</h1>
        <div className="muted sub">Se generan solas cuando un producto cae bajo su mínimo. Pendiente → Enviada → Atendida.</div>
      </div>
      {!alertas.datos ? (
        <Cargando error={alertas.error} />
      ) : (
        <div className="grid" style={{ ["--min" as string]: "280px" }}>
          {columnas.map((col) => {
            const lista = alertas.datos!.filter((a) => a.estado === col.estado);
            return (
              <section key={col.estado} className="col" aria-label={col.titulo}>
                <div className="colh">
                  <span>{col.titulo}</span>
                  <span className="cnt">{lista.length}</span>
                </div>
                {lista.length === 0 && <div className="muted small" style={{ padding: "0 4px" }}>Sin alertas.</div>}
                {lista.map((a) => {
                  const canal = a.proveedor?.canalPreferido as Canal | undefined;
                  return (
                    <article key={a.id} className="al">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong style={{ fontSize: 15 }}>{a.producto.nombre}</strong>
                        <span className={`b ${col.clase}`}>{col.titulo}</span>
                      </div>
                      <div>
                        Stock <strong>{a.stockActual}</strong> · mínimo {a.stockMinimo}
                      </div>
                      {a.mensaje && a.estado === "PENDIENTE" && <div className="msg">{a.mensaje}</div>}
                      <div className="muted small">
                        {a.proveedor ? (
                          <>
                            {a.proveedor.nombre} · {canal ? CANALES[canal] : ""} ({canal === "CORREO" ? a.proveedor.email : a.proveedor.telefono})
                          </>
                        ) : (
                          "Sin proveedor asignado"
                        )}
                        <br />
                        Generada {fechaHora(a.fechaGeneracion)}
                        {a.fechaEnvio && ` · Enviada ${fechaHora(a.fechaEnvio)}`}
                      </div>
                      {a.estado === "PENDIENTE" && (
                        <button className="btn full" type="button" disabled={ocupada === a.id || !a.proveedor} onClick={() => accion(a, "enviar")}>
                          {a.proveedor && canal ? `Enviar por ${CANALES[canal]}` : "Asigna un proveedor para enviar"}
                        </button>
                      )}
                      {a.estado === "ENVIADA" && (
                        <button className="btn alt full" type="button" disabled={ocupada === a.id} onClick={() => accion(a, "atender")}>
                          Marcar atendida
                        </button>
                      )}
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
      <Aviso aviso={aviso.aviso} />
    </>
  );
}
