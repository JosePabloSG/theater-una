# TEATRO-UNA: Selección de Asientos

Este proyecto implementa una interfaz interactiva para la selección de asientos en una sala de teatro, inspirada en los requisitos de un ejercicio práctico.

**Aplicación Desplegada:** [https://theater-una.vercel.app/](https://theater-una.vercel.app/)

## Descripción

El objetivo principal era diseñar y desarrollar una vista para la reserva de asientos de la sala principal del teatro "TEATRO-UNA". La aplicación permite a los usuarios visualizar la disposición de la sala, seleccionar el número de boletos deseados, elegir asientos específicos o aceptar sugerencias automáticas, y ver un resumen de su compra antes de confirmar.

## Características Principales

*   **Representación Visual:** Muestra el escenario y la disposición de los asientos por filas y números.
*   **Estados de Asientos:** Indica claramente si los asientos están disponibles, ocupados, seleccionados manualmente (amarillo), sugeridos (azul intermitente) o seleccionados a través de sugerencia (azul fijo).
*   **Selección de Cantidad:** Permite al usuario elegir cuántos boletos desea (entre 1 y 10).
*   **Algoritmo de Sugerencia:** Sugiere automáticamente los mejores asientos disponibles consecutivos, priorizando las filas más cercanas al centro.
*   **Selección Interactiva:** El usuario puede hacer clic en los asientos disponibles/sugeridos para seleccionarlos, respetando el límite de boletos elegidos.
*   **Usar Sugerencias:** Un botón permite seleccionar directamente los asientos sugeridos por el algoritmo.
*   **Resumen de Compra:** Muestra los asientos seleccionados, el precio por boleto, el cálculo del IVA (13%) y el total.
*   **Botón de Confirmación:** Un botón para proceder con la reserva (actualmente sin funcionalidad de backend).
*   **Pie de Página:** Incluye información de contacto y horarios del teatro.

## Pila Tecnológica

Aunque el ejercicio originalmente sugería HTML, CSS y JavaScript (con Bootstrap opcional), este proyecto fue implementado utilizando:

*   **Framework:** Next.js (React)
*   **Lenguaje:** TypeScript
*   **Estilos:** Tailwind CSS
*   **Gestor de Paquetes:** pnpm

## Contexto del Ejercicio

Este proyecto se basa en dos ejercicios:

1.  **Diseño de la Vista:** Crear la maquetación HTML y CSS (o Bootstrap) de la sala, incluyendo escenario, asientos, formulario de cantidad y pie de página.
2.  **Funcionalidad JavaScript:** Implementar la lógica de selección usando JavaScript, representando los asientos como objetos (con ID entero y estado booleano) y creando una función `suggest` para encontrar asientos consecutivos disponibles cerca del centro.

La implementación actual cumple con los objetivos funcionales pero utiliza una pila tecnológica moderna (React/Next.js/TypeScript/Tailwind) y adapta las estructuras de datos (ID de asiento como string, estados más detallados) para ajustarse mejor a las capacidades del framework.

## Ejecución Local (Ejemplo)

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.
