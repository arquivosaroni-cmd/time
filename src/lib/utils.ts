import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resetBodyPointerEvents() {
  if (typeof document !== 'undefined' && document.body.style.pointerEvents === 'none') {
    document.body.style.pointerEvents = 'auto';
  }
}

/**
 * Garante que o valor fornecido (Date, Timestamp ou string) seja convertido para um objeto Date válido.
 * Essencial para evitar erros de compilação e runtime no servidor (SSR).
 */
export function ensureDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof val.toDate === 'function') return val.toDate();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}
