import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.authService.login(this.email, this.password).subscribe({
      next: (response: any) => {
        localStorage.setItem('email', this.email);
        localStorage.setItem('token', response.token);
        localStorage.setItem('role', response.role);
        const redirect = response.role === 'medecin' ? '/accueil-medecin' : '/accueil';
        this.router.navigate([redirect]);
      },
      error: (err) => alert('Erreur de connexion : ' + (err.error?.msg || 'Échec'))
    });
  }

  goToRegister() { // Ajout de la méthode
    this.router.navigate(['/register']);
  }
}