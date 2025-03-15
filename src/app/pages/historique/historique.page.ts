import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-historique',
  templateUrl: './historique.page.html',
  styleUrls: ['./historique.page.scss'],
  standalone:false
})
export class HistoriquePage implements OnInit {
  isLoggedIn: boolean = false;
  role: string | null = null;
  email: string | null = null;
  historique: any[] = [];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      this.email = localStorage.getItem('email');
      if (this.isLoggedIn && this.role === 'patient') {
        this.loadHistorique();
      } else if (this.role === 'medecin') {
        this.router.navigate(['/accueil-medecin']);
      }
    });
  }

  loadHistorique() {
    if (this.email) {
      this.authService.getUser(this.email).subscribe({
        next: (response: any) => {
          this.historique = response.consultations || [];
        },
        error: (err) => console.error('Erreur chargement historique :', err)
      });
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}