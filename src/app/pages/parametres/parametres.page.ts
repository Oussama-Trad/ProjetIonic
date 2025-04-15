import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-parametres',
  templateUrl: './parametres.page.html',
  styleUrls: ['./parametres.page.scss'],
  standalone: false
})
export class ParametresPage implements OnInit {
  darkMode: boolean = false;
  language: string = 'fr';
  theme: string = 'light';
  isLoggedIn: boolean = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.settings$.subscribe((settings) => {
      this.darkMode = settings.darkMode;
      this.language = settings.language;
      this.theme = settings.theme;
    });
    this.authService.isLoggedIn$.subscribe((isLoggedIn) => {
      this.isLoggedIn = isLoggedIn;
    });
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    this.theme = this.darkMode ? 'dark' : 'light';
    this.authService.updateSettings(this.darkMode, this.language, this.theme).subscribe({
      next: () => console.log('Mode sombre mis à jour'),
      error: (err) => console.error('Erreur lors de la mise à jour du mode sombre:', err),
    });
  }

  changeLanguage(event: any) {
    this.language = event.detail.value;
    this.authService.updateSettings(this.darkMode, this.language, this.theme).subscribe({
      next: () => console.log('Langue mise à jour'),
      error: (err) => console.error('Erreur lors de la mise à jour de la langue:', err),
    });
  }
}