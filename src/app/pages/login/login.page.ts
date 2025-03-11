import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone:false
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private authService: AuthService, private router: Router) {
    console.log('LoginPage chargée');
  }

  login() {
    console.log('Tentative de connexion avec :', { email: this.email, password: this.password });
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('Réponse du serveur :', response);
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('email', response.email);
        localStorage.setItem('role', response.role);
        console.log('localStorage après connexion :', {
          token: localStorage.getItem('token'),
          email: localStorage.getItem('email'),
          role: localStorage.getItem('role')
        });
        const redirectPath = response.role === 'medecin' ? '/medecin' : '/home';
        this.router.navigate([redirectPath], { replaceUrl: true });
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