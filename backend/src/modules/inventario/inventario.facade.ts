import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NoEncontradoError, StockInsuficienteError } from "../../errors";
import { eventos, STOCK_ACTUALIZADO, type StockActualizadoEvento } from "../../events/eventos";

export interface MovimientoDTO {
  productoId: number;
  cantidad: number;
  motivo: string;
  documento?: string | null;
  costoUnitario?: number | null;
}

type Tipo = "ENTRADA" | "SALIDA";

// Facade: registrar un movimiento tiene varios pasos (verificar y actualizar el
// stock, guardar el movimiento y avisar). Los controladores llaman a un solo
// método y todo ocurre en una transacción (RNF-04).
export class InventarioFacade {
  constructor(private readonly db: PrismaClient) {}

  registrarEntrada(dto: MovimientoDTO, usuarioId: number) {
    return this.registrar("ENTRADA", dto, usuarioId);
  }

  registrarSalida(dto: MovimientoDTO, usuarioId: number) {
    return this.registrar("SALIDA", dto, usuarioId);
  }

  private async registrar(tipo: Tipo, dto: MovimientoDTO, usuarioId: number) {
    const movimiento = await this.db.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({ where: { productoId: dto.productoId } });
      if (!stock) throw new NoEncontradoError("Producto");

      if (tipo === "SALIDA") {
        // Descuento condicional: verificar y descontar es una sola operación,
        // así dos salidas simultáneas no pueden dejar el stock negativo.
        const r = await tx.stock.updateMany({
          where: { productoId: dto.productoId, cantidadActual: { gte: dto.cantidad } },
          data: { cantidadActual: { decrement: dto.cantidad } },
        });
        if (r.count === 0) {
          const actual = await tx.stock.findUnique({ where: { productoId: dto.productoId } });
          throw new StockInsuficienteError(actual?.cantidadActual ?? 0);
        }
      } else {
        await tx.stock.update({ where: { productoId: dto.productoId }, data: { cantidadActual: { increment: dto.cantidad } } });
      }

      const { cantidadActual: stockResultante } = await tx.stock.findUniqueOrThrow({ where: { productoId: dto.productoId } });
      const stockAnterior = tipo === "SALIDA" ? stockResultante + dto.cantidad : stockResultante - dto.cantidad;

      return tx.movimiento.create({
        data: {
          productoId: dto.productoId,
          usuarioId,
          tipo,
          motivo: dto.motivo,
          cantidad: dto.cantidad,
          stockAnterior,
          stockResultante,
          costoUnitario: tipo === "ENTRADA" ? (dto.costoUnitario ?? null) : null,
          documento: dto.documento || null,
        },
        include: { producto: { select: { codigo: true, nombre: true, stockMinimo: true } } },
      });
    });

    // Observer: el evento se publica solo después del commit; si la
    // transacción falla, nunca se avisa al proveedor por error.
    const evento: StockActualizadoEvento = { productoId: dto.productoId, movimientoId: movimiento.id, documento: movimiento.documento };
    eventos.emit(STOCK_ACTUALIZADO, evento);
    return movimiento;
  }
}

export const inventario = new InventarioFacade(prisma);
