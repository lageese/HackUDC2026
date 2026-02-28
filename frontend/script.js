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
        const response = await fetch('http://localhost:8000/interpret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: query, dataset: document.getElementById('dataset-select').value.replace('admin.', '') })
        });

        if (!response.ok) throw new Error("No he podido interpretar tu consulta");
        const data = await response.json();
        console.log("Respuesta de interpretación:", data);

        const decideRes = await fetch('http://localhost:8000/decide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: data.topic,
                filters: data.filters || {},
                scoring_weights: data.scoring_weights || {},
                top_k: data.top_k
            })
        });

        if (!decideRes.ok) throw new Error("Error al obtener ranking");
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

function procesarDocumento(file) {
    const lista = document.getElementById('document-list');
    const nuevaFila = document.createElement('tr');
    
    nuevaFila.innerHTML = `
        <td>${file.name}</td>
        <td>Usuario Local</td>
        <td><span class="tag">Procesando...</span></td>
        <td>${new Date().toLocaleDateString()}</td>
    `;
    
    lista.appendChild(nuevaFila);
}

document.getElementById('filter-input').onkeyup = function() {
    const valor = this.value.toLowerCase();
    const filas = document.querySelectorAll('#document-table tbody tr');
    
    filas.forEach(fila => {
        const texto = fila.innerText.toLowerCase();
        fila.style.display = texto.includes(valor) ? '' : 'none';
    });
};

function renderizarRanking(data, explanation, weights = {}) {
    const chatMessages = document.getElementById('chat-messages');

    const hasScore = weights && Object.keys(weights).length > 0;
    
    // 1. Empezamos el mensaje con la explicación de la IA
    // Usamos backticks (`) para poder meter HTML fácilmente
    let html = `
        <div class="ai-msg">
        ${explanation || "He encontrado estos resultados para ti:"}
            <br><hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">
    `;
    
    // 2. Comprobamos si hay resultados en el array ganadores
    if (data.ganadores && data.ganadores.length > 0) {
        
        // Definimos iconos para el Top 3
        const medals = ["🥇", "🥈", "🥉"];

        // 3. Iteramos sobre los resultados
        data.ganadores.forEach((item, index) => {
            const icon = medals[index] || "·"; // Si hay más de 3, usa un punto
            const scoreDisplay = hasScore ? `<span style="color: #4a9eff; font-size: 0.9em; margin-left: 10px;">(Puntuación: ${item.score})</span>` : "";
            
            html += `
                <div class="ranking-item" style="margin-bottom: 8px;">
                    ${icon} <b>${item.name}</b> ${scoreDisplay}
                </div>
            `;
        });
    } else {
        // Si la lista está vacía
        html += `<p>No se han encontrado registros que coincidan con los criterios.</p>`;
    }

    html += `</div>`; // Cerramos el div principal

    // 4. Inyectamos todo el HTML de golpe en el chat
    chatMessages.innerHTML += html;

    // 5. Scroll automático hacia abajo para ver el nuevo mensaje
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
