import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone:false
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

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
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
      profilePicture: this.photoPreview || this.user.photoProfil || this.user.profilePicture,
    };
    this.authService.updateUser(
      updatedUser.email,
      updatedUser.firstName,
      updatedUser.lastName,
      updatedUser.phoneNumber,
      updatedUser.address,
      updatedUser.birthDate,
      updatedUser.gender,
      updatedUser.profilePicture
    ).subscribe({
      next: (response) => {
        this.user = response;
        this.isEditing = false;
      },
      error: (err) => console.error('Erreur mise à jour profil :', err),
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}