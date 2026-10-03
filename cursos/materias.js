const MATERIAS_CONFIG = {
  "175": {
    codigo: "175",
    nombre: "Matemática I",
    descripcion: "Conjuntos numéricos, números reales, ecuaciones e inecuaciones.",
    imagen: "web_design_long.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbxLPPFyE96Jo2iOZN0dglIxZR2uv7zC3aLX8YSkqXG-NUK1qC9f1BmUcULBKB3Gyo3y/exec",
    spreadsheetId: "1PuT49F4tYxzayYi-Xm8jy8hINjd3rxwNduD0UGE83qk"
  },
  "178": {
    codigo: "178",
    nombre: "Matemática II",
    descripcion: "Cálculo de una variable, funciones, límites y derivadas.",
    imagen: "google_sheets.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbxVlqPxzjnwLnjWyHEGDemeB8KYRNdpnh3W_-_9rzoXhZqV6Vn95t3dnYOacGhASIaA2w/exec",
    spreadsheetId: "1VnHCGsK6fXQ1CxU9e9_QKiQUx0NrdhROuP7M5dGl-vE"
  },    
  "768": {
    codigo: "768",
    nombre: "Topología de Espacios Métricos",
    descripcion: "Espacios métricos, conexidad, compacidad y continuidad.",
    imagen: "web_dev.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbwUBkRX6Go9cXh0deNIb2SyoqmQHeogphmY_oU8oWnBMRwnIrjpHFUQ5fGvjUIWEKR0lg/exec",
    spreadsheetId: "1OuEnObFK_7Un4d25rH5llIim5X8kDRp4NnGQlo7GRQM"
  },
  "excel": {
    codigo: "excel",
    nombre: "Google Sheets: Basico",
    descripcion: "Organización de datos, fórmulas esenciales, gestión de presupuestos y tablas dinámicas.",
    imagen: "google_sheets.png", 
    scriptUrl: "https://script.google.com/macros/s/AKfycby74QRdNkKjtV_I_auAImfvpi2BJMrzUbN6RdwuIDpPnDzua9WaXCd-xVisA45Z5252/exec",
    spreadsheetId: "1IFEm2WqOyne8Cbb9jOI79uHBBN81RauC-ANSt3HI70o"
  },
  "web1": {
    codigo: "web1",
    nombre: "Introducción al Desarrollo Web I",
    descripcion: "Fundamentos sólidos de HTML5, CSS3 y maquetación web responsiva profesional.",
    imagen: "web_dev.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbyVVmX4dJ1eBNpn2ezcjLDu23R8smSh5Z1-nFgUUVA3OBKfMAqUUk3FT0J8LZT4BKF03w/exec",
    spreadsheetId: "1VnHCGsK6fXQ1CxU9e9_QKiQUx0NrdhROuP7M5dGl-vE"
  },    
  "ingles": {
    codigo: "ingles",
    nombre: "Inglés Técnico A",
    descripcion: "Comprensión de textos técnicos, redacción de correos profesionales y comunicación básica.",
    imagen: "ingles_1.png",
    scriptUrl: "https://script.google.com/macros/s/AKfycbyhcJcZlg-JWzBwl5Y627_5H2nfXQQoZT6iw8oCLL4PmNABLmzx0wrTLhNoMdSdz00k6A/exec",
    spreadsheetId: "1OuEnObFK_7Un4d25rH5llIim5X8kDRp4NnGQlo7GRQM"
  }
};

let materiaActiva = localStorage.getItem('mateuna_materia_activa') || '175';

function getMateriaActual() {
  return MATERIAS_CONFIG[materiaActiva] || MATERIAS_CONFIG["175"];
}
