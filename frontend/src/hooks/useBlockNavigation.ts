import { useEffect } from "react";

/**
 * Bloquea el botón atrás Y adelante del navegador.
 * Funciona empujando continuamente el estado actual al historial.
 */
export function useBlockNavigation() {
  useEffect(() => {
    // Empuja dos entradas para bloquear tanto atrás como adelante
    window.history.pushState(null, "", window.location.href);
    window.history.pushState(null, "", window.location.href);

    const handlePop = () => {
      // Cada vez que se intenta navegar, vuelve a empujar
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);
}