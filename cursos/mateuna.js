let currentUser = null;
let selectedAnswerCorrect = null;
let currentObjective = "";
let allQuestions = [];
let sessionSeconds = 0;
let totalStudySeconds = parseInt(localStorage.getItem('mateuna_total_study_seconds')) || 0;
let sessionTimerInterval = null;
let objetivosDisponibles = [];

// Renderizar tarjetas de cursos en la vista inicial
function renderizarCatalogoCursos() {
    const container = document.getElementById('cursos-list-container');
    if (!container) return;

    let html = '';
    for (let key in MATERIAS_CONFIG) {
        let curso = MATERIAS_CONFIG[key];
        let isSelected = materiaActiva === curso.codigo;
        
        html += `
            <div class="bg-white p-5 rounded-2xl border ${isSelected ? 'border-amber-500 ring-2 ring-amber-100' : 'border-slate-200'} shadow-xs flex flex-col justify-between space-y-4">
                <div>
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md">Código: ${curso.codigo}</span>
                    <h3 class="font-bold text-lg text-slate-900 mt-2">${curso.nombre}</h3>
                    <p class="text-xs text-slate-500 mt-1">${curso.descripcion}</p>
                </div>
                <button onclick="seleccionarCursoYVerificar('${curso.codigo}')" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer">
                    Ingresar al Curso ➔
                </button>
            </div>
        `;
    }
    container.innerHTML = html;
}

// Verificar si el usuario está en la lista de alumnos de la hoja correspondiente
async function seleccionarCursoYVerificar(codigoMateria) {
    const email = currentUser ? currentUser.email : localStorage.getItem('mateuna_user_email');
    if (!email) {
        alert("Por favor inicia sesión con Google primero.");
        return;
    }

    materiaActiva = codigoMateria;
    localStorage.setItem('mateuna_materia_activa', codigoMateria);

    const cursoActual = getMateriaActual();

    try {
        // Consultar al backend si el correo está en la pestaña Alumnos
        const response = await fetch(`${cursoActual.scriptUrl}?action=verificarAcceso&email=${encodeURIComponent(email)}&materia=${codigoMateria}`);
        const data = await response.json();

        if (data && data.autorizado === false) {
            // Mostrar modal de acceso denegado
            document.getElementById('denied-modal').classList.remove('hidden');
            document.getElementById('denied-modal').classList.add('flex');
            return;
        }

        // Si está autorizado, actualizar UI y cargar el quiz del curso
        document.getElementById('curso-activo-badge').innerText = `Curso: ${cursoActual.nombre}`;
        renderizarCatalogoCursos();
        showSection('quiz');
        fetchQuestions();

    } catch (e) {
        console.warn("Error verificando acceso en red, permitiendo acceso temporal o local.", e);
        // Fallback si hay error de red
        showSection('quiz');
        fetchQuestions();
    }
}

function cerrarModalAccesoDenegado() {
    document.getElementById('denied-modal').classList.remove('flex');
    document.getElementById('denied-modal').classList.add('hidden');
}

// Al iniciar sesión de Google
function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    currentUser = {
        name: responsePayload.name,
        email: responsePayload.email
    };
    
    localStorage.setItem('mateuna_user', JSON.stringify(currentUser));
    localStorage.setItem('mateuna_user_email', responsePayload.email);

    renderAppUI(currentUser);
    startSessionTimer();
    renderizarCatalogoCursos();
    showSection('cursos'); // Mostrar catálogo de cursos al entrar
}

function renderAppUI(userData) {
    document.getElementById('login-prompt')?.classList.add('hidden');
    document.getElementById('auth-section')?.classList.add('hidden');
    document.getElementById('user-info')?.classList.remove('hidden');
    document.getElementById('app-container')?.classList.remove('hidden');
    
    const userNameElem = document.getElementById('user-name');
    if (userNameElem) {
        userNameElem.innerText = `Hola, ${userData.name}`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('mateuna_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        renderAppUI(currentUser);
        startSessionTimer();
        renderizarCatalogoCursos();
        showSection('cursos');
    } else {
        initializeGoogleButton();
    }
});

function showSection(sectionKey) {
    const cursosView = document.getElementById('view-cursos');
    const quizView = document.getElementById('view-quiz');
    const dynamicView = document.getElementById('view-dynamic');
    const estadisticasView = document.getElementById('view-estadisticas');
    
    if (window.innerWidth < 768) {
        document.getElementById('sidebar-menu')?.classList.add('hidden');
    }

    document.querySelectorAll('aside button').forEach(btn => {
        btn.classList.remove('bg-amber-50', 'text-amber-900');
        btn.classList.add('text-slate-600', 'hover:bg-slate-50');
    });
    
    const activeBtn = document.getElementById(`nav-${sectionKey}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'hover:bg-slate-50');
        activeBtn.classList.add('bg-amber-50', 'text-amber-900');
    }     

    // Ocultar vistas
    if (cursosView) cursosView.classList.add('hidden');
    if (quizView) quizView.classList.add('hidden');
    if (dynamicView) dynamicView.classList.add('hidden');
    if (estadisticasView) estadisticasView.classList.add('hidden');

    if (sectionKey === 'cursos') {
        cursosView?.classList.remove('hidden');
        renderizarCatalogoCursos();
    } else if (sectionKey === 'quiz') {
        quizView?.classList.remove('hidden');
    } else if (sectionKey === 'estadisticas') {
        estadisticasView?.classList.remove('hidden');
        cargarEstadisticasUsuario();
    } else {
        dynamicView?.classList.remove('hidden');
        // Cargar vistas dinámicas según corresponda...
    }
}
