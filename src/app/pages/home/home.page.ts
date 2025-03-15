import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  user: any = {};
  isLoggedIn: boolean = false;
  role: string | null = null;
  isEditing: boolean = false;
  changePassword: boolean = false;
  oldPassword: string = '';
  newPassword: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.refreshState();
  }

  refreshState() {
    const email = localStorage.getItem('email');
    this.role = localStorage.getItem('role');
    this.isLoggedIn = !!email;
    if (this.isLoggedIn && email) {
      this.loadUserData(email);
    }
  }

  loadUserData(email: string) {
    const fetchMethod = this.role === 'medecin' ? this.authService.getMedecin : this.authService.getUser;
    fetchMethod(email).subscribe({
      next: (response: any) => {
        this.user = response;
      },
      error: (err: any) => console.error('Erreur chargement données :', err)
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
  }

  togglePasswordFields() {
    // Rien à faire ici sauf si vous voulez ajouter une logique supplémentaire
  }

  saveChanges() {
    const updateMethod = this.role === 'medecin' ? this.authService.updateMedecinAccount : this.authService.updateUserAccount;
    updateMethod(this.user).subscribe({
      next: () => {
        if (this.changePassword && this.oldPassword && this.newPassword) {
          this.authService.changePassword(this.user.email, this.oldPassword, this.newPassword).subscribe({
            next: () => alert('Mot de passe changé avec succès'),
            error: (err) => alert('Erreur changement mot de passe : ' + (err.error?.msg || 'Échec'))
          });
        }
        alert('Modifications enregistrées');
        this.isEditing = false;
      },
      error: (err) => alert('Erreur : ' + (err.error?.msg || 'Échec'))
    });
  }

  deleteAccount() {
    if (confirm('Voulez-vous vraiment supprimer votre compte ?')) {
      this.authService.deleteUser(this.user.email).subscribe({
        next: () => {
          this.authService.logout();
          this.router.navigate(['/home']);
        },
        error: (err) => alert('Erreur : ' + (err.error?.msg || 'Échec'))
      });
    }
  }
}