import { EventEmitter } from "node:events";

// Observer: Inventario publica eventos y no conoce a sus suscriptores.
export const STOCK_ACTUALIZADO = "STOCK_ACTUALIZADO";

export interface StockActualizadoEvento {
  productoId: number;
  movimientoId: number;
  documento?: string | null;
}

export const eventos = new EventEmitter();
