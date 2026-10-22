import type { AlertaStock, Producto, Proveedor } from "@prisma/client";
import { AppError } from "../../errors";

export type Canal = "CORREO" | "SMS" | "WHATSAPP";

export interface AvisoReabastecimiento {
  alerta: AlertaStock;
  producto: Pick<Producto, "codigo" | "nombre">;
  proveedor: Proveedor;
}

export interface ResultadoEnvio {
  canal: Canal;
  destino: string;
  texto: string;
}

// Strategy: las tres formas de avisar implementan la misma interfaz y se
// intercambian sin tocar el notificador. Sumar Telegram sería una clase nueva.
export interface CanalNotificacion {
  enviar(aviso: AvisoReabastecimiento): Promise<ResultadoEnvio>;
}

function textoDelAviso({ alerta, producto }: AvisoReabastecimiento) {
  return `Jorge Motors solicita reposición de ${producto.nombre} (${producto.codigo}): quedan ${alerta.stockActual} unidades, mínimo ${alerta.stockMinimo}.`;
}

// Los envíos se registran en la consola del servidor. Para enviar de verdad,
// cada estrategia se conecta a su servicio (SMTP, proveedor de SMS o la API de
// WhatsApp Business) sin cambiar nada más.
export class CorreoStrategy implements CanalNotificacion {
  async enviar(aviso: AvisoReabastecimiento): Promise<ResultadoEnvio> {
    if (!aviso.proveedor.email) throw new AppError(409, "El proveedor no tiene correo registrado", "SIN_CONTACTO");
    const texto = textoDelAviso(aviso);
    console.log(`[correo] Para: ${aviso.proveedor.email} · Asunto: Reposición de stock · ${texto}`);
    return { canal: "CORREO", destino: aviso.proveedor.email, texto };
  }
}

export class SmsStrategy implements CanalNotificacion {
  async enviar(aviso: AvisoReabastecimiento): Promise<ResultadoEnvio> {
    if (!aviso.proveedor.telefono) throw new AppError(409, "El proveedor no tiene teléfono registrado", "SIN_CONTACTO");
    const texto = textoDelAviso(aviso);
    console.log(`[sms] Para: ${aviso.proveedor.telefono} · ${texto}`);
    return { canal: "SMS", destino: aviso.proveedor.telefono, texto };
  }
}

export class WhatsAppStrategy implements CanalNotificacion {
  async enviar(aviso: AvisoReabastecimiento): Promise<ResultadoEnvio> {
    if (!aviso.proveedor.telefono) throw new AppError(409, "El proveedor no tiene teléfono registrado", "SIN_CONTACTO");
    const texto = textoDelAviso(aviso);
    console.log(`[whatsapp] Para: ${aviso.proveedor.telefono} · ${texto}`);
    return { canal: "WHATSAPP", destino: aviso.proveedor.telefono, texto };
  }
}

const estrategias: Record<Canal, CanalNotificacion> = {
  CORREO: new CorreoStrategy(),
  SMS: new SmsStrategy(),
  WHATSAPP: new WhatsAppStrategy(),
};

export function estrategiaPara(canal: string): CanalNotificacion {
  const estrategia = estrategias[canal as Canal];
  if (!estrategia) throw new AppError(409, `Canal de aviso desconocido: ${canal}`, "CANAL_INVALIDO");
  return estrategia;
}
