import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Conciliaciones',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'plataformas/:proyectoId',
    title: 'Plataforma | Conciliaciones',
    loadComponent: () => import('./features/platform/platform').then((m) => m.Platform),
  },
  {
    path: 'plataformas/:proyectoId/categorias/:procesoId',
    title: 'Categoría | Conciliaciones',
    loadComponent: () => import('./features/category/category').then((m) => m.Category),
  },
  {
    path: 'plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId',
    title: 'Canal | Conciliaciones',
    loadComponent: () => import('./features/channel/channel').then((m) => m.Channel),
  },
  {
    path: 'plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:regla',
    title: 'Regla | Conciliaciones',
    loadComponent: () => import('./features/rule/rule').then((m) => m.Rule),
  },
  {
    // "Ver detalle" de un caso de la regla (pantalla pendiente; hoy abre el stub).
    path: 'plataformas/:proyectoId/categorias/:procesoId/canales/:subProcesoId/reglas/:regla/casos/:casoId',
    title: 'Detalle | Conciliaciones',
    loadComponent: () => import('./features/rule/detail/detail').then((m) => m.Detail),
  },
];

// El orquestador consume este módulo expuesto con `.then((m) => m.default)`.
export default routes;
