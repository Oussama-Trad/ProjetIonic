import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone:false
})
export class HeaderComponent implements OnInit {
  user: any = {};
  isLoggedIn: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');
    this.isLoggedIn = !!email && !!role;
    if (this.isLoggedIn) {
      this.loadUserData(email!, role!);
    } else {
      console.log('Pas connecté, header minimal');
    }
  }

  loadUserData(email: string, role: string) {
    const serviceCall = role === 'medecin' ? this.authService.getMedecin(email) : this.authService.getUser(email);
    serviceCall.subscribe({
      next: (response) => {
        this.user = response;
        console.log('Données utilisateur chargées dans le header :', this.user);
      },
      error: (error) => {
        console.error('Erreur chargement données header :', error);
      }
    });
  }

  updateProfilePicture() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const field = localStorage.getItem('role') === 'medecin' ? 'photoProfil' : 'profilePicture';
          this.user[field] = reader.result as string;
          const updateCall = localStorage.getItem('role') === 'medecin'
            ? this.authService.updateMedecin(this.user)
            : this.authService.updateUser(
                this.user.email,
                this.user.firstName,
                this.user.lastName,
                this.user.phoneNumber,
                this.user.address,
                this.user.birthDate,
                this.user.gender,
                this.user.profilePicture
              );
          updateCall.subscribe({
            next: () => console.log('Photo mise à jour'),
            error: (err) => console.error('Erreur mise à jour photo :', err)
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn = false;
    this.user = {};
    this.router.navigate(['/accueil'], { replaceUrl: true });
    console.log('Déconnexion réussie, redirection vers /accueil avec état réinitialisé');
    // Forcer la mise à jour globale (optionnel si accueil.page écoute bien)
    window.dispatchEvent(new Event('storage')); // Événement pour signaler le changement
  }
}