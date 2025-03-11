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

  constructor(private router: Router, private authService: AuthService) {
    console.log('LoginPage chargée');
  }

  login() {
    console.log('Tentative de connexion avec :', this.email, this.password);

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('Réponse du backend :', response);
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('email', response.email);
        localStorage.setItem('role', response.role);
        console.log('Token, email et rôle stockés :', {
          token: localStorage.getItem('token'),
          email: localStorage.getItem('email'),
          role: localStorage.getItem('role')
        });

        if (response.role === 'medecin') {
          this.router.navigate(['/medecin']).then(() => console.log('Redirection réussie vers /medecin'));
        } else {
          this.router.navigate(['/home']).then(() => console.log('Redirection réussie vers /home'));
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur complète :', error);
        alert('Erreur : ' + (error.error?.msg || 'Connexion échouée'));
      }
    });
  }

  goToRegister() {
    console.log('Redirection vers /register');
    this.router.navigate(['/register']);
  }
}