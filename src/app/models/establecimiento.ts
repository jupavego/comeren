export interface Producto {
  nombre: string;
  descripcion: string;
  precio: string;
  imagen: string;
}

export interface Establecimiento {
  id: number;
  nombre: string;
  descripcion: string;
  direccion: string;
  zona: string;
  telefono: string;
  horario: string;
  categoria: string;
  imagen: string;
  activo: boolean;

  facebook?: string;
  instagram?: string;
  whatsapp?: string;

  portada?: string;
  galeria?: string[];
  slogan?: string;
  historia?: string;
  productos?: Producto[];
}