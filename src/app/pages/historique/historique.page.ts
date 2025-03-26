import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-historique',
  templateUrl: './historique.page.html',
  styleUrls: ['./historique.page.scss'],
  standalone: false
})
export class HistoriquePage implements OnInit {
  historiqueRendezVous: any[] = [];
  email: string | null = null;
  medecins: { [key: string]: string } = {};

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.email = localStorage.getItem('email');
    if (this.email) {
      this.loadHistorique(this.email);
      this.loadMedecins();
    } else {
      console.error('Email non trouvé dans localStorage');
      this.router.navigate(['/login']);
    }
  }

  loadHistorique(email: string) {
    this.authService.getUser(email).subscribe({
      next: (response) => {
        this.historiqueRendezVous = response.historiqueRendezVous || [];
        console.log('Historique chargé :', this.historiqueRendezVous);
      },
      error: (err) => {
        console.error('Erreur lors du chargement de l’historique :', err);
        this.router.navigate(['/login']);
      },
    });
  }

  loadMedecins() {
    this.authService.getAllMedecins().subscribe({
      next: (response) => {
        response.forEach((medecin: any) => {
          this.medecins[medecin.email] = `${medecin.prenom} ${medecin.nom}`;
        });
      },
      error: (err) => {
        console.error('Erreur lors du chargement des médecins :', err);
      },
    });
  }

  getColor(statut: string): string {
    switch (statut) {
      case 'accepté': return 'accepted';
      case 'refusé': return 'unavailable';
      case 'en attente': return 'pending';
      default: return '';
    }
  }

  getMedecinName(medecinId: string): string {
    return this.medecins[medecinId] || medecinId;
  }
}