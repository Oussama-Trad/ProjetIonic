import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private router: Router, private authService: AuthService) {}

  login() {
    console.log('Tentative de connexion avec :', this.email, this.password);

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('Réponse du backend :', response);
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('email', response.email);
        console.log('Token et email stockés :', { token: localStorage.getItem('token'), email: localStorage.getItem('email') });
        this.router.navigate(['/home']).then(() => console.log('Redirection réussie vers /home après connexion'));
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur complète :', error);
        alert('Erreur : ' + (error.error?.msg || 'Connexion échouée'));
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  goBackToHome() {
    console.log('Clic sur le bouton Retour détecté');  // Log pour confirmer le clic
    const storedEmail = localStorage.getItem('email');
    console.log('Retour à l’accueil, email actuel dans localStorage :', storedEmail);
    if (storedEmail) {
      this.router.navigate(['/home']);
    } else {
      console.log('Pas d’email dans localStorage, redirection vers /login');
      this.router.navigate(['/login']);
    }
  }
}