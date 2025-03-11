import { Component } from '@angular/core';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  register() {
    console.log('Inscription avec :', this.firstName, this.lastName, this.phoneNumber, this.email, this.password);
    this.router.navigate(['/login']);
  }
}