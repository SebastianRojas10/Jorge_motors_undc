import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError, NoEncontradoError } from "../../errors";
import { eventos, STOCK_ACTUALIZADO, type StockActualizadoEvento } from "../../events/eventos";
import { estrategiaPara } from "./canales";
import { estadoDe } from "./estados";

// Observer: Notificaciones se suscribe a STOCK_ACTUALIZADO. Inventario no sabe
// que existe; se pueden sumar otros suscriptores sin tocar el registro de salidas.
export async function evaluarStockMinimo({ productoId, documento }: StockActualizadoEvento) {
  const producto = await prisma.producto.findUnique({ where: { id: productoId }, include: { stock: true } });
  if (!producto?.stock) return null;
  const stockActual = producto.stock.cantidadActual;
  if (stockActual >= producto.stockMinimo) return null;

  const abierta = await prisma.alertaStock.findFirst({ where: { productoId, estado: { not: "ATENDIDA" } } });
  if (abierta) {
    // Sin duplicados: se actualiza la alerta abierta con el stock más reciente
    return prisma.alertaStock.update({ where: { id: abierta.id }, data: { stockActual } });
  }
  try {
    return await prisma.alertaStock.create({
      data: {
        productoId,
        proveedorId: producto.proveedorId,
        stockActual,
        stockMinimo: producto.stockMinimo,
        mensaje: `El stock bajó a ${stockActual} unidades${documento ? ` tras el movimiento ${documento}` : ""}.`,
      },
    });
  } catch (e) {
    // Otra petición creó la alerta al mismo tiempo (índice único parcial)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null;
    throw e;
  }
}

export function suscribirNotificadorStock() {
  eventos.on(STOCK_ACTUALIZADO, (evento: StockActualizadoEvento) => {
    evaluarStockMinimo(evento).catch((e) => console.error("No se pudo evaluar el stock mínimo", e));
  });
}

// Strategy + State: envía por el canal del proveedor y avanza el estado
export async function enviarAlerta(id: number) {
  const alerta = await prisma.alertaStock.findUnique({ where: { id }, include: { proveedor: true, producto: true } });
  if (!alerta) throw new NoEncontradoError("Alerta");
  const siguiente = estadoDe(alerta.estado).enviar();
  if (!alerta.proveedor) throw new AppError(409, "El producto no tiene proveedor: asígnale uno antes de enviar", "SIN_PROVEEDOR");

  const envio = await estrategiaPara(alerta.proveedor.canalPreferido).enviar({ alerta, producto: alerta.producto, proveedor: alerta.proveedor });
  const actualizada = await prisma.alertaStock.update({ where: { id }, data: { estado: siguiente, fechaEnvio: new Date() } });
  return { alerta: actualizada, envio };
}

export async function atenderAlerta(id: number) {
  const alerta = await prisma.alertaStock.findUnique({ where: { id } });
  if (!alerta) throw new NoEncontradoError("Alerta");
  const siguiente = estadoDe(alerta.estado).atender();
  return prisma.alertaStock.update({ where: { id }, data: { estado: siguiente } });
}
