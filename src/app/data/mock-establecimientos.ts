import { Establecimiento } from '../models/establecimiento';

export const ESTABLECIMIENTOS_MOCK: Establecimiento[] = [
  {
    id: 1,
    nombre: 'Sabor Paisa Girardota',
    slogan: 'Tradición antioqueña servida con calidez',
    descripcion: 'Comida típica antioqueña en un ambiente familiar.',
    historia: 'Somos un restaurante local enfocado en rescatar los sabores tradicionales de la cocina paisa, ofreciendo platos caseros, atención cercana y una experiencia acogedora para familias, visitantes y trabajadores del municipio.',
    direccion: 'Cra 15 # 9-24',
    zona: 'Centro',
    telefono: '3001234567',
    horario: '8:00 AM - 8:00 PM',
    categoria: 'Restaurante',
    imagen: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    portada: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1600&q=80',
    galeria: [
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80'
    ],
    productos: [
      {
        nombre: 'Bandeja paisa',
        descripcion: 'Frijoles, arroz, chicharrón, huevo, carne molida, aguacate y arepa.',
        precio: '$28.000',
        imagen: 'https://images.unsplash.com/photo-1625944230945-1b7dd3b949ab?auto=format&fit=crop&w=1200&q=80'
      },
      {
        nombre: 'Sancocho de gallina',
        descripcion: 'Sopa tradicional con yuca, plátano, papa y gallina.',
        precio: '$24.000',
        imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80'
      },
      {
        nombre: 'Arepa con queso',
        descripcion: 'Arepa artesanal recién hecha con queso fundido.',
        precio: '$8.000',
        imagen: 'https://images.unsplash.com/photo-1603046891744-7614e5f2c1f1?auto=format&fit=crop&w=1200&q=80'
      }
    ],
    activo: true,
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    whatsapp: '3001234567'
  },

  {
    id: 2,
    nombre: 'Burger Town',
    slogan: 'Hamburguesas grandes, sabor brutal',
    descripcion: 'Hamburguesas artesanales, papas y malteadas.',
    historia: 'Burger Town nace como una propuesta juvenil para ofrecer hamburguesas artesanales con ingredientes frescos, recetas originales y una identidad visual moderna.',
    direccion: 'Calle 10 # 12-18',
    zona: 'Centro',
    telefono: '3015552233',
    horario: '12:00 PM - 10:00 PM',
    categoria: 'Comida rápida',
    imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    portada: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80',
    galeria: [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=1200&q=80'
    ],
    productos: [
      {
        nombre: 'Burger doble',
        descripcion: 'Doble carne, queso cheddar, tocineta y salsa especial.',
        precio: '$22.000',
        imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80'
      },
      {
        nombre: 'Papas cargadas',
        descripcion: 'Papas con queso, tocineta y salsa de la casa.',
        precio: '$14.000',
        imagen: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=1200&q=80'
      }
    ],
    activo: true,
    instagram: 'https://instagram.com'
  },
  {
    id: 2,
    nombre: 'Burger Town',
    descripcion: 'Hamburguesas artesanales, papas y malteadas.',
    direccion: 'Calle 10 # 12-18',
    zona: 'Centro',
    telefono: '3015552233',
    horario: '12:00 PM - 10:00 PM',
    categoria: 'Comida rápida',
    imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    activo: true,
    instagram: 'https://instagram.com'
  },
  {
    id: 3,
    nombre: 'Panadería La Trigueña',
    descripcion: 'Pan fresco, pandebonos, buñuelos y café.',
    direccion: 'Calle 8 # 14-30',
    zona: 'Centro',
    telefono: '3024567788',
    horario: '6:00 AM - 8:00 PM',
    categoria: 'Panadería',
    imagen: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
    activo: true
  },
  {
    id: 4,
    nombre: 'Café Mirador',
    descripcion: 'Café especial, postres y bebidas frías.',
    direccion: 'Vereda El Totumo',
    zona: 'Zona rural',
    telefono: '3041122334',
    horario: '9:00 AM - 7:00 PM',
    categoria: 'Cafetería',
    imagen: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
    activo: true
  },
  {
    id: 5,
    nombre: 'Helados Giranieve',
    descripcion: 'Helados artesanales y ensaladas de frutas.',
    direccion: 'Cra 13 # 11-40',
    zona: 'Centro',
    telefono: '3009876543',
    horario: '1:00 PM - 9:00 PM',
    categoria: 'Heladería',
    imagen: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&q=80',
    activo: true
  },
  {
    id: 6,
    nombre: 'Asados El Fogón',
    descripcion: 'Carnes a la parrilla y platos al carbón.',
    direccion: 'Autopista Norte km 3',
    zona: 'Salida norte',
    telefono: '3052223344',
    horario: '11:00 AM - 11:00 PM',
    categoria: 'Asadero',
    imagen: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1200&q=80',
    activo: true
  },
  {
    id: 7,
    nombre: 'Frutería Vital',
    descripcion: 'Jugos naturales, ensaladas de frutas y snacks saludables.',
    direccion: 'Calle 9 # 13-50',
    zona: 'Centro',
    telefono: '3111239876',
    horario: '7:00 AM - 6:00 PM',
    categoria: 'Frutería',
    imagen: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=1200&q=80',
    activo: true
  },
  {
    id: 8,
    nombre: 'Postres de la Abuela',
    descripcion: 'Cheesecake, tres leches, brownies y más.',
    direccion: 'Cra 12 # 10-08',
    zona: 'Centro',
    telefono: '3201112233',
    horario: '10:00 AM - 8:00 PM',
    categoria: 'Postres',
    imagen: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80',
    activo: true
  }
];