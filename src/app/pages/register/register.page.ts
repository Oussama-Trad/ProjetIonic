import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
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

  uploadProfilePicture(event: any) { // Ajout de la méthode
    const file = event.target.files[0];
    if (file) {
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
        error: (err) => alert('Erreur : ' + (err.error?.msg || 'Échec'))
      });
  }
}