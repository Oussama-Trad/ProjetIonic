import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-parametres',
  templateUrl: './parametres.page.html',
  styleUrls: ['./parametres.page.scss'],
  standalone:false
})
export class ParametresPage implements OnInit {
  isLoggedIn: boolean = false;
  darkMode: boolean = false;
  language: string = 'fr';
  user: any = {};

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        const email = localStorage.getItem('email');
        const role = localStorage.getItem('role');
        if (email) {
          const fetchMethod = role === 'medecin' ? this.authService.getMedecin : this.authService.getUser;
          fetchMethod(email).subscribe({
            next: (response) => {
              this.user = response;
            },
            error: (err) => console.error('Erreur chargement données :', err),
          });
        }
      }
    });

    this.authService.settings$.subscribe((settings) => {
      this.darkMode = settings.darkMode;
      this.language = settings.language;
    });
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    this.authService.updateSettings(this.darkMode, this.language).subscribe({
      next: () => console.log('Mise à jour dark mode réussie'),
      error: (err) => console.error('Erreur mise à jour dark mode :', err),
    });
  }

  changeLanguage(event: any) {
    this.language = event.detail.value;
    this.authService.updateSettings(this.darkMode, this.language).subscribe({
      next: () => console.log('Mise à jour langue réussie'),
      error: (err) => console.error('Erreur mise à jour langue :', err),
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}