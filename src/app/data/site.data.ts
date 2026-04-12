// site.data.ts
// Datos editoriales del sitio — única fuente de verdad para textos, links y contacto.
// Modificar aquí propaga el cambio a footer, meta-tags y cualquier otro consumidor.

export const SITE = {
  name:        'Come en Girardota',
  tagline:     'Directorio gastronómico',
  description: 'Descubre los mejores sabores de Girardota, Antioquia. Negocios locales, comida de verdad.',
  location:    'Girardota, Antioquia, Colombia',

  contact: {
    whatsapp: '',   // ej: '3001234567'
    email:    '',   // ej: 'hola@comeengirardota.com'
  },

  social: {
    facebook:  '',  // URL completa o '' para ocultar
    instagram: '',
    tiktok:    '',
  },

  legal: {
    developer:    'Tu Estudio',
    developerUrl: '#',
  },
} as const;
