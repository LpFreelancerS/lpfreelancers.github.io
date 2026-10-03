const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzxz5bmHZK2ukteSfVh4fMNT-He7UgpbxLJWKXTv1_OJoqM6lLb1acBVNDG-F6M8GK_/exec";
let currentUser = null;
let selectedAnswerCorrect = null;
let currentObjective = "";
let allQuestions = [];
let sessionSeconds = 0;
let totalStudySeconds = parseInt(localStorage.getItem('mateuna_total_study_seconds')) || 0;
let sessionTimerInterval = null;
let objetivosDisponibles = [];

// --- PARSER Y NORMALIZADOR DE DATOS ---
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(',');
        const obj = {};
        headers.forEach((header, index) => {
            let val = values[index] ? values[index].trim().replace(/^"|"$/g, '') : '';
            obj[header] = val;
        });
        return obj;
    });
}

function normalizeQuestionsKeys(data) {
    return data.map(q => ({
        Objetivo: String(q.Objetivo || q.objetivo || '').trim(),
        Pregunta: q.Pregunta || q.pregunta || q.question || '',
        Opcion1_Correcta: q.Opcion1_Correcta || q.Opcionl_Correcta || q.correct || '',
        Opcion2_Incorrecta1: q.Opcion2_Incorrecta1 || q.Opcion2_Incorrectal || q.incorrect1 || '',
        Opcion3_Incorrecta2: q.Opcion3_Incorrecta2 || q.incorrect2 || ''
    }));
}

async function fetchQuestions() {
    const questionTextEl = document.getElementById('question-text');
    let loadedFromLocal = false;

    try {
        const cursoActual = getMateriaActual();
        const response = await fetch(`${cursoActual.scriptUrl}?sheet=Preguntas&materia=${materiaActiva}`);
        const remoteData = await response.json();
        
        if (Array.isArray(remoteData) && remoteData.length > 0) {
            allQuestions = normalizeQuestionsKeys(remoteData);
            inicializarObjetivosQuiz(allQuestions);
        }
    } catch (err) {
        console.error("Error al consultar Google Sheets:", err);
        if (questionTextEl) questionTextEl.innerText = "Error de conexión al cargar las preguntas.";
    }
}

// --- AUTENTICACIÓN GOOGLE ---
function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

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
    showSection('cursos');
}

function initializeGoogleButton() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: "205229444634-85v2gua4tv360jnn02bj5d68uhrb2e85.apps.googleusercontent.com",
            callback: handleCredentialResponse
        });

        const authSection = document.getElementById("auth-section");
        if (authSection) {
            google.accounts.id.renderButton(
                authSection,
                { theme: "outline", size: "large", text: "signin_with" }
            );
        }
    } else {
        setTimeout(initializeGoogleButton, 500);
    }
}

function logoutUser() {
    if(sessionTimerInterval) clearInterval(sessionTimerInterval);
    localStorage.removeItem('mateuna_user');
    localStorage.removeItem('mateuna_user_email');
    location.reload();
}

// --- GESTIÓN DE CURSOS Y POPUP DE AVISO ---
function renderizarCatalogoCursos() {
    const container = document.getElementById('cursos-list-container');
    if (!container) return;

    let html = '';
    for (let key in MATERIAS_CONFIG) {
        let curso = MATERIAS_CONFIG[key];
        let isSelected = materiaActiva === curso.codigo;
        
        html += `
            <div class="bg-white rounded-2xl border ${isSelected ? 'border-amber-500 ring-2 ring-amber-100 shadow-md' : 'border-slate-200 shadow-xs'} overflow-hidden flex flex-col justify-between transition hover:shadow-md">
                <div class="h-36 bg-slate-100 overflow-hidden relative">
                    <img src="${curso.imagen}" alt="${curso.nombre}" class="w-full h-full object-cover" onerror="this.src='LP_FreelancerS_logo.png'">
                    <span class="absolute top-3 left-3 text-[10px] font-bold uppercase px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg shadow-sm">Activo</span>
                </div>
                <div class="p-5 space-y-3 flex-grow flex flex-col justify-between">
                    <div>
                        <h3 class="font-bold text-xl text-slate-900">${curso.nombre}</h3>
                        <p class="text-xs text-slate-500 mt-1 leading-relaxed">${curso.descripcion}</p>
                    </div>
                    <button onclick="seleccionarCursoYVerificar('${curso.codigo}')" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center justify-center gap-2">
                        <i class="fa fa-sign-in"></i> Ingresar al Curso
                    </button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

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
        const response = await fetch(`${cursoActual.scriptUrl}?action=verificarAcceso&email=${encodeURIComponent(email)}&materia=${codigoMateria}`);
        const data = await response.json();

        if (data && data.autorizado === false) {
            document.getElementById('denied-modal').classList.remove('hidden');
            document.getElementById('denied-modal').classList.add('flex');
            return;
        }

        actualizarIndicadorCursoActivo();
        mostrarPopupCambioCurso(cursoActual.nombre);
        renderizarCatalogoCursos();
        showSection('quiz');
        fetchQuestions();

    } catch (e) {
        console.warn("Verificando en modo local/red.", e);
        actualizarIndicadorCursoActivo();
        mostrarPopupCambioCurso(cursoActual.nombre);
        showSection('quiz');
        fetchQuestions();
    }
}

function actualizarIndicadorCursoActivo() {
    const curso = getMateriaActual();
    const badge = document.getElementById('curso-activo-indicator');
    if (badge) {
        badge.innerHTML = `<i class="fa fa-graduation-cap text-amber-500 mr-1.5"></i> Curso Actual: <strong class="text-slate-900">${curso.nombre}</strong>`;
        badge.classList.remove('hidden');
    }
}

function mostrarPopupCambioCurso(nombreCurso) {
    const popup = document.getElementById('curso-popup-toast');
    const textElem = document.getElementById('curso-popup-text');
    if (popup && textElem) {
        textElem.innerText = `Has ingresado a: ${nombreCurso}`;
        popup.classList.remove('hidden');
        setTimeout(() => {
            popup.classList.add('hidden');
        }, 3500);
    }
}

function cerrarModalAccesoDenegado() {
    document.getElementById('denied-modal').classList.remove('flex');
    document.getElementById('denied-modal').classList.add('hidden');
}

// --- RELOJES ---
function startSessionTimer() {
    sessionSeconds = 0;
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    
    sessionTimerInterval = setInterval(() => {
        sessionSeconds++;
        totalStudySeconds++;
        if (totalStudySeconds % 10 === 0) {
            localStorage.setItem('mateuna_total_study_seconds', totalStudySeconds);
        }
        updateTimersDisplay();
    }, 1000);
}

function updateTimersDisplay() {
    const sessMin = Math.floor(sessionSeconds / 60).toString().padStart(2, '0');
    const sessSec = (sessionSeconds % 60).toString().padStart(2, '0');
    const sessionElem = document.getElementById('session-timer');
    if (sessionElem) sessionElem.innerText = `Sesión: ${sessMin}:${sessSec}`;

    const totalHours = Math.floor(totalStudySeconds / 3600);
    const totalMins = Math.floor((totalStudySeconds % 3600) / 60);
    const totalElem = document.getElementById('total-study-timer');
    if (totalElem) {
        totalElem.innerText = totalHours > 0 ? `Total: ${totalHours}h ${totalMins}m` : `Total: ${totalMins}m`;
    }
}

function toggleTimersVisibility() {
    const container = document.getElementById('timers-container');
    if (container) {
        container.style.display = container.style.display === 'none' ? '' : 'none';
    }
}

// --- NAVEGACIÓN Y VISTAS ---
function renderAppUI(userData) {
    document.getElementById('login-prompt')?.classList.add('hidden');
    document.getElementById('auth-section')?.classList.add('hidden');
    document.getElementById('user-info')?.classList.remove('hidden');
    document.getElementById('app-container')?.classList.remove('hidden');
    
    const userNameElem = document.getElementById('user-name');
    if (userNameElem) {
        userNameElem.innerText = userData.name;
    }
    actualizarIndicadorCursoActivo();
}

window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('mateuna_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        renderAppUI(currentUser);
        startSessionTimer();
        renderizarCatalogoCursos();
        actualizarIndicadorCursoActivo();
        showSection('cursos');
    } else {
        initializeGoogleButton();
    }
});

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar-menu');
    if (sidebar) sidebar.classList.toggle('hidden');
}

function showSection(sectionKey) {
    const cursosView = document.getElementById('view-cursos');
    const quizView = document.getElementById('view-quiz');
    const dynamicView = document.getElementById('view-dynamic');
    const estadisticasView = document.getElementById('view-estadisticas');
    
    if (window.innerWidth < 768) {
        document.getElementById('sidebar-menu')?.classList.add('hidden');
    }

    document.querySelectorAll('aside button').forEach(btn => {
        btn.classList.remove('bg-amber-50', 'text-amber-900', 'border-l-4', 'border-amber-500');
        btn.classList.add('text-slate-600', 'hover:bg-slate-50');
    });
    
    const activeBtn = document.getElementById(`nav-${sectionKey}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'hover:bg-slate-50');
        activeBtn.classList.add('bg-amber-50', 'text-amber-900');
    }     

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
        if (sectionKey === 'plan') {
            loadPlanCursoDynamic(dynamicView);
        } else if (sectionKey === 'fundamentacion') {
            loadFundamentacionDynamic(dynamicView);
        } else if (sectionKey === 'notas') {
            loadStudentGradesSheet(dynamicView);
        } else if (sectionKey === 'examenes') {
            loadSheetDataAsTable('Examenes', dynamicView, 'Calendario de Evaluaciones');
        } else if (sectionKey === 'contacto') {
            loadSheetDataAsTable('Contacto', dynamicView, 'Soporte y Profesores');
        }
    }
}

// --- CARGA DE PESTAÑAS DESDE GOOGLE SHEETS ---
async function loadPlanCursoDynamic(container) {
    const curso = getMateriaActual();
    container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">Plan de Curso</h2><p class="text-slate-400 text-sm">Cargando...</p>`;
    try {
        const response = await fetch(`${curso.scriptUrl}?action=getPlanCurso&materia=${materiaActiva}`);
        const planData = await response.json();
        if (!planData || planData.length === 0) {
            container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">Plan de Curso</h2><p class="text-slate-500 text-sm">No hay unidades cargadas.</p>`;
            return;
        }
        let html = `<h2 class="text-xl font-bold text-slate-900 mb-4">Plan de Curso - ${curso.nombre}</h2><div class="space-y-4">`;
        planData.forEach(item => {
            html += `<div class="border border-slate-200 p-4 rounded-xl"><h4 class="font-bold text-slate-800 mb-2">${item.unidad}</h4><ul class="text-sm text-slate-600 space-y-1 list-disc list-inside">`;
            item.temas.forEach(temaObj => {
                if (temaObj.link) {
                    html += `<li><a href="${temaObj.link}" target="_blank" class="text-amber-600 hover:underline font-medium">${temaObj.texto} ↗</a></li>`;
                } else {
                    html += `<li>${temaObj.texto}</li>`;
                }
            });
            html += `</ul></div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">Plan de Curso</h2><p class="text-rose-500 text-sm">Error al cargar datos.</p>`;
    }
}

async function loadFundamentacionDynamic(container) {
    const curso = getMateriaActual();
    container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">Fundamentación</h2><p class="text-slate-400 text-sm">Cargando...</p>`;
    try {
        const response = await fetch(`${curso.scriptUrl}?action=getFundamentacion&materia=${materiaActiva}`);
        const data = await response.json();
        if (!data || data.error) {
            container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">Fundamentación</h2><p class="text-slate-500 text-sm">No disponible.</p>`;
            return;
        }
        container.innerHTML = `
            <h2 class="text-xl font-bold text-slate-900 mb-4">Fundamentación - ${curso.nombre}</h2>
            <p class="mb-4 text-slate-600 text-sm">${data.texto_fundamentacion || ''}</p>
            <h3 class="font-bold text-slate-800 mt-4 mb-2">Objetivo Global</h3>
            <p class="text-slate-600 bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm mb-4">${data.objetivo_global || ''}</p>
        `;
    } catch (e) {
        container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">Fundamentación</h2><p class="text-rose-500 text-sm">Error de conexión.</p>`;
    }
}

async function loadStudentGradesSheet(container) {
    const userEmail = (currentUser ? currentUser.email : localStorage.getItem('mateuna_user_email') || '').trim().toLowerCase();
    const curso = getMateriaActual();
    container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">Mis Calificaciones</h2><p class="text-slate-400 text-sm">Cargando...</p>`;
    
    try {
        const response = await fetch(`${curso.scriptUrl}?sheet=Notas&materia=${materiaActiva}`);
        const data = await response.json();
        if (!data || !Array.isArray(data)) {
            container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">Mis Calificaciones</h2><p class="text-slate-500 text-sm">No hay registros.</p>`;
            return;
        }
        const studentRow = data.find(row => String(row.Correo || row.email || '').trim().toLowerCase() === userEmail);
        if (!studentRow) {
            container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">Mis Calificaciones</h2><p class="text-slate-500 text-sm">No se encontraron notas asociadas a tu correo.</p>`;
            return;
        }
        let html = `<h2 class="text-xl font-bold text-slate-900 mb-4">Mis Calificaciones - ${curso.nombre}</h2><div class="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4 flex justify-between items-center"><span class="font-bold text-slate-800 text-sm">${studentRow.nombre || userEmail}</span><span class="text-lg font-black text-amber-800">Nota Final: ${studentRow.Nota || studentRow.nota || '-'}</span></div>`;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">Mis Calificaciones</h2><p class="text-rose-500 text-sm">Error al cargar calificaciones.</p>`;
    }
}

async function loadSheetDataAsTable(sheetName, container, title) {
    const curso = getMateriaActual();
    container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">${title}</h2><p class="text-slate-400 text-sm">Cargando...</p>`;
    try {
        const response = await fetch(`${curso.scriptUrl}?sheet=${sheetName}&materia=${materiaActiva}`);
        const data = await response.json();
        if (!data || data.length === 0) {
            container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">${title}</h2><p class="text-slate-500 text-sm">No hay registros.</p>`;
            return;
        }
        let html = `<h2 class="text-xl font-bold text-slate-900 mb-4">${title}</h2><div class="overflow-x-auto"><table class="w-full text-left text-sm text-slate-600"><thead class="bg-slate-100 text-slate-700 uppercase text-xs"><tr>`;
        const headers = Object.keys(data[0]);
        headers.forEach(h => html += `<th class="p-3">${h}</th>`);
        html += `</tr></thead><tbody>`;
        data.forEach(row => {
            html += `<tr class="border-b border-slate-100">`;
            headers.forEach(h => {
                let val = row[h] || '';
                if(typeof val === 'string' && val.startsWith('http')) {
                    val = `<a href="${val}" target="_blank" class="text-amber-600 underline">Ver Enlace</a>`;
                }
                html += `<td class="p-3">${val}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<h2 class="text-xl font-bold text-slate-900 mb-4">${title}</h2><p class="text-rose-500 text-sm">Error al conectar con la base de datos.</p>`;
    }
}

// --- QUIZ ---
function inicializarObjetivosQuiz(preguntas) {
    objetivosDisponibles = [...new Set(preguntas.map(p => p.Objetivo || p.objetivo || p.obj))].sort();
    const container = document.getElementById('objectives-tabs-container');
    if (!container) return;
    if (objetivosDisponibles.length === 0) {
        container.innerHTML = '<span class="text-xs text-slate-400 p-2">No hay objetivos</span>';
        return;
    }
    if (!currentObjective || !objetivosDisponibles.includes(currentObjective)) {
        currentObjective = objetivosDisponibles[0];
    }
    container.innerHTML = objetivosDisponibles.map(obj => `
        <button onclick="switchObjective('${obj}')" id="btn-obj-${obj}" 
            class="px-4 py-2 rounded-xl font-medium text-sm transition shrink-0 cursor-pointer ${
                obj === currentObjective ? 'bg-amber-500 text-slate-950 shadow-sm font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }">
            Módulo ${obj}
        </button>
    `).join('');
    loadQuestionsForCurrentObjective();
}

function switchObjective(objNum) {
    currentObjective = objNum;
    objetivosDisponibles.forEach(o => {
        const btn = document.getElementById(`btn-obj-${o}`);
        if (btn) {
            btn.className = o === objNum 
                ? "px-4 py-2 rounded-xl font-bold text-sm transition shrink-0 bg-amber-500 text-slate-950 shadow-sm cursor-pointer" 
                : "px-4 py-2 rounded-xl font-medium text-sm transition shrink-0 bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer";
        }
    });
    loadQuestionsForCurrentObjective();
}

function loadQuestionsForCurrentObjective() {
    const currentObjNormalized = String(currentObjective).replace(',', '.').trim();
    const filtered = allQuestions.filter(q => {
        if (!q.Objetivo) return false;
        return String(q.Objetivo).replace(',', '.').trim().replace(/^obj\.?\s*/i, '') === currentObjNormalized;
    });

    const titleEl = document.getElementById('obj-title');
    if (titleEl) titleEl.innerText = `EVALUACIÓN - MÓDULO ${currentObjective}`;
    
    const container = document.getElementById('options-container');
    if (container) container.innerHTML = "";
    
    const resultContainer = document.getElementById('result-container');
    if (resultContainer) resultContainer.classList.add('hidden');

    const questionTextEl = document.getElementById('question-text');
    if (filtered.length === 0) {
        if (questionTextEl) questionTextEl.innerText = "No hay preguntas disponibles.";
        document.getElementById('submit-btn')?.style.setProperty('display', 'none');
        return;
    }

    const qData = filtered[Math.floor(Math.random() * filtered.length)];
    if (questionTextEl) questionTextEl.innerText = qData.Pregunta;

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.className = "w-full bg-slate-200 text-slate-400 font-medium py-3 rounded-xl transition cursor-not-allowed";
    }

    let optionsArray = [
        { text: qData.Opcion1_Correcta, correct: true },
        { text: qData.Opcion2_Incorrecta1, correct: false },
        { text: qData.Opcion3_Incorrecta2, correct: false }
    ].filter(opt => opt.text && String(opt.text).trim() !== "");

    for (let i = optionsArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsArray[i], optionsArray[j]] = [optionsArray[j], optionsArray[i]];
    }

    if (container) {
        optionsArray.forEach((opt) => {
            const btn = document.createElement('button');
            btn.className = "w-full text-left p-4 rounded-xl border border-slate-200 hover:border-amber-500 transition option-btn my-2 cursor-pointer text-sm";
            btn.innerText = opt.text;
            btn.onclick = () => selectOption(btn, opt.correct);
            container.appendChild(btn);
        });
    }
    selectedAnswerCorrect = null;
}

function selectOption(selectedBtn, isCorrect) {
    selectedAnswerCorrect = isCorrect;
    document.querySelectorAll('#options-container button').forEach(btn => {
        btn.classList.remove('border-amber-600', 'bg-amber-50', 'ring-2', 'ring-amber-500');
        btn.classList.add('border-slate-200');
    });
    selectedBtn.classList.remove('border-slate-200');
    selectedBtn.classList.add('border-amber-600', 'bg-amber-50', 'ring-2', 'ring-amber-500');

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.className = "w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold py-3 rounded-xl transition cursor-pointer";
    }
}

function submitQuiz() {
    if (selectedAnswerCorrect === null) return;
    const email = currentUser ? currentUser.email : localStorage.getItem('mateuna_user_email');
    const name = currentUser ? currentUser.name : "Estudiante";
    const curso = getMateriaActual();

    const payload = {
        email: email,
        name: name,
        objective: currentObjective,
        isCorrect: selectedAnswerCorrect,
        materia: materiaActiva
    };

    const btn = document.getElementById('submit-btn');
    if (btn) { btn.innerText = "Evaluando..."; btn.disabled = true; }

    const isCorrect = selectedAnswerCorrect;

    fetch(curso.scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
    }).catch(err => console.warn(err))
    .finally(() => {
        showFeedbackResult(isCorrect);
        if (btn) btn.innerText = "Enviar Respuesta";
    });
}

function showFeedbackResult(isCorrect) {
    const resultContainer = document.getElementById('result-container');
    if (!resultContainer) return;
    resultContainer.classList.remove('hidden');
    if (isCorrect) {
        resultContainer.className = "bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center my-4";
        resultContainer.innerHTML = `
            <div class="flex items-center justify-center gap-2 mb-2 text-emerald-700">
                <i class="fa fa-check-circle text-2xl"></i>
                <h3 class="text-xl font-bold">¡Respuesta Correcta!</h3>
            </div>
            <button onclick="loadQuestionsForCurrentObjective()" class="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition cursor-pointer">Siguiente Pregunta</button>
        `;
    } else {
        resultContainer.className = "bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center my-4";
        resultContainer.innerHTML = `
            <div class="flex items-center justify-center gap-2 mb-2 text-rose-700">
                <i class="fa fa-times-circle text-2xl"></i>
                <h3 class="text-xl font-bold">Respuesta Incorrecta</h3>
            </div>
            <button onclick="loadQuestionsForCurrentObjective()" class="bg-rose-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-rose-700 transition cursor-pointer">Intentar Otra</button>
        `;
    }
}

function cargarEstadisticasUsuario() {
    const curso = getMateriaActual();
    const emailUsuario = (currentUser?.email || localStorage.getItem('mateuna_user_email') || '').trim().toLowerCase();
    const container = document.getElementById('estadisticas-container');
    container.innerHTML = `<p class="text-sm text-slate-400 text-center py-8">Cargando métricas...</p>`;

    fetch(`${curso.scriptUrl}?action=getEstadisticas&materia=${curso.codigo}`)
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = `<div class="p-4 text-center text-slate-400 text-sm">No hay registros guardados.</div>`;
                return;
            }
            const usuarioData = data.find(u => String(u.email).trim().toLowerCase() === emailUsuario) || data[0];
            if (!usuarioData || !usuarioData.detallesObjetivos) {
                container.innerHTML = `<div class="p-4 text-center text-slate-400 text-sm">Aún no hay registros de práctica.</div>`;
                return;
            }
            let html = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;
            for (let objId in usuarioData.detallesObjetivos) {
                let stats = usuarioData.detallesObjetivos[objId];
                let colorBarra = stats.porcentajeEfectividad >= 70 ? 'bg-emerald-500' : 'bg-amber-500';
                html += `
                    <div class="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                        <div class="flex justify-between items-center text-sm font-bold text-slate-800">
                            <span>Módulo ${objId}</span>
                            <span>${stats.porcentajeEfectividad}% Aciertos</span>
                        </div>
                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div class="${colorBarra} h-full" style="width: ${stats.porcentajeEfectividad}%"></div>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
            container.innerHTML = html;
        }).catch(() => container.innerHTML = `<div class="p-4 text-center text-rose-500 text-sm">Error al cargar estadísticas.</div>`);
}

function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    currentUser = {
        name: responsePayload.name,
        email: responsePayload.email,
        picture: responsePayload.picture
    };
    
    localStorage.setItem('mateuna_user', JSON.stringify(currentUser));
    localStorage.setItem('mateuna_user_email', responsePayload.email);

    renderAppUI(currentUser);
    startSessionTimer();
    renderizarCatalogoCursos();
    showSection('cursos');
}

function renderAppUI(userData) {
    document.getElementById('login-prompt')?.classList.add('hidden');
    document.getElementById('auth-section')?.classList.add('hidden');
    document.getElementById('user-info')?.classList.remove('hidden');
    document.getElementById('app-container')?.classList.remove('hidden');
    
    const userNameElem = document.getElementById('user-name');
    if (userNameElem) {
        userNameElem.innerText = userData.name;
    }

    const userAvatarElem = document.getElementById('user-avatar');
    if (userAvatarElem && userData.picture) {
        userAvatarElem.src = userData.picture;
    }

    actualizarIndicadorCursoActivo();
}
