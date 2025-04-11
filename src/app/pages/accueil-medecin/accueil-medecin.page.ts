import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-accueil-medecin',
  templateUrl: './accueil-medecin.page.html',
  styleUrls: ['./accueil-medecin.page.scss'],
  standalone: false, // Déclaré dans un module
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
        console.error('Erreur chargement données médecin :', err);
        alert('Erreur chargement données médecin : ' + err.message);
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
        console.error('Erreur chargement rendez-vous :', err);
        alert('Erreur chargement rendez-vous : ' + err.message);
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

    const userEmail = rdv?.userEmail || rdv?.patientEmail;
    const date = rdv?.date;
    const heure = rdv?.heure;

    if (!userEmail || !date || !heure) {
      console.error('Données manquantes pour gérer le rendez-vous :', { userEmail, date, heure, rdv });
      alert('Erreur : données du rendez-vous incomplètes.');
      return;
    }

    this.authService.manageRendezVous(userEmail, date, heure, action).subscribe({
      next: (response) => {
        console.log(`Rendez-vous ${action} avec succès :`, response);
        this.loadRendezVous(this.email!);
        alert(`Rendez-vous ${action === 'accept' ? 'accepté' : 'refusé'} avec succès !`);
      },
      error: (err) => {
        console.error(`Erreur action ${action} sur rendez-vous :`, err);
        alert(`Erreur : ${err.message || 'Échec'}`);
      },
    });
  }

  addConsultation(rdv: any) {
    const userEmail = rdv?.userEmail || rdv?.patientEmail;
    const date = rdv?.date;
    const heure = rdv?.heure;

    if (!userEmail || !date || !heure) {
      console.error('Données manquantes pour consultation :', { userEmail, date, heure, rdv });
      alert('Erreur : données incomplètes.');
      return;
    }

    this.router.navigate(['/consultation'], { queryParams: { userEmail, date, heure } });
  }

  viewDocuments(userEmail: string) {
    if (!userEmail) {
      console.error('userEmail manquant pour viewDocuments');
      alert('Erreur : email manquant.');
      return;
    }
    this.router.navigate(['/documents'], { queryParams: { userEmail } });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}