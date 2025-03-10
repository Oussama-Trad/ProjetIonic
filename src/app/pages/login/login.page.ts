import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

// Interface pour la réponse de l'endpoint /login
interface LoginResponse {
  access_token: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private router: Router, private authService: AuthService) {}

  login() {
    console.log('Connexion avec :', this.email, this.password);

    this.authService.login(this.email, this.password).subscribe(
      (response: LoginResponse) => {  // Ajoute le type ici
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