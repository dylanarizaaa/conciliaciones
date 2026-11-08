import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Rule } from './rule';

describe('Rule', () => {
  let component: Rule;
  let fixture: ComponentFixture<Rule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rule],
    }).compileComponents();

    fixture = TestBed.createComponent(Rule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
