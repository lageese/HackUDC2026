# DOCAI

Aplicación web que permite:

- Consultar datasets mediante lenguaje natural
- Generar rankings inteligentes
- Subir documentos CSV
- Clasificarlos automáticamente en categorías usando IA local (Ollama)
- Conectarse a Denodo como fuente de datos

---

# Configuración de Denodo

La aplicación consulta los datos a través de **Denodo**, por lo que es necesario instalar y configurar la plataforma previamente.

🔗 Descargar desde: https://www.denodo.com

## Pasos básicos de configuración:

1. Instalar Denodo Platform.
2. Abrir el **Denodo Platform Control Center**.
3. Iniciar el servidor **Virtual DataPort (VDP)**.
4. Verificar que el servidor esté corriendo (por defecto en `localhost:9999`).
5. Crear o verificar la base de datos virtual que utilizará la aplicación.
6. Asegurar que el usuario configurado tenga permisos de lectura sobre las vistas necesarias.

En el backend deberán configurarse las credenciales correspondientes (host, puerto, usuario, contraseña y base de datos).

---

# Instalación de la API (Backend - FastAPI)

## Paso 1: Crear un entorno virtual

Desde la raíz del proyecto:

### En Windows:

```bash
python -m venv venv
venv\Scripts\activate
```
### En Mac/Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

## Paso 2: Instalar dependencias

Con el entorno virtual activado:

```bash
pip install -r requirements.txt
```

# Instalación de Ollama (IA Open Source)

Para la organización automática de archivos en categorías se utiliza Ollama, una inteligencia artificial open source que se ejecuta en local.

Descargar Ollama
🔗 https://ollama.com/download

Instalar la versión correspondiente a tu sistema operativo.

Verificar instalación
```bash
ollama --version
```

Si muestra la versión instalada, está correctamente configurado.

Descargar el modelo Llama 3

La aplicación utiliza el modelo llama3 para clasificación.

```bash
ollama pull llama3
Probar que funciona
ollama run llama3
```

Si el modelo responde, la instalación es correcta.

# Ejecutar la aplicación
## Paso 1: Lanzar la API

Desde la carpeta del backend:
```bash
uvicorn main:app --reload --port 8000
```
La API quedará disponible en http://localhost:8000

Documentación automática en http://localhost:8000/docs

## Paso 2: Ejecutar el frontend

Abrir el archivo `index.html`

O servirlo con un servidor local:

```bash
python -m http.server 5500
```

Y acceder a http://localhost:5500

---

🧠 Flujo de funcionamiento

El usuario sube un archivo CSV.

El backend envía información del archivo a Ollama.

El modelo llama3 devuelve una categoría en formato JSON.

El documento se clasifica automáticamente en la interfaz.

El usuario puede realizar consultas en lenguaje natural.

La aplicación consulta Denodo y genera rankings dinámicos.