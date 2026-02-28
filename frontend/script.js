async function sendQuery() {
    const input = document.getElementById('user-query');
    const chatMessages = document.getElementById('chat-messages');
    const query = input.value.trim();

    // Si el usuario no escribió nada, no hacemos nada
    if (!query) return;

    // Mostramos el mensaje del usuario en el chat
    chatMessages.innerHTML += `<div class="user-msg"><strong>Tú:</strong> ${query}</div>`;
    input.value = ""; // Limpiamos el input

    try {
        // Usamos await para esperar la respuesta del backend
        const response = await fetch('http://localhost:8000/decide', {
            method: 'POST', // Indicamos el tipo de petición
            headers: {
                'Content-Type': 'application/json'  // Vamos a enviar JSON
            },
            body: JSON.stringify({
                topic: query,
                filters: {}, // Por ahora vacío
                scoring_weights: {
                    "attack": 0.5,
                    "speed": 0.5
                },
                top_k: 3
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error en el servidor');
        }

        const data = await response.json();

        // 3. Renderizar los resultados de forma bonita
        let aiResponse = `<div class="ai-msg">
            <strong>IA:</strong> He analizado la tabla <i>${data.tabla}</i>. Aquí tienes el Top ${data.ganadores.length}:
            <div class="ranking-list">`;
        
        data.ganadores.forEach((p, index) => {
            aiResponse += `
                <div class="ranking-item">
                    <span class="medal">${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                    <strong>${p.name}</strong> - Score: ${p.score}
                </div>`;
        });

        aiResponse += `</div></div>`;
        chatMessages.innerHTML += aiResponse;

    } catch (error) {
        // Manejo de errores (ej: si pones "coches" y no hay tabla)
        chatMessages.innerHTML += `<div class="error-msg"><strong>⚠️ Error:</strong> ${error.message}</div>`;
    }
    
    // Auto-scroll al final
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

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
