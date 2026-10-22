import { TransicionNoPermitidaError } from "../../errors";

export type NombreEstado = "PENDIENTE" | "ENVIADA" | "ATENDIDA";

// State: cada estado decide qué acción permite. La base de datos
// (trigger trg_alerta_transicion) queda como segunda barrera.
export interface EstadoAlerta {
  readonly nombre: NombreEstado;
  enviar(): NombreEstado;
  atender(): NombreEstado;
}

class Pendiente implements EstadoAlerta {
  readonly nombre = "PENDIENTE" as const;
  enviar(): NombreEstado {
    return "ENVIADA";
  }
  atender(): NombreEstado {
    throw new TransicionNoPermitidaError("Primero hay que enviar la alerta al proveedor");
  }
}

class Enviada implements EstadoAlerta {
  readonly nombre = "ENVIADA" as const;
  enviar(): NombreEstado {
    throw new TransicionNoPermitidaError("La alerta ya fue enviada");
  }
  atender(): NombreEstado {
    return "ATENDIDA";
  }
}

class Atendida implements EstadoAlerta {
  readonly nombre = "ATENDIDA" as const;
  enviar(): NombreEstado {
    throw new TransicionNoPermitidaError("La alerta ya fue atendida");
  }
  atender(): NombreEstado {
    throw new TransicionNoPermitidaError("La alerta ya fue atendida");
  }
}

const estados: Record<NombreEstado, EstadoAlerta> = {
  PENDIENTE: new Pendiente(),
  ENVIADA: new Enviada(),
  ATENDIDA: new Atendida(),
};

export function estadoDe(nombre: string): EstadoAlerta {
  return estados[nombre as NombreEstado];
}
