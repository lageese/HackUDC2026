//  SPDX-License-Identifier: MIT
// Copyright (c) 2026 Los Papus de la Hack


function switchTab(view) {
    const aiView = document.getElementById('ai-view');
    const docsView = document.getElementById('docs-view');
    const buttons = document.querySelectorAll('.nav-btn');

    if (view === 'ai') {
        aiView.style.display = 'block';
        docsView.style.display = 'none';
        buttons[0].classList.add('active');
        buttons[1].classList.remove('active');
    } else {
        aiView.style.display = 'none';
        docsView.style.display = 'block';
        buttons[0].classList.remove('active');
        buttons[1].classList.add('active');
    }
}

async function sendQuery() {
    const input = document.getElementById('user-query');
    const chatMessages = document.getElementById('chat-messages');
    const query = input.value.trim();

    if (!query) return;

    chatMessages.innerHTML += `<div class="user-msg"><strong>Tú:</strong> ${query}</div>`;
    input.value = "";

    const loadingId = "loading-" + Date.now();
    chatMessages.innerHTML += `<div id="${loadingId}" class="ai-msg"><i>🤖 Pensando...</i></div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch('https://electrophysiologic-marisha-unschematised.ngrok-free.dev/interpret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: query, dataset: document.getElementById('dataset-select').value.replace('admin.', '') })
        });

        if (!response.ok) throw new Error("No he podido interpretar tu consulta");
        const data = await response.json();
        console.log("Respuesta de interpretación:", data);

        const decideRes = await fetch('https://electrophysiologic-marisha-unschematised.ngrok-free.dev/decide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: data.topic,
                display_column: data.display_column,
                filters: data.filters || {},
                scoring_weights: data.scoring_weights || {},
                top_k: data.top_k
            })
        });

        if(decideRes.status === 400) {
            const errorData = await decideRes.json();
            throw new Error(errorData.detail || "La tabla no es relevante");
        }

        if (decideRes.status === 502) {
            const errorData = await decideRes.json();
            throw new Error(errorData.detail || "Error al buscar la tabla :/");
        }
        
        const finalData = await decideRes.json();

        document.getElementById(loadingId).remove();
        renderizarRanking(finalData, data.explanation, data.scoring_weights);

    } catch (error) {
        document.getElementById(loadingId)?.remove();
        chatMessages.innerHTML += `<div class="error">⚠️ ${error.message}</div>`;
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

const dropZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');

dropZone.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        procesarDocumento(file);
    }
};

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
    if (file) procesarDocumento(file);
});

async function procesarDocumento(file) {
    const lista = document.getElementById('document-list');
    const nuevaFila = document.createElement('tr');
    
    nuevaFila.innerHTML = `
        <td>${file.name}</td>
        <td>Usuario Local</td>
        <td><span class="tag">Procesando...</span></td>
        <td>${new Date().toLocaleDateString()}</td>
    `;
    
    lista.appendChild(nuevaFila);

    const formData = new FormData();
    formData.append("file", file);

    try {
        // Llamamos al nuevo endpoint que vamos a crear en FastAPI
        const response = await fetch('https://electrophysiologic-marisha-unschematised.ngrok-free.dev/api/upload-csv', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log("Respuesta backend:", data);
        
        // ... (actualizar la UI con la categoría que devuelva el backend) ...
        
        // ¡Magia para el Chat! Añadimos el nuevo CSV como opción en los radio buttons
        const radioGroup = document.querySelector('.dataset-radio-group');
        const cleanName = file.name.replace('.csv', '');
        radioGroup.innerHTML += `
            <div class="dataset-option">
                <input type="radio" id="db-${cleanName}" name="dataset-selection" value="${cleanName}">
                <label for="db-${cleanName}">
                    <span class="icon">📄</span> ${file.name}
                </label>
            </div>
        `;
        // Reasignamos los event listeners a los nuevos radio buttons
        document.querySelectorAll('input[name="dataset-selection"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('dataset-select').value = e.target.value;
            });
        });

    } catch (error) {
        console.error("Error subiendo el CSV:", error);
    }
}

document.getElementById('filter-input').onkeyup = function() {
    const valor = this.value.toLowerCase();
    const filas = document.querySelectorAll('#document-table tbody tr');
    
    filas.forEach(fila => {
        const texto = fila.innerText.toLowerCase();
        fila.style.display = texto.includes(valor) ? '' : 'none';
    });
};

document.querySelectorAll('input[name="dataset-selection"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        document.getElementById('dataset-select').value = e.target.value;
        console.log("Dataset cambiado a:", e.target.value);
    });
});

function renderizarRanking(data, explanation, weights = {}) {
    const chatMessages = document.getElementById('chat-messages');

    const hasScore = weights && Object.keys(weights).length > 0;
    
    let html = `
        <div class="ai-msg">
        ${explanation || "He encontrado estos resultados para ti:"}
            <br><hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">
    `;
    
    if (data.ganadores && data.ganadores.length > 0) {
        
        const medals = ["🥇", "🥈", "🥉"];

        data.ganadores.forEach((item, index) => {
            const icon = medals[index] || "·";
            const scoreDisplay = hasScore ? `<span class="score-tag">(Puntuación: ${item.score})</span>` : "";
            
            html += `
                <div class="ranking-item" style="margin-bottom: 8px;">
                    ${icon} <b>${item.name}</b> ${scoreDisplay}
                </div>
            `;
        });
    } else {
        html += `<p>No se han encontrado registros que coincidan con los criterios.</p>`;
    }

    html += `</div>`;

    chatMessages.innerHTML += html;

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function validarYProcesar(file) {
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.csv')) {
        procesarDocumento(file);
    } else {
        alert("⚠️ Formato no soportado. Por favor, sube un archivo .csv");
    }
}

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

        const response = await fetch('https://electrophysiologic-marisha-unschematised.ngrok-free.dev/api/clasificar-csv', {
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
    const fileURL = URL.createObjectURL(file);

    filaReal.innerHTML = `
        <td>
            <strong class="doc-link" style="cursor:pointer; color:#2ecc71;">
                ${file.name}
            </strong> (${tamano})
        </td>
        <td><span class="tag success">${categoriaFinal}</span></td>
        <td>${fecha}</td>
    `;
    filaReal.querySelector('.doc-link').addEventListener('click', () => {
        window.open(fileURL, '_blank');
    });

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

document.getElementById('filter-input').onkeyup = function() {
    const valor = this.value.toLowerCase();
    const filas = document.querySelectorAll('#document-table tbody tr');
    let encontrados = 0;
    
    filas.forEach(fila => {
        const texto = fila.innerText.toLowerCase();
        if(texto.includes(valor)) {
            fila.style.display = '';
            fila.style.backgroundColor = valor !== "" ? "rgba(46, 204, 113, 0.1)" : "";
            encontrados++;
        } else {
            fila.style.display = 'none';
        }
    });

    console.log(`Filtrando: ${encontrados} documentos encontrados.`);
};

// Verificamos el estado del backend
const STATUS_URL = window.location.hostname === "localhost" 
    ? "http://localhost:8000/" 
    : "https://electrophysiologic-marisha-unschematised.ngrok-free.dev/";

async function checkBackendStatus() {
    const dot = document.getElementById('status-dot');
    const badge = document.getElementById('status-badge');

    try {
        const response = await fetch(STATUS_URL, { method: 'GET' });

        if (response.ok) {
            dot.classList.remove('offline');
            dot.classList.add('online');
            badge.innerText = "SISTEMA ACTIVO";
        } else {
            throw new Error();
        }
    } catch (error) {
        dot.classList.remove('online');
        dot.classList.add('offline');
        badge.innerText = "SISTEMA OFFLINE";
    }
}

checkBackendStatus();
setInterval(checkBackendStatus, 10000); // Verificamos el estado cada 10 segundos