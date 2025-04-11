import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false, // Déclaré dans un module
})
export class RegisterPage {
  firstName: string = '';
  lastName: string = '';
  phoneNumber: string = '';
  email: string = '';
  password: string = '';
  birthDate: string = '';
  address: string = '';
  gender: string = '';
  profilePicture: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  goBackToHome() {
    this.router.navigate(['/home']);
  }

  uploadProfilePicture(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.profilePicture = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  register() {
    this.authService
      .register(
        this.firstName,
        this.lastName,
        this.phoneNumber,
        this.email,
        this.password,
        this.birthDate,
        this.address,
        this.gender,
        this.profilePicture
      )
      .subscribe({
        next: () => {
          alert('Inscription réussie');
          this.router.navigate(['/login']);
        },
        error: (err) => alert('Erreur : ' + (err.error?.msg || 'Échec')),
      });
  }
}