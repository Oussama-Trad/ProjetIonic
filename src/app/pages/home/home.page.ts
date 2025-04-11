import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

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

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      if (loggedIn && this.role === 'patient') {
        const email = localStorage.getItem('email');
        if (email) {
          this.authService.getUser(email).subscribe({
            next: (response) => {
              this.user = response;
              console.log('Données utilisateur chargées :', this.user);
            },
            error: (err) => console.error('Erreur chargement profil :', err),
          });
        }
      } else if (this.role === 'medecin') {
        this.router.navigate(['/medecin']);
      }
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
          alert('Profil mis à jour avec succès !');
        },
        error: (err) => {
          console.error('Erreur mise à jour profil :', err);
          alert('Erreur : ' + (err.error?.msg || 'Échec'));
        },
      });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}