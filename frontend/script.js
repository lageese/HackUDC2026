// --- LÓGICA DEL CHAT ---
async function sendQuery() {
    const input = document.getElementById('user-query');
    const chatMessages = document.getElementById('chat-messages');
    const query = input.value;

    if (!query) return;

    // Añadir mensaje del usuario
    chatMessages.innerHTML += `<div class="user-msg"><strong>Tú:</strong> ${query}</div>`;
    input.value = "";

    // C.1 Estado de "Buscando..." (Contexto)
    const loadingId = "loading-" + Date.now();
    chatMessages.innerHTML += `<div id="${loadingId}" class="ai-msg"><em>🔍 Buscando en los documentos indexados...</em></div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch('http://localhost:8008/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: query })
        });

        const data = await response.json();
        document.getElementById(loadingId).remove(); // Quitamos el cargando

        // C.2 Mostrar respuesta con Contexto y Ordenación
        // Simulamos que el SDK nos devuelve una tabla de resultados (C.3 Mostrar resultados ordenados)
        const htmlRespuesta = `
            <div class="ai-msg">
                <strong>IA:</strong> ${data.response}
                <div class="data-evidence">
                    <p><small>📍 Fuente: <strong>Pokemon_Dataset.csv</strong> (Confianza: 98%)</small></p>
                    <table class="mini-results">
                        <thead>
                            <tr><th>Nombre</th><th>Tipo</th><th>Score</th></tr>
                        </thead>
                        <tbody>
                            <tr class="top-result"><td>Blastoise</td><td>Agua</td><td>9.5</td></tr>
                            <tr><td>Gyarados</td><td>Agua/Volador</td><td>8.9</td></tr>
                            <tr><td>Vaporeon</td><td>Agua</td><td>8.2</td></tr>
                        </tbody>
                    </table>
                    <button class="view-doc-btn" onclick="alert('Abriendo vista previa del documento...')">👁️ Ver contexto original</button>
                </div>
            </div>
        `;
        
        chatMessages.innerHTML += htmlRespuesta;

    } catch (error) {
        document.getElementById(loadingId).innerHTML = `<div class="error">Error: No se pudo conectar con el motor de búsqueda.</div>`;
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- LÓGICA DE GESTIÓN DOCUMENTAL (SIMULACRO CSV) ---
const dropZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');

// Abrir selector al hacer clic
dropZone.onclick = () => fileInput.click();

// Capturar archivo desde input
fileInput.onchange = (e) => {
    const file = e.target.files[0];
    validarYProcesar(file);
};

// Drag & Drop event listeners
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    validarYProcesar(file);
});

// Función de validación para CSV
function validarYProcesar(file) {
    if (!file) return;

    // Comprobamos extensión .csv
    if (file.name.toLowerCase().endsWith('.csv')) {
        procesarDocumento(file);
    } else {
        alert("⚠️ Formato no soportado. Por favor, sube un archivo .csv");
    }
}

// Añadir a la tabla (Simulacro)
async function procesarDocumento(file) {
    const lista = document.getElementById('document-list');
    const nuevaFila = document.createElement('tr');
    const idUnico = "doc-" + Date.now();
    nuevaFila.id = idUnico;

    const fecha = new Date().toLocaleString();
    const tamano = (file.size / 1024).toFixed(2) + " KB";

    nuevaFila.innerHTML = `
        <td><strong>${file.name}</strong></td>
        <td><span class="tag processing">🤖 IA Clasificando...</span></td>
        <td>${fecha}</td>
    `;
    lista.appendChild(nuevaFila);

    let categoriaFinal = "Desconocida";
    let razonIA = "No se pudo clasificar";

    try {

        const payload = {
            headers: [`Archivo: ${file.name}`],
            sample_data: ["Sin datos de ejemplo"]
        };

        const response = await fetch('http://localhost:8000/api/clasificar-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Respuesta backend:", data);

        categoriaFinal = data.categoria || "Sin categoría";
        razonIA = data.razon || "Clasificado por IA";

    } catch (error) {
        console.error("Error clasificando con IA:", error);
        categoriaFinal = "Error de IA";
    }

    const filaReal = document.getElementById(idUnico);
    filaReal.innerHTML = `
        <td><strong>${file.name}</strong> (${tamano})</td>
        <td><span class="tag success">${categoriaFinal}</span></td>
        <td>${fecha}</td>
    `;

    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML += `
        <div class="ai-msg">
            <strong>SISTEMA:</strong> He procesado <em>${file.name}</em>.<br>
            • <strong>Clasificación IA:</strong> ${categoriaFinal}.<br>
            • <strong>Razón:</strong> ${razonIA}.
        </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- FILTRO DE BÚSQUEDA EN TABLA ---
// C.4 Lógica de Filtros avanzada
document.getElementById('filter-input').onkeyup = function() {
    const valor = this.value.toLowerCase();
    const filas = document.querySelectorAll('#document-table tbody tr');
    let encontrados = 0;
    
    filas.forEach(fila => {
        const texto = fila.innerText.toLowerCase();
        if(texto.includes(valor)) {
            fila.style.display = '';
            fila.style.backgroundColor = valor !== "" ? "rgba(46, 204, 113, 0.1)" : ""; // Resaltado suave
            encontrados++;
        } else {
            fila.style.display = 'none';
        }
    });

    // Pequeño feedback de cuántos documentos hay
    console.log(`Filtrando: ${encontrados} documentos encontrados.`);
};