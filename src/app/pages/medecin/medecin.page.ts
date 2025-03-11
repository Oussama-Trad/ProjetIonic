import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-medecin',
  templateUrl: './medecin.page.html',
  styleUrls: ['./medecin.page.scss'],
  standalone: false
})
export class MedecinPage implements OnInit {
  medecin: any = {};
  email: string = '';

  constructor(private authService: AuthService, private router: Router) {
    console.log('Page Medecin (espace personnel médecin) chargée');
  }

  ngOnInit() {
    this.email = localStorage.getItem('email') || '';
    console.log('ngOnInit - Email récupéré depuis localStorage :', this.email);
    if (this.email && localStorage.getItem('role') === 'medecin') {
      this.loadMedecinData();
    } else {
      console.log('Aucun email ou rôle incorrect, redirection vers /login');
      this.router.navigate(['/login']);
    }
  }

  loadMedecinData() {
    console.log('Chargement des données pour l’email :', this.email);
    this.authService.getMedecin(this.email).subscribe({
      next: (response) => {
        this.medecin = response;
        console.log('Données médecin chargées avec succès :', this.medecin);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur lors du chargement des données médecin :', error);
        alert('Erreur : ' + (error.error?.msg || 'Impossible de charger les données'));
        localStorage.removeItem('email');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        this.router.navigate(['/login']);
      }
    });
  }

  goBackToAccueil() {
    console.log('Clic sur le bouton Retour détecté dans MedecinPage');
    const storedEmail = localStorage.getItem('email');
    console.log('Email actuel dans localStorage :', storedEmail);
    if (storedEmail) {
      console.log('Email trouvé, navigation vers /accueil tout en restant connecté');
      this.router.navigate(['/accueil']);
    } else {
      console.log('Pas d’email dans localStorage, redirection vers /login');
      this.router.navigate(['/login']);
    }
  }
}