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
  searchQuery: string = '';
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
      }
    });
  }

  loadAllMedecins() {
    this.authService.getAllMedecins('').subscribe({
      next: (response: any) => {
        this.allMedecins = Array.isArray(response) ? response : [];
        this.filterMedecins();
        console.log('Tous les médecins chargés :', this.allMedecins.map(m => ({
          prenom: m.prenom,
          nom: m.nom,
          email: m.email,
          specialite: m.specialite,
          adresse: m.adresse
        })));
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
    if (!this.isLoggedIn || this.role !== 'patient') return;
    console.log('Recherche avec query :', this.searchQuery);
    this.filterMedecins();
  }

  filterMedecins() {
    if (!this.searchQuery) {
      this.filteredMedecins = [...this.allMedecins];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredMedecins = this.allMedecins.filter(medecin =>
        (medecin.prenom?.toLowerCase().includes(query) ||
         medecin.nom?.toLowerCase().includes(query) ||
         medecin.specialite?.toLowerCase().includes(query))
      );
    }
    console.log('Médecins filtrés après recherche :', this.filteredMedecins.map(m => ({
      prenom: m.prenom,
      nom: m.nom,
      email: m.email
    })));
    this.cdr.detectChanges();
  }

  bookRendezVous(medecinEmail: string) {
    console.log('Clic sur médecin, email reçu :', medecinEmail);
    if (!this.isLoggedIn) {
      console.log('Utilisateur non connecté, redirection vers login');
      this.router.navigate(['/login']);
    } else if (!medecinEmail) {
      console.error('Erreur : medecinEmail est vide ou invalide');
      alert('Erreur : Aucun email de médecin détecté. Vérifiez les données.');
    } else {
      console.log('Redirection vers rendez-vous avec email :', medecinEmail);
      this.router.navigate(['/rendez-vous'], { queryParams: { medecinEmail } });
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}