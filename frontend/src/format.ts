import type { Canal } from "./types";

// La base guarda UTC; la interfaz muestra la hora de Lima
const zona = { timeZone: "America/Lima" } as const;

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { ...zona, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

export const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { ...zona, day: "2-digit", month: "2-digit", year: "numeric" });

export const hoyLima = () => new Date().toLocaleDateString("en-CA", zona);

export const soles = (n: number) =>
  "S/ " + n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const MOTIVOS: Record<string, string> = {
  COMPRA: "Compra",
  DEVOLUCION: "Devolución",
  AJUSTE: "Ajuste",
  USO_TALLER: "Uso en taller",
  VENTA: "Venta",
};

export const CANALES: Record<Canal, string> = { CORREO: "Correo", SMS: "SMS", WHATSAPP: "WhatsApp" };

export const ROLES = { ADMINISTRADOR: "Administrador", MECANICO: "Mecánico" } as const;
