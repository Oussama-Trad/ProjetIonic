import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilMedecinPage } from './profil-medecin.page';

describe('ProfilMedecinPage', () => {
  let component: ProfilMedecinPage;
  let fixture: ComponentFixture<ProfilMedecinPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfilMedecinPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
