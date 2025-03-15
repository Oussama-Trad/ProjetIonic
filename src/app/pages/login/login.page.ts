import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,

})
export class LoginPage {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.errorMessage = ''; // Réinitialiser le message d'erreur
    this.authService.login(this.email, this.password).subscribe({
      next: (response: any) => {
        if (response.role === 'patient') {
          this.router.navigate(['/accueil']);
        } else if (response.role === 'medecin') {
          this.router.navigate(['/accueil-medecin']);
        }
      },
      error: (err: any) => {
        this.errorMessage = err.message || 'Échec de la connexion. Vérifiez vos identifiants.';
        console.error('Erreur de connexion :', err);
      },
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}