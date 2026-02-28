async function sendQuery() {
    const input = document.getElementById('user-query');
    const chatMessages = document.getElementById('chat-messages');
    const query = input.value;

    if (!query) return;

    chatMessages.innerHTML += `<div class="user-msg"><strong>Tú:</strong> ${query}</div>`;
    input.value = "";

    try {
        const response = await fetch('http://localhost:8008/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: query })
        });

        const data = await response.json();
        chatMessages.innerHTML += `<div class="ai-msg"><strong>IA:</strong> ${data.response}</div>`;
    } catch (error) {
        chatMessages.innerHTML += `<div class="error">Error de conexión con AI SDK</div>`;
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
