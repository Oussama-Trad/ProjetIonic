import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  firstName: string = '';
  lastName: string = '';
  phoneNumber: string = '';
  email: string = '';
  password: string = '';

  constructor(private router: Router) {}

  register() {
    console.log('Inscription avec :', this.firstName, this.lastName, this.phoneNumber, this.email, this.password);
    // Ajoutez ici la logique d'inscription
    // Par exemple, rediriger vers la page de connexion après inscription réussie :
    this.router.navigate(['/login']);
  }
}
