import { computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

/*
 * Parámetros de la URL como signals, leídos de `ActivatedRoute`.
 *
 * No se usa `withComponentInputBinding()` porque, al cargarse como micro front, manda el router
 * del orquestador y este no activa esa opción: los `input()` de ruta quedarían sin valor (NG0950).
 * Deben llamarse en un contexto de inyección (p. ej. al inicializar un campo del componente).
 */

/** Parámetro de ruta (`:nombre`). Cadena vacía si la ruta no lo define. */
export function injectRouteParam(name: string): Signal<string> {
  const params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true });
  return computed(() => params().get(name) ?? '');
}

/** Query param (`?nombre=`). `undefined` si no está en la URL. */
export function injectQueryParam(name: string): Signal<string | undefined> {
  const params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });
  return computed(() => params().get(name) ?? undefined);
}
