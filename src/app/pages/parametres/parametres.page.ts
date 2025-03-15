import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-parametres',
  templateUrl: './parametres.page.html',
  styleUrls: ['./parametres.page.scss'],
  standalone: false
})
export class ParametresPage implements OnInit {
  isDarkMode: boolean = false;
  notificationsEnabled: boolean = true;
  language: string = 'fr'; // Par défaut français

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Charger le mode actuel (clair/sombre) depuis les préférences ou détecter le système
    this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme();
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
  }

  applyTheme() {
    if (this.isDarkMode) {
      document.body.setAttribute('color-theme', 'dark');
    } else {
      document.body.removeAttribute('color-theme');
    }
    // Sauvegarder la préférence dans localStorage si nécessaire
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  toggleNotifications() {
    this.notificationsEnabled = !this.notificationsEnabled;
    // Logique pour activer/désactiver les notifications (à implémenter selon votre backend)
  }

  changeLanguage(event: any) {
    this.language = event.detail.value;
    // Logique pour changer la langue (à implémenter si nécessaire)
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}