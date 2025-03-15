import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FlatESLint } from 'eslint/use-at-your-own-risk';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss'],
  standalone:false
})
export class TabsComponent {
  isLoggedIn: boolean = false;
  role: string | null = null;

  constructor(private router: Router, private authService: AuthService) {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
    });
  }

  goToAccueil() {
    this.router.navigate(['/accueil']);
  }

  goToAccueilMedecin() {
    this.router.navigate(['/accueil-medecin']);
  }

  goToProfile() {
    if (this.isLoggedIn) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  goToMedecinProfile() {
    if (this.isLoggedIn) {
      this.router.navigate(['/medecin']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  goToMedecins() {
    this.router.navigate(['/accueil']); // Liste des médecins
  }

  goToParametres() {
    this.router.navigate(['/parametres']);
  }
}