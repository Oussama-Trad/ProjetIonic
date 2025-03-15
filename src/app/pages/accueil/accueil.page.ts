import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-accueil',
  templateUrl: './accueil.page.html',
  styleUrls: ['./accueil.page.scss'],
  standalone: false
})
export class AccueilPage implements OnInit {
  isLoggedIn: boolean = false;
  role: string | null = null;
  user: any = {}; // Ajout de la propriété user
  searchQuery: string = '';
  filteredMedecins: any[] = [];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.refreshState();
    this.searchMedecins();
  }

  refreshState() {
    const email = localStorage.getItem('email');
    this.role = localStorage.getItem('role');
    this.isLoggedIn = !!email;
    if (this.isLoggedIn && email) {
      this.authService.getUser(email).subscribe({
        next: (response: any) => (this.user = response),
        error: (err) => console.error('Erreur chargement utilisateur :', err)
      });
    }
  }

  searchMedecins() {
    this.authService.getAllMedecins(this.searchQuery).subscribe({
      next: (response: any) => {
        this.filteredMedecins = response;
      },
      error: (err) => console.error('Erreur recherche médecins :', err)
    });
  }

  bookRendezVous(medecinEmail: string) {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
    } else {
      this.router.navigate(['/rendez-vous'], { queryParams: { medecinEmail } });
    }
  }

  goToRendezVous() {
    this.router.navigate(['/rendez-vous']);
  }

  goToDocuments() { // Ajout de la méthode
    this.router.navigate(['/documents']);
  }

  goToHistorique() { // Ajout de la méthode
    this.router.navigate(['/historique']);
  }

  goToProfile() { // Ajout de la méthode
    this.router.navigate(['/home']);
  }
}