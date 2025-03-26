import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
  standalone: false,
})
export class TabsComponent {
  isLoggedIn: boolean = false;
  role: string | null = null;

  constructor(private router: Router, private authService: AuthService) {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      console.log('TabsComponent - isLoggedIn:', this.isLoggedIn, 'role:', this.role);
    });
  }

  goToAccueil() {
    console.log('Navigation vers Accueil');
    this.router.navigate(['/tabs/accueil']);
  }

  goToMedecins() {
    console.log('Navigation vers Tous les Médecins');
    this.router.navigate(['/tabs/tous-les-medecins']);
  }

  goToProfile() {
    console.log('Navigation vers Profil');
    if (this.isLoggedIn) {
      if (this.role === 'patient') {
        this.router.navigate(['/tabs/home']);
      } else if (this.role === 'medecin') {
        this.router.navigate(['/medecin']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  goToParametres() {
    console.log('Navigation vers Paramètres');
    if (this.isLoggedIn) {
      this.router.navigate(['/tabs/parametres']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}