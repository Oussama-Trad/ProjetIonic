import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-accueil-medecin',
  templateUrl: './accueil-medecin.page.html',
  styleUrls: ['./accueil-medecin.page.scss'],
  standalone: false,
 
})
export class AccueilMedecinPage implements OnInit {
  medecin: any = {};
  isLoggedIn: boolean = false;
  role: string | null = null;
  rendezVousDemandes: any[] = [];
  rendezVousConfirmes: any[] = [];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.refreshState();
  }

  refreshState() {
    const email = localStorage.getItem('email');
    this.role = localStorage.getItem('role');
    this.isLoggedIn = !!email && this.role === 'medecin';
    if (this.isLoggedIn && email) {
      this.loadMedecinData(email);
    }
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
        console.log(`Rendez-vous ${action}é avec succès`);
        this.loadMedecinData(this.medecin.email);
      },
      error: (err: any) => console.error(`Erreur ${action} rendez-vous :`, err),
    });
  }

  cancelRendezVous(rdv: any) {
    this.authService.cancelRendezVous(this.medecin.email, rdv.userEmail, rdv.date, rdv.heure).subscribe({
      next: () => {
        console.log('Rendez-vous annulé avec succès');
        this.loadMedecinData(this.medecin.email);
      },
      error: (err: any) => console.error('Erreur annulation rendez-vous :', err),
    });
  }

  viewDocuments(userEmail: string) {
    this.authService.getUser(userEmail).subscribe({
      next: (user: any) => {
        const docs = user.documents || [];
        alert(`Documents de ${user.firstName} ${user.lastName}:\n${docs.map((d: any) => d.nom).join('\n')}`);
      },
      error: (err: any) => console.error('Erreur chargement documents :', err),
    });
  }

  addConsultation(rdv: any) {
    this.router.navigate(['/consultation'], { queryParams: { userEmail: rdv.userEmail, date: rdv.date, heure: rdv.heure } });
  }

  goToProfile() {
    this.router.navigate(['/medecin']);
  }

  // Méthode publique pour naviguer vers la page de login
  goToLogin() {
    this.router.navigate(['/login']);
  }
}