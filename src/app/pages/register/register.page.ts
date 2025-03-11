import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

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

  constructor(private router: Router, private authService: AuthService) {}

  uploadProfilePicture(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.profilePicture = reader.result as string;
        console.log('Photo de profil chargée :', this.profilePicture);
      };
      reader.readAsDataURL(file);
    }
  }

  register() {
    console.log('Inscription avec :', this.firstName, this.lastName, this.phoneNumber, this.email, this.password, this.birthDate, this.address, this.gender, this.profilePicture);

    if (!this.profilePicture) {
      alert('Veuillez ajouter une photo de profil !');
      return;
    }

    this.authService.register(
      this.firstName,
      this.lastName,
      this.phoneNumber,
      this.email,
      this.password,
      this.birthDate,
      this.address,
      this.gender,
      this.profilePicture
    ).subscribe({
      next: (response) => {
        console.log('Réponse du backend :', response);
        localStorage.setItem('email', response.email);
        console.log('Email stocké après inscription :', localStorage.getItem('email'));
        alert('Inscription réussie ! Connectez-vous.');
        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur :', error);
        alert('Erreur : ' + (error.error?.msg || 'Inscription échouée'));
      }
    });
  }

  goBackToHome() {
    console.log('Clic sur le bouton Retour détecté');  // Log pour confirmer le clic
    const storedEmail = localStorage.getItem('email');
    console.log('Retour à l’accueil, email actuel dans localStorage :', storedEmail);
    if (storedEmail) {
      this.router.navigate(['/home']);
    } else {
      console.log('Pas d’email dans localStorage, redirection vers /login');
      this.router.navigate(['/login']);
    }
  }
}