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
  originalMedecin: any = {};
  email: string = '';
  isEditing = false;
  oldPassword: string = '';
  newPassword: string = '';
  changePassword = false;

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
        this.originalMedecin = { ...response };
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

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.medecin = { ...this.originalMedecin };
      this.changePassword = false;
    }
    this.oldPassword = '';
    this.newPassword = '';
    console.log('Mode édition basculé à :', this.isEditing);
  }

  cancelEdit() {
    this.medecin = { ...this.originalMedecin };
    this.isEditing = false;
    this.changePassword = false;
    this.oldPassword = '';
    this.newPassword = '';
    console.log('Édition annulée');
  }

  togglePasswordFields() {
    if (!this.changePassword) {
      this.oldPassword = '';
      this.newPassword = '';
    }
    console.log('Option changement de mot de passe :', this.changePassword);
  }

  saveChanges() {
    console.log('Enregistrement des modifications, données actuelles :', this.medecin);
    const updateData = { ...this.medecin };
    console.log('Données préparées pour l’envoi :', updateData);

    if (this.changePassword && this.oldPassword && this.newPassword) {
      updateData.oldPassword = this.oldPassword;
      updateData.newPassword = this.newPassword;
      console.log('Mise à jour du compte avec mot de passe :', updateData);
      this.authService.updateMedecinAccount(updateData).subscribe({
        next: (response: any) => {
          console.log('Compte mis à jour avec succès :', response);
          this.originalMedecin = { ...this.medecin };
          if (response.access_token) {
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('email', response.email);
            this.email = response.email;
          }
          this.isEditing = false;
          this.changePassword = false;
          this.oldPassword = '';
          this.newPassword = '';
          alert('Compte mis à jour avec succès !');
          this.loadMedecinData();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Erreur lors de la mise à jour du compte :', error.status, error.error);
          alert('Erreur : ' + (error.error?.msg || 'Impossible de mettre à jour le compte'));
        }
      });
    } else {
      console.log('Mise à jour du profil sans mot de passe :', updateData);
      this.authService.updateMedecin(updateData).subscribe({
        next: (response) => {
          console.log('Profil mis à jour avec succès :', response);
          this.originalMedecin = { ...this.medecin };
          this.isEditing = false;
          this.changePassword = false;
          this.oldPassword = '';
          this.newPassword = '';
          alert('Profil mis à jour avec succès !');
        },
        error: (error: HttpErrorResponse) => {
          console.error('Erreur lors de la mise à jour du profil :', error.status, error.error);
          alert('Erreur : ' + (error.error?.msg || 'Impossible de mettre à jour le profil'));
        }
      });
    }
  }

  updateProfilePicture() {
    // Géré par le header
  }
}