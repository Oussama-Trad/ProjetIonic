import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false, // Déclaré dans un module
})
export class HomePage implements OnInit {
  isLoggedIn: boolean = false;
  role: string | null = null;
  user: any = {};
  isEditing: boolean = false;
  photoPreview: string | null = null;
  documents: any[] = [];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      if (loggedIn && this.role === 'patient') {
        const email = localStorage.getItem('email');
        if (email) {
          this.loadUserProfile(email);
        }
      } else if (this.role === 'medecin') {
        this.router.navigate(['/tabs-medecin/accueil-medecin']);
      }
    });
  }

  loadUserProfile(email: string) {
    this.authService.getUser(email).subscribe({
      next: (response) => {
        this.user = response;
        console.log('Données utilisateur chargées :', this.user);
        
        // Charger les documents de l'utilisateur
        this.documents = this.user.documents || [];
        console.log('Documents chargés:', this.documents);
      },
      error: (err) => {
        console.error('Erreur chargement profil :', err);
        this.showToast('Impossible de charger votre profil', 'danger');
      },
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    this.photoPreview = null;
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile() {
    if (!this.isLoggedIn || this.role !== 'patient') return;

    const updatedUser = {
      email: this.user.email,
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      phoneNumber: this.user.phoneNumber,
      birthDate: this.user.birthDate,
      address: this.user.address,
      gender: this.user.gender,
      profilePicture: this.photoPreview || this.user.profilePicture || '',
    };

    this.authService
      .updateUser(
        updatedUser.email,
        updatedUser.firstName,
        updatedUser.lastName,
        updatedUser.phoneNumber,
        updatedUser.address,
        updatedUser.birthDate,
        updatedUser.gender,
        updatedUser.profilePicture
      )
      .subscribe({
        next: (response) => {
          this.user = response;
          this.isEditing = false;
          this.showToast('Profil mis à jour avec succès !', 'success');
        },
        error: (err) => {
          console.error('Erreur mise à jour profil :', err);
          this.showToast('Erreur : ' + (err.error?.msg || 'Échec de la mise à jour'), 'danger');
        },
      });
  }

  async viewDocument(doc: any) {
    // Afficher le document dans une alerte
    const alert = await this.alertController.create({
      header: doc.nom,
      message: `<div class="document-preview">
                  <p><strong>Statut:</strong> ${doc.statut}</p>
                  <p><strong>Date:</strong> ${new Date(doc.date).toLocaleDateString()}</p>
                  ${doc.annotations ? `<p><strong>Annotations:</strong> ${doc.annotations}</p>` : ''}
                </div>`,
      buttons: ['Fermer']
    });
    await alert.present();
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      buttons: [{ text: 'OK', role: 'cancel' }]
    });
    await toast.present();
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}