import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * URL base de la API. Tiene un valor por defecto para que el microfrontend funcione igual
 * de forma independiente o cargado desde el shell; puede sobrescribirse con un provider.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});
