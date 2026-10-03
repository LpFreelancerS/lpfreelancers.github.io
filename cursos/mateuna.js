const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzxz5bmHZK2ukteSfVh4fMNT-He7UgpbxLJWKXTv1_OJoqM6lLb1acBVNDG-F6M8GK_/exec";
let currentUser = null;
let selectedAnswerCorrect = null;
let currentObjective = "";
let allQuestions = [];
let sessionSeconds = 0;
let totalStudySeconds = parseInt(localStorage.getItem('mateuna_total_study_seconds')) || 0;
let sessionTimerInterval = null;
let objetivosDisponibles = [];

const siteContent = {    
    ruta: {
        title: "Ruta de Estudio Recomendada",
        html: `
            <p class="text-slate-600 mb-4">Para un estudiante nuevo en la plataforma LP Freelancers, adaptarse al ritmo de estudio es más sencillo si sigues esta ruta ordenada:</p>
            <div class="space-y-4">
                <div class="border border-slate-200 p-4 rounded-xl">
                    <h4 class="font-bold text-amber-900 mb-1">1. Conoce el programa y los requisitos</h4>
                    <ul class="list-disc list-inside space-y-1 text-slate-600 text-sm">
                        <li><strong>Verifica tu acceso:</strong> Asegúrate de estar matriculado y que tu correo de Google esté autorizado en la hoja de control del curso.</li>
                        <li><strong>Metodología:</strong> Cada curso cuenta con material teórico, guías y evaluaciones formativas interactivas.</li>
                    </ul>
                </div>
            </div>
        `
    }
};

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

// --- CARGA DE PREGUNTAS ---

async function fetchQuestions() {
    const questionTextEl = document.getElementById('question-text');
    let loadedFromLocal = false;

    try {
        const localResponse = await fetch('./preguntas/p_mate1_175.csv');
        if (localResponse.ok) {
            const csvText = await localResponse.text();
            const localData = parseCSV(csvText);
            
            if (localData.length > 0) {
                allQuestions = normalizeQuestionsKeys(localData);
                inicializarObjetivosQuiz(allQuestions);
                loadedFromLocal = true;
            }
        }
    } catch (e) {
        console.warn("No se encontró preguntas.csv local.", e);
    }

    if (!loadedFromLocal && questionTextEl) {
        questionTextEl.innerText = "Conectando con la base de datos remota...";
    }

    try {
        const cursoActual = getMateriaActual();
        const response = await fetch(`${cursoActual.scriptUrl}?sheet=Preguntas&materia=${materiaActiva}`);
        const remoteData = await response.json();
        
        if (Array.isArray(remoteData) && remoteData.length > 0) {
            const normalizedRemote = normalizeQuestionsKeys(remoteData);
            
            if (!loadedFromLocal || JSON.stringify(allQuestions) !== JSON.stringify(normalizedRemote)) {
                allQuestions = normalizedRemote;
                inicializarObjetivosQuiz(allQuestions);
            }
        }
    } catch (err) {
        console.error("Error al consultar Google Sheets en segundo plano:", err);
        if (!loadedFromLocal && questionTextEl) {
            questionTextEl.innerText = "Error de conexión al cargar las preguntas.";
        }
    }
}

// --- AUTENTICACIÓN Y GOOGLE OAUTH ---

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

// --- GESTIÓN DE CURSOS Y VALIDACIÓN DE ALUMNOS ---

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

        document.getElementById('curso-activo-badge').innerText = `Curso: ${cursoActual.nombre}`;
        renderizarCatalogoCursos();
        showSection('quiz');
        fetchQuestions();

    } catch (e) {
        console.warn("Error verificando acceso en red, permitiendo acceso.", e);
        showSection('quiz');
        fetchQuestions();
    }
}

function cerrarModalAccesoDenegado() {
    document.getElementById('denied-modal').classList.remove('flex');
    document.getElementById('denied-modal').classList.add('hidden');
}

// --- RELOJES Y TEMPORIZADORES ---

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
    if (sessionElem) sessionElem.innerText = `⏱️ Sesión: ${sessMin}:${sessSec}`;

    const totalHours = Math.floor(totalStudySeconds / 3600);
    const totalMins = Math.floor((totalStudySeconds % 3600) / 60);
    const totalElem = document.getElementById('total-study-timer');
    if (totalElem) {
        totalElem.innerText = totalHours > 0 
            ? `📚 Total: ${totalHours}h ${totalMins}m` 
            : `📚 Total: ${totalMins}m`;
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
        btn.classList.remove('bg-amber-50', 'text-amber-900');
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
        // Aquí puedes seguir manejando las demás secciones si las requieres
    }
}

// --- QUIZ Y OBJETIVOS ---

function inicializarObjetivosQuiz(preguntas) {
    objetivosDisponibles = [...new Set(preguntas.map(p => p.Objetivo || p.objetivo || p.obj))].sort();
    
    const container = document.getElementById('objectives-tabs-container');
    if (!container) return;

    if (objetivosDisponibles.length === 0) {
        container.innerHTML = '<span class="text-xs text-slate-400 p-2">No hay objetivos disponibles</span>';
        return;
    }

    if (!currentObjective || !objetivosDisponibles.includes(currentObjective)) {
        currentObjective = objetivosDisponibles[0];
    }

    container.innerHTML = objetivosDisponibles.map(obj => `
        <button onclick="switchObjective('${obj}')" id="btn-obj-${obj}" 
            class="px-4 py-2 rounded-xl font-medium text-sm transition shrink-0 ${
                obj === currentObjective 
                ? 'bg-amber-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }">
            Obj. ${obj}
        </button>
    `).join('');

    loadQuestionsForCurrentObjective();
}

function switchObjective(objNum) {
    currentObjective = objNum;
    objetivosDisponibles.forEach(o => {
        const btn = document.getElementById(`btn-obj-${o}`);
        if (btn) {
            if (o === objNum) {
                btn.className = "px-4 py-2 rounded-xl font-medium text-sm transition shrink-0 bg-amber-600 text-white shadow-sm";
            } else {
                btn.className = "px-4 py-2 rounded-xl font-medium text-sm transition shrink-0 bg-slate-100 text-slate-700 hover:bg-slate-200";
            }
        }
    });
    loadQuestionsForCurrentObjective();
}

function loadQuestionsForCurrentObjective() {
    const currentObjNormalized = String(currentObjective).replace(',', '.').trim();

    const filtered = allQuestions.filter(q => {
        if (!q.Objetivo) return false;
        const objStr = String(q.Objetivo).replace(',', '.').trim().replace(/^obj\.?\s*/i, '');
        return objStr === currentObjNormalized;
    });

    const titleEl = document.getElementById('obj-title');
    if (titleEl) titleEl.innerText = `OBJETIVO ${currentObjective}`;
    
    const container = document.getElementById('options-container');
    if (container) container.innerHTML = "";
    
    const resultContainer = document.getElementById('result-container');
    if (resultContainer) resultContainer.classList.add('hidden');

    const questionTextEl = document.getElementById('question-text');

    if (filtered.length === 0) {
        if (questionTextEl) questionTextEl.innerText = "No hay preguntas disponibles para este objetivo actualmente.";
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) submitBtn.style.display = 'none';
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
            btn.className = "w-full text-left p-4 rounded-xl border border-slate-200 hover:border-amber-500 transition option-btn my-2 cursor-pointer";
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
        btn.classList.remove('border-amber-700', 'bg-amber-50', 'ring-2', 'ring-amber-500');
        btn.classList.add('border-slate-200');
    });

    selectedBtn.classList.remove('border-slate-200');
    selectedBtn.classList.add('border-amber-700', 'bg-amber-50', 'ring-2', 'ring-amber-500');

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.className = "w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 rounded-xl transition cursor-pointer";
    }
}

function submitQuiz() {
    if (selectedAnswerCorrect === null) return;

    const email = currentUser ? currentUser.email : localStorage.getItem('mateuna_user_email');
    const name = currentUser ? currentUser.name : "Estudiante";

    const payload = {
        email: email,
        name: name,
        objective: currentObjective,
        isCorrect: selectedAnswerCorrect,
        materia: materiaActiva
    };

    const btn = document.getElementById('submit-btn');
    if (btn) {
        btn.innerText = "Evaluando...";
        btn.disabled = true;
    }

    const isCorrect = selectedAnswerCorrect;
    const cursoActual = getMateriaActual();

    fetch(cursoActual.scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .catch(err => {
        console.warn("Respuesta guardada localmente.", err);
    })
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
            <div class="flex items-center justify-center gap-2 mb-2">
                <span class="text-2xl">✅</span>
                <h3 class="text-xl font-bold text-emerald-800">¡Respuesta Correcta!</h3>
            </div>
            <p class="text-emerald-700 text-sm mb-4">Excelente trabajo. Has dominado este ítem.</p>
            <button onclick="loadQuestionsForCurrentObjective()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition shadow-sm cursor-pointer">
                Siguiente Pregunta
            </button>
        `;
    } else {
        resultContainer.className = "bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center my-4";
        resultContainer.innerHTML = `
            <div class="flex items-center justify-center gap-2 mb-2">
                <span class="text-2xl">❌</span>
                <h3 class="text-xl font-bold text-rose-800">Respuesta Incorrecta</h3>
            </div>
            <p class="text-rose-700 text-sm mb-4">Revisa el material de estudio e inténtalo nuevamente.</p>
            <button onclick="loadQuestionsForCurrentObjective()" class="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition shadow-sm cursor-pointer">
                Intentar Otra Pregunta
            </button>
        `;
    }
}

function cargarEstadisticasUsuario() {
    const materiaActual = getMateriaActual();
    const emailUsuario = (currentUser?.email || localStorage.getItem('mateuna_user_email') || '').trim().toLowerCase();

    const container = document.getElementById('estadisticas-container');
    container.innerHTML = `<p class="text-sm text-slate-400 text-center py-8">Cargando métricas de rendimiento...</p>`;

    fetch(`${materiaActual.scriptUrl}?action=getEstadisticas&materia=${materiaActual.codigo}`)
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = `<div class="p-4 text-center text-slate-400 text-sm">No hay registros de intentos guardados todavía.</div>`;
                return;
            }

            const usuarioData = data.find(u => String(u.email).trim().toLowerCase() === emailUsuario) || data[0];

            if (!usuarioData || !usuarioData.detallesObjetivos) {
                container.innerHTML = `<div class="p-4 text-center text-slate-400 text-sm">Aún no tienes registros de práctica guardados.</div>`;
                return;
            }

            let html = `
                <div class="bg-slate-50 p-4 rounded-xl mb-4 flex justify-between items-center">
                    <div>
                        <span class="text-xs text-slate-500 block">Estudiante</span>
                        <span class="font-bold text-slate-800">${usuarioData.nombre || usuarioData.email}</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            `;

            for (let objId in usuarioData.detallesObjetivos) {
                let stats = usuarioData.detallesObjetivos[objId];
                let colorBarra = stats.porcentajeEfectividad >= 70 ? 'bg-emerald-500' : stats.porcentajeEfectividad >= 40 ? 'bg-amber-500' : 'bg-rose-500';

                html += `
                    <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-sm text-slate-700">Objetivo ${objId}</span>
                            <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">${stats.porcentajeEfectividad}% Efectividad</span>
                        </div>
                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div class="${colorBarra} h-full transition-all duration-500" style="width: ${stats.porcentajeEfectividad}%"></div>
                        </div>
                        <div class="flex justify-between text-[11px] text-slate-400 pt-1">
                            <span>Aciertos: ${stats.totalAciertos}</span>
                            <span>Total Intentos: ${stats.totalIntentos}</span>
                        </div>
                    </div>
                `;
            }

            html += `</div>`;
            container.innerHTML = html;
        })
        .catch(err => {
            console.error("Error cargando estadísticas:", err);
            container.innerHTML = `<div class="p-4 text-center text-rose-500 text-sm">Error al conectar con el servidor de estadísticas.</div>`;
        });
}
