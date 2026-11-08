import type { Resource } from '@angular/core';

/**
 * Valor del recurso o `undefined` si aún no hay valor.
 *
 * `resource.value()` lanza `ResourceValueError` cuando el recurso está en error; los `computed`
 * que derivan datos para la vista deben leerlo con esta función para no romper la página.
 */
export function resourceValue<T>(resource: Resource<T>): T | undefined {
  return resource.hasValue() ? resource.value() : undefined;
}
