import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular'; // Import IonicModule
import { FormsModule } from '@angular/forms'; // Import FormsModule pour ngModel

@Component({
  selector: 'app-medecin',
  templateUrl: './medecin.page.html',
  styleUrls: ['./medecin.page.scss'],
  standalone: false, // Si standalone est false, il doit être déclaré dans app.module.ts

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
        console.log('Données du médecin chargées :', this.medecin);
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des données du médecin :', err);
        this.router.navigate(['/login']);
      },
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
  }

  saveChanges() {
    // Logique pour sauvegarder les modifications
    this.isEditing = false;
  }

  cancelEdit() {
    this.isEditing = false;
  }

  togglePasswordFields() {
    // Logique pour gérer les champs de mot de passe
  }

  goToAccueilMedecin() {
    this.router.navigate(['/accueil-medecin']);
  }
}