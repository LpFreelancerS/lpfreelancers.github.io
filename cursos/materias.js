const MATERIAS_CONFIG = {
  "175": {
    codigo: "175",
    nombre: "Matemática I",
    descripcion: "Conjuntos numéricos, números reales, ecuaciones e inecuaciones.",
    scriptUrl: "https://script.google.com/macros/s/AKfycbxLPPFyE96Jo2iOZN0dglIxZR2uv7zC3aLX8YSkqXG-NUK1qC9f1BmUcULBKB3Gyo3y/exec",
    spreadsheetId: "1PuT49F4tYxzayYi-Xm8jy8hINjd3rxwNduD0UGE83qk"
  },
  "178": {
    codigo: "178",
    nombre: "Matemática II",
    descripcion: "Cálculo de una variable, funciones, límites y derivadas.",
    scriptUrl: "https://script.google.com/macros/s/AKfycbxVlqPxzjnwLnjWyHEGDemeB8KYRNdpnh3W_-_9rzoXhZqV6Vn95t3dnYOacGhASIaA2w/exec",
    spreadsheetId: "1VnHCGsK6fXQ1CxU9e9_QKiQUx0NrdhROuP7M5dGl-vE"
  },    
  "768": {
    codigo: "768",
    nombre: "Topología de Espacios Métricos",
    descripcion: "Espacios métricos, conexidad, compacidad y continuidad.",
    scriptUrl: "https://script.google.com/macros/s/AKfycbwUBkRX6Go9cXh0deNIb2SyoqmQHeogphmY_oU8oWnBMRwnIrjpHFUQ5fGvjUIWEKR0lg/exec",
    spreadsheetId: "1OuEnObFK_7Un4d25rH5llIim5X8kDRp4NnGQlo7GRQM"
  }
};

let materiaActiva = localStorage.getItem('mateuna_materia_activa') || '175';

function getMateriaActual() {
  return MATERIAS_CONFIG[materiaActiva] || MATERIAS_CONFIG["175"];
}
