import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent implements OnInit {
  isLoggedIn: boolean = false;
  user: any = {};

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.checkLoginStatus();
  }

  checkLoginStatus() {
    const email = localStorage.getItem('email');
    this.isLoggedIn = !!email;
    if (this.isLoggedIn && email) {
      this.authService.getUser(email).subscribe({
        next: (response: any) => (this.user = response),
        error: (err: any) => console.error('Erreur chargement utilisateur :', err)
      });
    }
  }

  updateProfilePicture() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const photoProfil = reader.result as string;
          this.authService.updateUserAccount({ ...this.user, photoProfil }).subscribe({
            next: () => this.checkLoginStatus(),
            error: (err: any) => console.error('Erreur mise à jour photo :', err)
          });
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  }

  logout() {
    this.authService.logout(); // Appel direct sans .subscribe()
    localStorage.clear(); // Déjà fait dans AuthService.logout(), mais conservé ici pour cohérence
    this.isLoggedIn = false;
    this.user = {};
    this.router.navigate(['/login']);
  }
}