const MATERIAS_CONFIG = {
  "excel": {
    codigo: "excel",
    nombre: "Google Sheets: Basico",
    descripcion: "Organización de datos, fórmulas esenciales, gestión de presupuestos y tablas dinámicas.",
    imagen: "google_sheets.png", 
    scriptUrl: "https://script.google.com/macros/s/AKfycbz2zvK7tcAw2VFb-z2tGPkfWMn2UDEt4ybNXMvs4ZteeBHR2YrZHd5buL2diQByIIjb/exec",
    spreadsheetId: "1IFEm2WqOyne8Cbb9jOI79uHBBN81RauC-ANSt3HI70o"
  },
  "web1": {
    codigo: "web1",
    nombre: "Introducción al Desarrollo Web",
    descripcion: "Fundamentos sólidos de HTML5, CSS3 y maquetación web responsiva profesional.",
    imagen: "web_dev.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbz2zvK7tcAw2VFb-z2tGPkfWMn2UDEt4ybNXMvs4ZteeBHR2YrZHd5buL2diQByIIjb/exec",
    spreadsheetId: "1VnHCGsK6fXQ1CxU9e9_QKiQUx0NrdhROuP7M5dGl-vE"
  },    
  "ingles": {
    codigo: "ingles",
    nombre: "Inglés A1-A2",
    descripcion: "Comprensión de textos técnicos, redacción de correos profesionales y comunicación básica.",
    imagen: "ingles_1.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbxVlqPxzjnwLnjWyHEGDemeB8KYRNdpnh3W_-_9rzoXhZqV6Vn95t3dnYOacGhASIaA2w/exec",
    spreadsheetId: "1OuEnObFK_7Un4d25rH5llIim5X8kDRp4NnGQlo7GRQM"
  },
   "excel2": {
    codigo: "excel2",
    nombre: "Google Sheets: Intermedio",
    descripcion: "Organización de datos, fórmulas esenciales, gestión de presupuestos y tablas dinámicas.",
    imagen: "google_sheets.png", 
    scriptUrl: "https://script.google.com/macros/s/AKfycbz2zvK7tcAw2VFb-z2tGPkfWMn2UDEt4ybNXMvs4ZteeBHR2YrZHd5buL2diQByIIjb/exec",
    spreadsheetId: "1IFEm2WqOyne8Cbb9jOI79uHBBN81RauC-ANSt3HI70o"
  },
  "web2": {
    codigo: "web2",
    nombre: "Desarrollo Web II",
    descripcion: "Fundamentos sólidos de HTML5, CSS3 y maquetación web responsiva profesional.",
    imagen: "web_dev.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbz2zvK7tcAw2VFb-z2tGPkfWMn2UDEt4ybNXMvs4ZteeBHR2YrZHd5buL2diQByIIjb/exec",
    spreadsheetId: "1VnHCGsK6fXQ1CxU9e9_QKiQUx0NrdhROuP7M5dGl-vE"
  },    
  "ingles2": {
    codigo: "ingles2",
    nombre: "Inglés B1-B2",
    descripcion: "Comprensión de textos técnicos, redacción de correos profesionales y comunicación básica.",
    imagen: "ingles_1.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbxVlqPxzjnwLnjWyHEGDemeB8KYRNdpnh3W_-_9rzoXhZqV6Vn95t3dnYOacGhASIaA2w/exec",
    spreadsheetId: "1OuEnObFK_7Un4d25rH5llIim5X8kDRp4NnGQlo7GRQM"
  },
 "excel3": {
    codigo: "excel3",
    nombre: "Google Sheets: Avanzado",
    descripcion: "Organización de datos, fórmulas esenciales, gestión de presupuestos y tablas dinámicas.",
    imagen: "google_sheets.png", 
    scriptUrl: "https://script.google.com/macros/s/AKfycbz2zvK7tcAw2VFb-z2tGPkfWMn2UDEt4ybNXMvs4ZteeBHR2YrZHd5buL2diQByIIjb/exec",
    spreadsheetId: "1IFEm2WqOyne8Cbb9jOI79uHBBN81RauC-ANSt3HI70o"
  },
  "web3": {
    codigo: "web3",
    nombre: "Desarrollo Web Avanzado",
    descripcion: "Fundamentos sólidos de HTML5, CSS3 y maquetación web responsiva profesional.",
    imagen: "web_dev.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbz2zvK7tcAw2VFb-z2tGPkfWMn2UDEt4ybNXMvs4ZteeBHR2YrZHd5buL2diQByIIjb/exec",
    spreadsheetId: "1VnHCGsK6fXQ1CxU9e9_QKiQUx0NrdhROuP7M5dGl-vE"
  },    
  "ingles3": {
    codigo: "ingles3",
    nombre: "Inglés C1-C2",
    descripcion: "Comprensión de textos técnicos, redacción de correos profesionales y comunicación básica.",
    imagen: "ingles_1.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbxVlqPxzjnwLnjWyHEGDemeB8KYRNdpnh3W_-_9rzoXhZqV6Vn95t3dnYOacGhASIaA2w/exec",
    spreadsheetId: "1OuEnObFK_7Un4d25rH5llIim5X8kDRp4NnGQlo7GRQM"
  }
};

let materiaActiva = localStorage.getItem('mateuna_materia_activa') || 'excel';

function getMateriaActual() {
  return MATERIAS_CONFIG[materiaActiva] || MATERIAS_CONFIG["excel"];
}
