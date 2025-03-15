import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone:false
})
export class HeaderComponent implements OnInit {
  user: any = {};
  darkMode: boolean = false;
  isLoggedIn: boolean = false;

  constructor(private authService: AuthService) {}

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
            error: (err) => console.error('Erreur dans header :', err),
          });
        }
      } else {
        this.user = {};
      }
    });

    this.authService.settings$.subscribe((settings) => {
      this.darkMode = settings.darkMode;
    });
  }

  updateProfilePicture() {
    alert('Fonctionnalité de mise à jour de la photo à implémenter !');
  }

  logout() {
    this.authService.logout();
  }
}