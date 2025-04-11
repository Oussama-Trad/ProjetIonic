import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-medecin',
  templateUrl: './medecin.page.html',
  styleUrls: ['./medecin.page.scss'],
  
  standalone: false, // Déclaré dans un module
  
})
export class MedecinPage implements OnInit {
  medecin: any = {};
  isEditing: boolean = false;
  changePassword: boolean = false;
  oldPassword: string = '';
  newPassword: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    const email = localStorage.getItem('email');
    if (email) {
      this.loadMedecinData(email);
    } else {
      console.error('Aucun email trouvé dans localStorage');
      this.router.navigate(['/login']);
    }
  }

  loadMedecinData(email: string) {
    this.authService.getMedecin(email).subscribe({
      next: (response: any) => {
        this.medecin = response;
        console.log('Données médecin chargées :', this.medecin);
      },
      error: (err: any) => {
        console.error('Erreur chargement données médecin :', err);
        this.router.navigate(['/login']);
      },
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
  }

  saveChanges() {
    this.isEditing = false;
  }

  cancelEdit() {
    this.isEditing = false;
  }

  togglePasswordFields() {
    this.changePassword = !this.changePassword;
  }

  goToAccueilMedecin() {
    this.router.navigate(['/accueil-medecin']);
  }
}