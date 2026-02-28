# Política de Seguridad

Nos tomamos muy en serio la seguridad de *HackUDC2026 (Plataforma Merlin / Denodo)*. Agradecemos a la comunidad que nos ayude a mantener este proyecto seguro mediante la divulgación responsable (Responsible Disclosure).

## Versiones Soportadas

Actualmente, al tratarse de un proyecto desarrollado en el marco del HackUDC, solo ofrecemos soporte de seguridad para la rama principal:

| Versión | Soportada        |
| ------- |----------------- |
| main    |  Sí              |
| < 1.0   |  No              |

## Cómo reportar una vulnerabilidad

*Por favor, NO abras un *Issue público en GitHub para reportar una vulnerabilidad de seguridad.**

Si descubres un fallo de seguridad, te pedimos que nos lo comuniques de forma privada para que podamos evaluarlo y parchearlo antes de que se haga público. 

Envía un correo electrónico a nuestro equipo de seguridad a: angel.lopez.pintos@udc.es, laura.garciaf@udc.es,angela.gsanchez@udc.es,r.goncalves@udc.es
Por favor, incluye en tu reporte:
* Una descripción detallada de la vulnerabilidad.
* Los pasos exactos para reproducirla.
* El impacto potencial (ej. exposición de datos del CSV, inyección de código, etc.).

### Expectativas de divulgación
Acusaremos recibo de tu reporte en un plazo de 48 horas y te mantendremos informado sobre el progreso hacia una solución. Una vez que el problema esté resuelto, te reconoceremos públicamente (si lo deseas) en nuestras notas de lanzamiento.

## Gestión de Secretos (Secret Handling)

Dado que este proyecto se conecta a *Denodo Virtual DataPort* y utiliza motores de *Inteligencia Artificial*, es vital proteger las credenciales.

*NUNCA* incluyas en tus commits ni en el código fuente:
* Contraseñas o tokens de acceso a Denodo (por ejemplo, el auth_header="Basic YWRtaW46YWRtaW4=" debe pasarse a variables de entorno en producción).
* Claves de API de terceros.
* Direcciones IP internas sensibles.

Recomendamos encarecidamente utilizar un archivo .env (que ya está excluido en nuestro .gitignore) para gestionar todas las variables de entorno de forma segura durante el desarrollo local.
