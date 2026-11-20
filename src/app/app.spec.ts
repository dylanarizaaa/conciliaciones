import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../environments/environment';
import { App } from './app';
import { API_BASE_URL } from './core/config/api-base-url';

@Component({ template: '<a href="/">Pantalla</a>' })
class Pantalla {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the router outlet inside the main landmark', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main router-outlet')).not.toBeNull();
  });

  it('al cambiar de pantalla lleva el foco al contenido principal (no en la carga ni con query params)', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Pantalla },
          { path: 'otra', component: Pantalla },
        ]),
      ],
    });
    const fixture = TestBed.createComponent(App);
    document.body.appendChild(fixture.nativeElement);
    const router = TestBed.inject(Router);
    const main = (fixture.nativeElement as HTMLElement).querySelector('main') as HTMLElement;
    try {
      await router.navigateByUrl('/');
      await fixture.whenStable();
      expect(document.activeElement).not.toBe(main);

      await router.navigateByUrl('/?pagina=2');
      await fixture.whenStable();
      expect(document.activeElement).not.toBe(main);

      await router.navigateByUrl('/otra');
      await fixture.whenStable();
      expect(document.activeElement).toBe(main);
    } finally {
      fixture.nativeElement.remove();
    }
  });

  it('la URL de la API sale del ambiente si nadie la sobrescribe', () => {
    expect(TestBed.inject(API_BASE_URL)).toBe(environment.apiBaseUrl);
  });
});
