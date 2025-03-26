import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent {
  isLoggedIn: boolean = false;
  role: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private menuCtrl: MenuController
  ) {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
    this.menuCtrl.close('mainMenu');
  }

  goToRegister() {
    this.router.navigate(['/register']);
    this.menuCtrl.close('mainMenu');
  }

  goToAccueil() {
    this.router.navigate(['/tabs/accueil']);
    this.menuCtrl.close('mainMenu');
  }

  goToProfile() {
    if (this.role === 'patient') {
      this.router.navigate(['/tabs/home']);
    } else if (this.role === 'medecin') {
      this.router.navigate(['/medecin']);
    } else {
      this.router.navigate(['/login']);
    }
    this.menuCtrl.close('mainMenu');
  }

  goToRendezVous() {
    this.router.navigate(['/rendez-vous']);
    this.menuCtrl.close('mainMenu');
  }

  goToDocuments() {
    this.router.navigate(['/documents']);
    this.menuCtrl.close('mainMenu');
  }

  goToHistorique() {
    this.router.navigate(['/historique']);
    this.menuCtrl.close('mainMenu');
  }

  goToAccueilMedecin() {
    this.router.navigate(['/accueil-medecin']);
    this.menuCtrl.close('mainMenu');
  }

  goToMedecinProfile() {
    this.router.navigate(['/medecin']);
    this.menuCtrl.close('mainMenu');
  }

  goToParametres() {
    this.router.navigate(['/tabs/parametres']);
    this.menuCtrl.close('mainMenu');
  }

  logout() {
    this.authService.logout();
    this.menuCtrl.close('mainMenu');
  }
}