import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  user: any = {};
  isEditing = false;
  email: string = '';

  constructor(private authService: AuthService, private router: Router) {
    console.log('Page Home (espace personnel) chargée');
  }

  ngOnInit() {
    this.email = localStorage.getItem('email') || '';
    console.log('ngOnInit - Email récupéré depuis localStorage :', this.email);
    if (this.email) {
      this.loadUserData();
    } else {
      console.log('Aucun email trouvé dans localStorage, redirection vers /login');
      this.router.navigate(['/login']);
    }
  }

  loadUserData() {
    console.log('Chargement des données pour l’email :', this.email);
    this.authService.getUser(this.email).subscribe({
      next: (response) => {
        this.user = response;
        console.log('Données utilisateur chargées avec succès :', this.user);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur lors du chargement des données utilisateur :', error);
        alert('Erreur : ' + (error.error?.msg || 'Impossible de charger les données'));
        localStorage.removeItem('email');  // Nettoie si erreur critique
        localStorage.removeItem('token');
        this.router.navigate(['/login']);
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
  }

  saveChanges() {
    this.authService.updateUser(
      this.email,
      this.user.firstName,
      this.user.lastName,
      this.user.phoneNumber,
      this.user.address,
      this.user.birthDate,
      this.user.gender,
      this.user.profilePicture
    ).subscribe({
      next: (response) => {
        console.log('Mise à jour réussie :', response);
        alert('Profil mis à jour !');
        this.isEditing = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur mise à jour :', error);
        alert('Erreur : ' + (error.error?.msg || 'Mise à jour échouée'));
      }
    });
  }

  deleteAccount() {
    if (confirm('Voulez-vous vraiment supprimer votre compte ?')) {
      this.authService.deleteUser(this.email).subscribe({
        next: (response) => {
          console.log('Compte supprimé :', response);
          alert('Compte supprimé avec succès.');
          localStorage.removeItem('email');
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Erreur suppression :', error);
          alert('Erreur : ' + (error.error?.msg || 'Suppression échouée'));
        }
      });
    }
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
          this.user.profilePicture = reader.result as string;
          this.saveChanges();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }
}