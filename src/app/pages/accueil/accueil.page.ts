import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-accueil',
  templateUrl: './accueil.page.html',
  styleUrls: ['./accueil.page.scss'],
  standalone: false  // Pas standalone, donc dépend de app.module.ts
})
export class AccueilPage {
  constructor(private router: Router) {
    console.log('AccueilPage chargée');
  }

  goToHelp() {
    console.log('Clic sur bouton Aide détecté');
    this.router.navigate(['/help']);  // À adapter selon ta route
  }

  goToLogin() {
    console.log('Clic sur bouton Connexion détecté');
    this.router.navigate(['/login']);
  }

  goToRegister() {
    console.log('Clic sur bouton Inscription détecté');
    this.router.navigate(['/register']);
  }
}