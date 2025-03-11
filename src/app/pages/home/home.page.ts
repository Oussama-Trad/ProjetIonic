import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  user: any = {};
  originalUser: any = {}; // Pour restaurer les données en cas d'annulation
  isEditing = false;
  email: string = '';
  changePassword = false; // Option pour activer le changement de mot de passe
  oldPassword: string = '';
  newPassword: string = '';

  constructor(private authService: AuthService, private router: Router) {
    console.log('Page Home (espace personnel patient) chargée');
  }

  ngOnInit() {
    this.email = localStorage.getItem('email') || '';
    console.log('ngOnInit - Email récupéré depuis localStorage :', this.email);
    if (this.email) {
      this.loadUserData();
    } else {
      console.log('Aucun email trouvé dans localStorage, redirection vers /login');
      this.router.navigate(['/login']);
    }
  }

  loadUserData() {
    console.log('Chargement des données pour l’email :', this.email);
    this.authService.getUser(this.email).subscribe({
      next: (response) => {
        this.user = response;
        this.originalUser = { ...response }; // Sauvegarde des données originales
        console.log('Données utilisateur chargées avec succès :', this.user);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur lors du chargement des données utilisateur :', error);
        alert('Erreur : ' + (error.error?.msg || 'Impossible de charger les données'));
        localStorage.removeItem('email');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        this.router.navigate(['/login']);
      }
    });
  }

  goBackToAccueil() {
    console.log('Clic sur le bouton Retour détecté dans HomePage');
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

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.user = { ...this.originalUser }; // Restaure les données originales
      this.changePassword = false; // Réinitialise l’option mot de passe
      this.oldPassword = '';
      this.newPassword = '';
    }
    console.log('Mode édition basculé à :', this.isEditing);
  }

  togglePasswordFields() {
    if (!this.changePassword) {
      this.oldPassword = '';
      this.newPassword = '';
    }
    console.log('Option changement de mot de passe :', this.changePassword);
  }

  saveChanges() {
    console.log('Enregistrement des modifications, données actuelles :', this.user);
    const updateData = { ...this.user, email: this.email };

    if (this.changePassword && this.oldPassword && this.newPassword) {
      updateData.oldPassword = this.oldPassword;
      updateData.newPassword = this.newPassword;
      console.log('Mise à jour du compte avec mot de passe :', updateData);
      this.authService.updateUserAccount(updateData).subscribe({
        next: (response: any) => {
          console.log('Compte mis à jour avec succès :', response);
          this.originalUser = { ...this.user };
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
          this.loadUserData();
        },
        error: (error: HttpErrorResponse) => {
          console.error('Erreur lors de la mise à jour du compte :', error.status, error.error);
          alert('Erreur : ' + (error.error?.msg || 'Impossible de mettre à jour le compte'));
        }
      });
    } else {
      console.log('Mise à jour du profil sans mot de passe :', updateData);
      this.authService.updateUser(
        this.email,
        this.user.firstName,
        this.user.lastName,
        this.user.phoneNumber,
        this.user.address,
        this.user.birthDate,
        this.user.gender,
        this.user.profilePicture
      ).subscribe({
        next: (response) => {
          console.log('Profil mis à jour avec succès :', response);
          this.originalUser = { ...this.user };
          this.isEditing = false;
          this.changePassword = false;
          this.oldPassword = '';
          this.newPassword = '';
          alert('Profil mis à jour avec succès !');
        },
        error: (error: HttpErrorResponse) => {
          console.error('Erreur mise à jour :', error);
          alert('Erreur : ' + (error.error?.msg || 'Mise à jour échouée'));
        }
      });
    }
  }

  deleteAccount() {
    if (confirm('Voulez-vous vraiment supprimer votre compte ?')) {
      this.authService.deleteUser(this.email).subscribe({
        next: (response) => {
          console.log('Compte supprimé :', response);
          alert('Compte supprimé avec succès.');
          localStorage.removeItem('email');
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          this.router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Erreur suppression :', error);
          alert('Erreur : ' + (error.error?.msg || 'Suppression échouée'));
        }
      });
    }
  }

  updateProfilePicture() {
    console.log('Clic sur avatar, ouverture du sélecteur de fichier');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        console.log('Fichier sélectionné :', file.name);
        const reader = new FileReader();
        reader.onload = () => {
          this.user.profilePicture = reader.result as string;
          console.log('Photo de profil mise à jour en local :', this.user.profilePicture);
          // Pas de saveChanges() ici, on attend "Enregistrer"
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }
}