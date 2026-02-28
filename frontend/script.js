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
    const idUnico = "doc-" + Date.now();
    const fecha = new Date().toLocaleString();
    const tamano = (file.size / 1024).toFixed(2) + " KB";

    // 1. Crear fila en estado "Analizando"
    const nuevaFila = document.createElement('tr');
    nuevaFila.id = idUnico;
    nuevaFila.innerHTML = `
        <td><strong>${file.name}</strong> (${tamano})</td>
        <td><span class="tag processing">🤖 IA Clasificando...</span></td>
        <td>${fecha}</td>
    `;
    lista.appendChild(nuevaFila);

    // 2. Leer el contenido del CSV para extraer metadatos
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        
        if (lines.length < 1) return;

        const headers = lines[0].split(',').map(h => h.trim());
        const sampleData = lines.length > 1 ? lines[1].split(',').map(d => d.trim()) : [];

        try {
            // 3. Llamada real a tu API de FastAPI
            const response = await fetch('http://localhost:8008//api/clasificar-csv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    headers: headers,
                    sample_data: sampleData
                })
            });

            const result = await response.json();
            const categoriaReal = result.categoria;

            // 4. Actualizar la UI con la respuesta de Ollama
            actualizarFila(idUnico, file.name, tamano, categoriaReal, fecha);
            notificarChat(file.name, categoriaReal);

        } catch (error) {
            console.error("Error clasificando:", error);
            actualizarFila(idUnico, file.name, tamano, "Error IA", fecha);
        }
    };

    reader.readAsText(file);
}

// Funciones auxiliares para limpiar el código
function actualizarFila(id, nombre, tamano, categoria, fecha) {
    const fila = document.getElementById(id);
    fila.innerHTML = `
        <td><strong>${nombre}</strong> (${tamano})</td>
        <td><span class="tag success">${categoria}</span></td>
        <td>${fecha}</td>
    `;
}

function notificarChat(nombre, categoria) {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML += `
        <div class="ai-msg">
            <strong>SISTEMA:</strong> He analizado <em>${nombre}</em>.<br>
            • <strong>Clasificación IA:</strong> ${categoria}.
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