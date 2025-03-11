import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
  
  
})
export class RegisterPage {
  firstName: string = '';
  lastName: string = '';
  phoneNumber: string = '';
  email: string = '';
  password: string = '';
  birthDate: string = '';  // Nouveau
  address: string = '';    // Nouveau
  gender: string = '';     // Nouveau

  constructor(private router: Router, private authService: AuthService) {}

  register() {
    console.log('Inscription avec :', this.firstName, this.lastName, this.phoneNumber, this.email, this.password, this.birthDate, this.address, this.gender);

    this.authService.register(
      this.firstName,
      this.lastName,
      this.phoneNumber,
      this.email,
      this.password,
      this.birthDate,
      this.address,
      this.gender
    ).subscribe({
      next: (response) => {
        console.log('Réponse du backend :', response);
        alert('Inscription réussie ! Connectez-vous.');
        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur :', error);
        alert('Erreur : ' + (error.error?.msg || 'Inscription échouée'));
      }
    });
  }
}