Rol: Actúa como Ingeniero de QA Automation Senior especializado en el stack MERN/PERN.

Contexto: Tengo un proyecto con Backend en Node.js y Frontend en React. Necesito crear pruebas E2E (End-to-End) sin instalar nada a nivel global en mi macOS.

Tarea: Redacta el código completo para configurar un entorno de pruebas automatizadas siguiendo estas reglas:

Framework: Utiliza Playwright con TypeScript (mejor autocompletado para React).

Cero Instalación Global: Provee el comando para inicializarlo localmente en la carpeta del proyecto (npx playwright install).

Arquitectura: Implementa el patrón Page Object Model (POM) para separar la lógica de los selectores de las pruebas.

Aislamiento (Docker): Genera un archivo docker-compose.test.yml que levante el Backend, el Frontend y un contenedor de Playwright para ejecutar las pruebas en un entorno aislado.

Flujo de Prueba: Crea un script de ejemplo que:

Levante la app de React.

Realice un login interactuando con formularios de React.

Verifique que el estado de la UI cambie correctamente después de una petición al API de Node.js.

Salida: Estructura de carpetas recomendada, archivos de configuración de Playwright y el Dockerfile necesario