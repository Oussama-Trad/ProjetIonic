import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

interface LoginResponse {
  access_token: string;
}

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
    console.log('Connexion avec :', this.email, this.password);

    this.authService.login(this.email, this.password).subscribe(
      (response: LoginResponse) => {
        console.log('Connexion réussie :', response);
        localStorage.setItem('token', response.access_token);
        this.router.navigate(['/home']);
      },
      (error: HttpErrorResponse) => {
        console.error('Erreur de connexion :', error);
        alert('Erreur : ' + (error.error?.msg || 'Vérifiez vos identifiants'));
      }
    );
  }
}