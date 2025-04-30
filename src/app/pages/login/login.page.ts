import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false, // Déclaré dans un module
})
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Suppression de la gestion des callbacks OAuth
  }

  async login() {
    this.errorMessage = '';
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        const role = localStorage.getItem('role');
        if (role === 'patient') {
          this.router.navigate(['/tabs/accueil']);
        } else if (role === 'medecin') {
          this.router.navigate(['/tabs-medecin/accueil-medecin']);
        }
      },
      error: async (err) => {
        console.error('Erreur connexion :', err);
        this.errorMessage = err.message || 'Échec de la connexion';
        const alert = await this.alertController.create({
          header: 'Erreur',
          message: this.errorMessage,
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}