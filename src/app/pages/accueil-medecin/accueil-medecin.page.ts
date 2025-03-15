import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-accueil-medecin',
  templateUrl: './accueil-medecin.page.html',
  styleUrls: ['./accueil-medecin.page.scss'],
  standalone:false
})
export class AccueilMedecinPage implements OnInit {
  medecin: any = {};
  isLoggedIn: boolean = false;
  role: string | null = null;
  rendezVousDemandes: any[] = [];
  rendezVousConfirmes: any[] = [];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      if (loggedIn && this.role === 'medecin') {
        const email = localStorage.getItem('email');
        if (email) {
          this.loadMedecinData(email);
        }
      } else if (this.role === 'patient') {
        this.router.navigate(['/accueil']);
      }
    });
  }

  loadMedecinData(email: string) {
    this.authService.getMedecin(email).subscribe({
      next: (response: any) => {
        this.medecin = response;
        this.rendezVousDemandes = response.rendezVousDemandes || [];
        this.rendezVousConfirmes = response.rendezVousConfirmes || [];
      },
      error: (err: any) => console.error('Erreur chargement données médecin :', err),
    });
  }

  manageRendezVous(rdv: any, action: 'accept' | 'reject') {
    this.authService.manageRendezVous(rdv.userEmail, rdv.date, rdv.heure, action).subscribe({
      next: () => {
        this.loadMedecinData(this.medecin.email);
      },
      error: (err: any) => console.error(`Erreur ${action} rendez-vous :`, err),
    });
  }

  cancelRendezVous(rdv: any) {
    this.authService.cancelRendezVous(this.medecin.email, rdv.userEmail, rdv.date, rdv.heure).subscribe({
      next: () => {
        this.loadMedecinData(this.medecin.email);
      },
      error: (err: any) => console.error('Erreur annulation rendez-vous :', err),
    });
  }

  viewDocuments(userEmail: string) {
    this.router.navigate(['/documents'], { queryParams: { patientId: userEmail } });
  }

  addConsultation(rdv: any) {
    this.router.navigate(['/consultation'], { queryParams: { userEmail: rdv.userEmail, date: rdv.date, heure: rdv.heure } });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}