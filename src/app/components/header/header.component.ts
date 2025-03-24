import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent implements OnInit {
  user: any = {};
  fullName: string = 'Utilisateur';
  isLoggedIn: boolean = false;
  profilePictureUrl: string | null = null;
  photoPreview: string | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      console.log('isLoggedIn changé :', loggedIn);
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        const email = localStorage.getItem('email');
        const role = localStorage.getItem('role');
        console.log('Email et rôle depuis localStorage :', { email, role });
        if (email && role) {
          const fetchMethod = role === 'medecin' 
            ? this.authService.getMedecin.bind(this.authService) 
            : this.authService.getUser.bind(this.authService);
          fetchMethod(email).subscribe({
            next: (response) => {
              console.log('Réponse brute de la requête :', response);
              this.user = response || {};
              console.log('Utilisateur chargé dans header :', this.user);

              // Construire le nom complet
              const firstName = this.user?.firstName || this.user?.prenom || '';
              const lastName = this.user?.lastName || this.user?.nom || '';
              this.fullName = `${firstName} ${lastName}`.trim() || 'Utilisateur';
              console.log('Nom complet calculé :', this.fullName);

              // Déterminer l'URL de la photo de profil
              this.profilePictureUrl = role === 'medecin' ? this.user?.photoProfil : this.user?.profilePicture;
              console.log('URL de la photo de profil :', this.profilePictureUrl);
              if (!this.profilePictureUrl || this.profilePictureUrl.trim() === '' || !this.profilePictureUrl.startsWith('data:image/')) {
                console.log('Photo de profil invalide ou absente, affichage de l\'icône par défaut');
                this.profilePictureUrl = null;
              }
            },
            error: (err) => {
              console.error('Erreur lors du chargement des données utilisateur :', err);
              console.error('Détails de l\'erreur :', err.status, err.statusText, err.error);
              this.user = {};
              this.fullName = 'Utilisateur';
              this.profilePictureUrl = null;
            },
          });
        } else {
          console.warn('Email ou rôle manquant dans localStorage', { email, role });
          this.fullName = 'Utilisateur';
          this.profilePictureUrl = null;
        }
      } else {
        console.log('Utilisateur non connecté, réinitialisation');
        this.user = {};
        this.fullName = 'Utilisateur';
        this.profilePictureUrl = null;
      }
    });
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
        this.profilePictureUrl = this.photoPreview;
        this.updateProfilePicture();
      };
      reader.readAsDataURL(file);
    }
  }

  updateProfilePicture() {
    if (!this.photoPreview) {
      console.warn('Aucune photo sélectionnée pour la mise à jour');
      return;
    }

    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');
    if (!email || !role) {
      console.error('Email ou rôle manquant dans localStorage');
      return;
    }

    const updatedData = {
      email,
      profilePicture: role === 'patient' ? this.photoPreview : undefined,
      photoProfil: role === 'medecin' ? this.photoPreview : undefined,
    };

    this.authService.updateUserProfilePicture(email, updatedData).subscribe({
      next: (response) => {
        console.log('Photo de profil mise à jour avec succès :', response);
        this.user = response;
        this.profilePictureUrl = role === 'medecin' ? response.photoProfil : response.profilePicture;
        this.photoPreview = null;
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de la photo :', err);
        alert('Erreur lors de la mise à jour de la photo : ' + (err.error?.msg || 'Échec'));
        this.photoPreview = null;
        this.profilePictureUrl = role === 'medecin' ? this.user?.photoProfil : this.user?.profilePicture;
      },
    });
  }

  logout() {
    this.authService.logout();
  }

  handleImageError(event: any) {
    console.error('Erreur lors du chargement de l\'image :', event);
    event.target.style.display = 'none';
    this.profilePictureUrl = null;
  }
}