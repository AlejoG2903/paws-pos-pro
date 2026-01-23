import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea números sin decimales (o con decimales especificados)
 * @param valor - Número o string a formatear
 * @param decimales - Cantidad de decimales a mostrar (por defecto 0)
 */
export function formatearNumero(valor: number | string, decimales: number = 0): string {
  const num = typeof valor === 'string' ? parseFloat(valor.replace(/[^\d.-]/g, '')) : valor;
  if (isNaN(num)) return '0';
  return num.toLocaleString('es-CO', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  });
}
