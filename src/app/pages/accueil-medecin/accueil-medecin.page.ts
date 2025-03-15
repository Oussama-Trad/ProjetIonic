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
      error: (err: any) => console.error('Erreur chargement données médecin :', err)
    });
  }

  manageRendezVous(rdv: any, action: 'accept' | 'reject') {
    this.authService.manageRendezVous(rdv.patientId, rdv.date, rdv.heure, action).subscribe({ // patientId reste ici car il vient de l'objet rdv
      next: () => {
        console.log(`Rendez-vous ${action}é avec succès`);
        this.loadMedecinData(this.medecin.email);
      },
      error: (err: any) => console.error(`Erreur ${action} rendez-vous :`, err)
    });
  }

  cancelRendezVous(rdv: any) {
    this.authService.cancelRendezVous(this.medecin.email, rdv.patientId, rdv.date, rdv.heure).subscribe({ // patientId reste ici car il vient de l'objet rdv
      next: () => {
        console.log('Rendez-vous annulé avec succès');
        this.loadMedecinData(this.medecin.email);
      },
      error: (err: any) => console.error('Erreur annulation rendez-vous :', err)
    });
  }

  viewDocuments(userEmail: string) { // Changé de patientId à userEmail
    this.router.navigate(['/documents'], { queryParams: { userEmail } });
  }

  addConsultation(rdv: any) {
    this.router.navigate(['/consultation'], { queryParams: { userEmail: rdv.patientId, date: rdv.date, heure: rdv.heure } }); // Changé patientId à userEmail
  }

  goToProfile() {
    this.router.navigate(['/medecin']);
  }
}