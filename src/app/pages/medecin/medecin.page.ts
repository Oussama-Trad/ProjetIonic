import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-medecin',
  templateUrl: './medecin.page.html',
  styleUrls: ['./medecin.page.scss'],
  standalone: false
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
    this.checkLoginStatus();
  }

  checkLoginStatus() {
    const email = localStorage.getItem('email');
    this.role = localStorage.getItem('role');
    this.isLoggedIn = !!email && this.role === 'medecin';
    if (this.isLoggedIn && email) {
      this.authService.getMedecin(email).subscribe({
        next: (response: any) => (this.medecin = response),
        error: (err: any) => console.error('Erreur chargement médecin :', err)
      });
    }
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
  }

  togglePasswordFields() {
    this.changePassword = !this.changePassword;
  }

  saveChanges() {
    if (this.changePassword && (!this.oldPassword || !this.newPassword)) {
      alert('Veuillez remplir les champs de mot de passe');
      return;
    }

    const updatedMedecin = { ...this.medecin };
    if (this.changePassword) {
      updatedMedecin.oldPassword = this.oldPassword;
      updatedMedecin.newPassword = this.newPassword;
    }

    this.authService.updateMedecinAccount(updatedMedecin).subscribe({
      next: () => {
        alert('Profil mis à jour avec succès');
        this.isEditing = false;
        this.changePassword = false;
        this.oldPassword = '';
        this.newPassword = '';
        this.checkLoginStatus();
      },
      error: (err: any) => alert('Erreur mise à jour : ' + (err.error?.msg || 'Échec'))
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.changePassword = false;
    this.oldPassword = '';
    this.newPassword = '';
    this.checkLoginStatus();
  }
}