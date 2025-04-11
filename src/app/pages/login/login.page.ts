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
    this.route.queryParams.subscribe((params) => {
      if (params['access_token']) {
        this.authService.handleOAuthCallback(params);
      }
    });
  }

  async login() {
    this.errorMessage = '';
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        const role = localStorage.getItem('role');
        if (role === 'patient') {
          this.router.navigate(['/tabs/accueil']);
        } else if (role === 'medecin') {
          this.router.navigate(['/accueil-medecin']);
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

  loginWithGoogle() {
    this.authService.loginWithGoogle();
  }

  loginWithFacebook() {
    this.authService.loginWithFacebook();
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}