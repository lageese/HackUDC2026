// --- LÓGICA DEL CHAT ---
async function sendQuery() {
    const input = document.getElementById('user-query');
    const chatMessages = document.getElementById('chat-messages');
    const query = input.value;

    if (!query) return;

    // Mostrar mensaje del usuario
    chatMessages.innerHTML += `<div class="user-msg"><strong>Tú:</strong> ${query}</div>`;
    input.value = "";

    try {
        // En el simulacro, llamamos al SDK de Denodo (puerto 8008)
        const response = await fetch('http://localhost:8008/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: query })
        });

        const data = await response.json();
        chatMessages.innerHTML += `<div class="ai-msg"><strong>IA:</strong> ${data.response}</div>`;
    } catch (error) {
        chatMessages.innerHTML += `<div class="error">Error de conexión con AI SDK (¿Está el contenedor encendido?)</div>`;
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
function procesarDocumento(file) {
    const lista = document.getElementById('document-list');
    const nuevaFila = document.createElement('tr');
    
    // Metadatos automáticos para el simulacro
    const fecha = new Date().toLocaleDateString();
    const autor = "Admin_User";
    const categoria = "Dataset Estructurado";

    nuevaFila.innerHTML = `
        <td><strong>${file.name}</strong></td>
        <td>${autor}</td>
        <td><span class="tag">CSV Indexado</span></td>
        <td>${fecha}</td>
    `;
    
    lista.appendChild(nuevaFila);

    // Feedback en el chat (Opcional, hace que la IA parezca consciente del archivo)
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML += `<div class="ai-msg"><em>SISTEMA: Documento <strong>${file.name}</strong> indexado correctamente en Denodo. Ya puedes hacer preguntas sobre estos datos.</em></div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- FILTRO DE BÚSQUEDA EN TABLA ---
document.getElementById('filter-input').onkeyup = function() {
    const valor = this.value.toLowerCase();
    const filas = document.querySelectorAll('#document-table tbody tr');
    
    filas.forEach(fila => {
        const texto = fila.innerText.toLowerCase();
        fila.style.display = texto.includes(valor) ? '' : 'none';
    });
};