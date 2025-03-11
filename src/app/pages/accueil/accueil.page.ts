import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-accueil',
  templateUrl: './accueil.page.html',
  styleUrls: ['./accueil.page.scss'],
  standalone: false
})
export class AccueilPage implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  role: string | null = null;
  user: any = {};

  constructor(private router: Router, private authService: AuthService) {
    console.log('AccueilPage chargée');
  }

  ngOnInit() {
    this.refreshState();
    // Écouter les changements de localStorage (ex. déconnexion)
    window.addEventListener('storage', this.refreshState.bind(this));
  }

  ngOnDestroy() {
    // Nettoyer l’écouteur quand la page est détruite
    window.removeEventListener('storage', this.refreshState.bind(this));
  }

  refreshState() {
    const email = localStorage.getItem('email');
    this.role = localStorage.getItem('role');
    this.isLoggedIn = !!email && !!this.role;
    console.log('Accueil - État mis à jour : Connecté =', this.isLoggedIn, 'Rôle =', this.role);
    if (this.isLoggedIn) {
      this.loadUserData(email!);
    } else {
      this.user = {}; // Réinitialiser user si déconnecté
    }
  }

  loadUserData(email: string) {
    const serviceCall = this.role === 'medecin' ? this.authService.getMedecin(email) : this.authService.getUser(email);
    serviceCall.subscribe({
      next: (response) => {
        this.user = response;
        console.log('Données utilisateur chargées :', this.user);
      },
      error: (error) => {
        console.error('Erreur chargement données utilisateur :', error);
      }
    });
  }

  goToLogin() {
    console.log('Clic sur bouton Connexion détecté');
    this.router.navigate(['/login']);
  }

  goToRegister() {
    console.log('Clic sur bouton Inscription détecté');
    this.router.navigate(['/register']);
  }

  goToHome() {
    console.log('Clic sur Mon espace personnel');
    this.router.navigate(['/home']);
  }

  goToMedecin() {
    console.log('Clic sur Mon espace médecin');
    this.router.navigate(['/medecin']);
  }

  goToRendezVous() {
    console.log('Clic sur Prendre un rendez-vous');
    this.router.navigate(['/rendez-vous']);
  }
}