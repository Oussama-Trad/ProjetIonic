import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-accueil-medecin',
  templateUrl: './accueil-medecin.page.html',
  styleUrls: ['./accueil-medecin.page.scss'],
  standalone: false
})
export class AccueilMedecinPage implements OnInit {
  medecin: any = {};
  rendezVousDemandes: any[] = [];
  rendezVousConfirmes: any[] = [];
  email: string | null = null;
  isLoggedIn: boolean = false;
  role: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      this.email = localStorage.getItem('email');

      if (this.isLoggedIn && this.role === 'medecin' && this.email) {
        this.loadMedecinData(this.email);
        this.loadRendezVous(this.email);
      } else {
        console.error('Utilisateur non connecté ou rôle incorrect');
        this.router.navigate(['/login']);
      }
    });
  }

  loadMedecinData(email: string) {
    this.authService.getMedecin(email).subscribe({
      next: (response) => {
        this.medecin = response;
        console.log('Médecin chargé :', this.medecin);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des données médecin :', err);
        this.router.navigate(['/login']);
      },
    });
  }

  loadRendezVous(email: string) {
    this.authService.getMedecinDisponibilites(email).subscribe({
      next: (response) => {
        this.rendezVousDemandes = response.rendezVousDemandes || [];
        this.rendezVousConfirmes = response.rendezVousConfirmes || [];
        console.log('Rendez-vous demandés chargés :', this.rendezVousDemandes);
        console.log('Rendez-vous confirmés chargés :', this.rendezVousConfirmes);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des rendez-vous :', err);
      },
    });
  }

  manageRendezVous(rdv: any, action: string) {
    if (!this.email) {
      console.error('Email non trouvé dans localStorage');
      alert('Erreur : utilisateur non identifié.');
      this.router.navigate(['/login']);
      return;
    }
    this.authService.manageRendezVous(rdv.userEmail, rdv.date, rdv.heure, action).subscribe({
      next: (response) => {
        console.log(`Rendez-vous ${action} avec succès :`, response);
        this.loadRendezVous(this.email!); // Recharger les rendez-vous après l'action
        alert(`Rendez-vous ${action === 'accept' ? 'accepté' : 'refusé'} avec succès !`);
      },
      error: (err) => {
        console.error(`Erreur lors de l'action ${action} sur le rendez-vous :`, err);
        const errorMsg = err.message || `Erreur lors de l'action ${action}`;
        alert(errorMsg);
        if (err.status === 403) {
          alert('Accès refusé : vous n’êtes pas autorisé à effectuer cette action.');
        } else if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      },
    });
  }

  addConsultation(rdv: any) {
    this.router.navigate(['/consultation'], {
      queryParams: {
        userEmail: rdv.userEmail,
        date: rdv.date,
        heure: rdv.heure,
      },
    });
  }

  viewDocuments(userEmail: string) {
    this.router.navigate(['/documents'], { queryParams: { userEmail } });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}