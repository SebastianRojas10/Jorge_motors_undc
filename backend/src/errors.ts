export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public codigo = "ERROR",
    public detalles?: unknown,
  ) {
    super(message);
  }
}

export class NoEncontradoError extends AppError {
  constructor(recurso: string) {
    super(404, `${recurso} no encontrado`, "NO_ENCONTRADO");
  }
}

export class StockInsuficienteError extends AppError {
  constructor(disponible: number) {
    super(409, `Stock insuficiente: solo hay ${disponible} unidades`, "STOCK_INSUFICIENTE");
  }
}

export class TransicionNoPermitidaError extends AppError {
  constructor(mensaje: string) {
    super(409, mensaje, "TRANSICION_NO_PERMITIDA");
  }
}
