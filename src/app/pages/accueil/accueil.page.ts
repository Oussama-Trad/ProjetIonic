import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-accueil',
  templateUrl: './accueil.page.html',
  styleUrls: ['./accueil.page.scss'],
  standalone: false
})
export class AccueilPage implements OnInit {
  isLoggedIn: boolean = false;
  role: string | null = null;
  user: any = {};
  searchQuery: string = ''; // Variable pour le champ de recherche
  allMedecins: any[] = [];
  filteredMedecins: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      console.log('Utilisateur connecté ?', this.isLoggedIn, 'Rôle :', this.role);
      if (loggedIn && this.role === 'patient') {
        const email = localStorage.getItem('email');
        if (email) {
          this.authService.getUser(email).subscribe({
            next: (response: any) => {
              this.user = response;
              console.log('Utilisateur chargé :', this.user);
            },
            error: (err) => console.error('Erreur chargement utilisateur :', err),
          });
        }
        this.loadAllMedecins();
      } else if (this.role === 'medecin') {
        this.router.navigate(['/accueil-medecin']);
      } else if (!loggedIn) {
        this.loadAllMedecins(); // Charger les médecins même si non connecté
      }
    });
  }

  loadAllMedecins() {
    this.authService.getAllMedecins(this.searchQuery).subscribe({
      next: (response: any) => {
        this.allMedecins = Array.isArray(response) ? response : [];
        this.filteredMedecins = [...this.allMedecins];
        console.log('Tous les médecins chargés :', this.allMedecins.map(m => ({
          prenom: m.prenom,
          nom: m.nom,
          email: m.email,
          specialite: m.specialite,
          adresse: m.adresse
        })));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement tous les médecins :', err);
        this.allMedecins = [];
        this.filteredMedecins = [];
        this.cdr.detectChanges();
      },
    });
  }

  searchMedecins() {
    console.log('Recherche avec query :', this.searchQuery);
    this.loadAllMedecins(); // Recharger avec la nouvelle recherche
  }

  bookRendezVous(medecinEmail: string) {
    console.log('Clic sur médecin, email reçu :', medecinEmail);
    if (!medecinEmail) {
      console.error('Erreur : medecinEmail est vide ou invalide');
      alert('Erreur : Aucun email de médecin détecté.');
      return;
    }
    if (!this.isLoggedIn) {
      console.log('Utilisateur non connecté, redirection vers login');
      this.router.navigate(['/login']);
    } else {
      console.log('Redirection vers rendez-vous avec email :', medecinEmail);
      this.router.navigate(['/rendez-vous'], { queryParams: { medecinEmail } });
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}