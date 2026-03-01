# Registro de Cambios (Changelog) - Docai

Todos los cambios notables en este proyecto serán documentados en este archivo siguiendo el estándar de [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.0] - 2026-03-01

### Added
- **Motor de IA Local:** Implementación del núcleo de procesamiento inteligente para el manejo de documentos.
- **Selector de Dataset:** Incorporado un selector específico, incluyendo soporte para el dataset de Digimon.
- **Funcionalidad de Chat:** El chat ahora es totalmente funcional y capaz de procesar peticiones.
- **Lógica de Vistas:** Añadida la función `switchTable` en JavaScript para la gestión dinámica de tablas en la interfaz.
- **Documentación de Proyecto:** Creación de los archivos `CONTRIBUTING.md`, `AUTHORS.md`, `LICENSE` y `CHANGELOG.md`.

### Fixed
- **Estabilidad de Peticiones:** Corregidos errores de cierre inesperado durante las consultas al servidor.
- **Refinamiento de IA:** Optimización y corrección del prompt utilizado para mejorar las respuestas de la inteligencia artificial.
- **Interfaz de Usuario:** Arreglado el footer de la página y corregidos errores visuales de generalización en el layout.
- **Limpieza Técnica:** Eliminación de imports innecesarios, código muerto ("basura") y prints de depuración en consola.

### Changed
- **Interfaz Web:** Rediseño y actualización de los estilos generales en `style.css` y la estructura en `index.html`.
- **Documentación de Código:** Inclusión de comentarios técnicos detallados en el SDK (`sdk.py`).
- **Capacidad de Datos:** Mejora en el listado de datasets para mostrar información más detallada al usuario.

---

## [1.1.0] - 2026-02-28

### Added
- **Conexión con Denodo:** Integración de la plataforma de virtualización de datos para el acceso a fuentes externas.
- **Arquitectura Base:** Despliegue de la estructura fundamental del Frontend y Backend.
- **Gestión de Archivos:** Implementación de la funcionalidad para abrir y cargar archivos base del proyecto.

### Fixed
- **Gestión de Versiones:** Resolución de conflictos críticos tras los procesos de integración (*merges*) en la rama principal.

---

## [0.1.0] - 2026-02-28

### Added
- **Inicialización:** Creación del repositorio oficial en GitHub.
- **Estructura Inicial:** Primera fase de maquetación y carga de scripts esenciales (`script.js`, `style.css`).
