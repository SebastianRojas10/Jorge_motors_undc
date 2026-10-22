export type Rol = "ADMINISTRADOR" | "MECANICO";
export type Canal = "CORREO" | "SMS" | "WHATSAPP";
export type EstadoAlerta = "PENDIENTE" | "ENVIADA" | "ATENDIDA";
export type TipoMovimiento = "ENTRADA" | "SALIDA";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface UsuarioFila extends Usuario {
  activo: boolean;
  _count: { movimientos: number };
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  _count?: { productos: number };
}

export interface Proveedor {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  contacto: string | null;
  canalPreferido: Canal;
  _count?: { productos: number };
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  ubicacion: string | null;
  stockMinimo: number;
  categoria: { id: number; nombre: string };
  cantidadActual: number;
  bajoMinimo: boolean;
  // Solo para el administrador
  precioUnitario?: number;
  proveedor?: { id: number; nombre: string } | null;
}

export interface Movimiento {
  id: number;
  productoId: number;
  tipo: TipoMovimiento;
  motivo: string;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  costoUnitario: number | null;
  documento: string | null;
  fecha: string;
  producto?: { codigo?: string; nombre: string; stockMinimo?: number };
  usuario?: { nombre: string };
}

export interface Alerta {
  id: number;
  productoId: number;
  stockActual: number;
  stockMinimo: number;
  estado: EstadoAlerta;
  mensaje: string | null;
  fechaGeneracion: string;
  fechaEnvio: string | null;
  producto: { id?: number; codigo?: string; nombre: string };
  proveedor: (Partial<Proveedor> & { nombre: string }) | null;
}
