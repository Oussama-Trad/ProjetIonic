import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-medecin',
  templateUrl: './medecin.page.html',
  styleUrls: ['./medecin.page.scss'],
  standalone:false
})
export class MedecinPage implements OnInit {
  isLoggedIn: boolean = false;
  role: string | null = null;
  medecin: any = {};
  isEditing: boolean = false;
  changePassword: boolean = false;
  oldPassword: string = '';
  newPassword: string = '';

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      if (loggedIn && this.role === 'medecin') {
        const email = localStorage.getItem('email');
        if (email) {
          this.authService.getMedecin(email).subscribe({
            next: (response: any) => {
              this.medecin = response;
            },
            error: (err: any) => console.error('Erreur chargement médecin :', err),
          });
        }
      } else if (this.role === 'patient') {
        this.router.navigate(['/home']);
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.changePassword = false;
      this.oldPassword = '';
      this.newPassword = '';
    }
  }

  togglePasswordFields() {
    this.changePassword = !this.changePassword;
    if (!this.changePassword) {
      this.oldPassword = '';
      this.newPassword = '';
    }
  }

  saveChanges() {
    if (this.isEditing) {
      if (this.changePassword && (!this.oldPassword || !this.newPassword)) {
        alert('Veuillez remplir les champs de mot de passe');
        return;
      }

      const updatedMedecin = {
        email: this.medecin.email,
        prenom: this.medecin.prenom,
        nom: this.medecin.nom,
        numeroTelephone: this.medecin.numeroTelephone,
        adresse: this.medecin.adresse,
        dateDeNaissance: this.medecin.dateDeNaissance,
        genre: this.medecin.genre,
        specialite: this.medecin.specialite,
        photoProfil: this.medecin.photoProfil || '',
      };

      if (this.changePassword) {
        this.authService.changePassword(this.medecin.email, this.oldPassword, this.newPassword).subscribe({
          next: () => {
            this.saveProfile(updatedMedecin);
          },
          error: (err: any) => alert('Erreur changement mot de passe : ' + (err.error?.msg || 'Échec')),
        });
      } else {
        this.saveProfile(updatedMedecin);
      }
    }
  }

  saveProfile(updatedMedecin: any) {
    this.authService.updateMedecinAccount(updatedMedecin).subscribe({
      next: () => {
        alert('Profil mis à jour avec succès');
        this.isEditing = false;
        this.changePassword = false;
        this.oldPassword = '';
        this.newPassword = '';
      },
      error: (err: any) => alert('Erreur mise à jour profil : ' + (err.error?.msg || 'Échec')),
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.changePassword = false;
    this.oldPassword = '';
    this.newPassword = '';
    this.ngOnInit(); // Recharger les données d'origine
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}