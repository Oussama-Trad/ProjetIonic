import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-tous-les-medecins',
  templateUrl: './tous-les-medecins.page.html',
  styleUrls: ['./tous-les-medecins.page.scss'],
  standalone: false,

})
export class TousLesMedecinsPage implements OnInit {
  medecins: any[] = [];
  filteredMedecins: any[] = [];
  searchQuery: string = '';
  specialites: string[] = [];
  selectedSpecialite: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    const loading = await this.loadingController.create({
      message: 'Chargement des médecins...',
      spinner: 'crescent'
    });
    await loading.present();
    
    // Charger les spécialités
    this.loadSpecialites();
    
    // Charger les médecins
    this.loadMedecins();
    
    loading.dismiss();
  }

  loadSpecialites() {
    this.authService.getAllSpecialites().subscribe({
      next: (response) => {
        this.specialites = response || [];
        console.log('Spécialités chargées :', this.specialites);
      },
      error: (err) => console.error('Erreur chargement spécialités :', err),
    });
  }

  loadMedecins() {
    this.authService.getAllMedecins(this.searchQuery, this.selectedSpecialite).subscribe({
      next: (response) => {
        this.medecins = response || [];
        this.filteredMedecins = [...this.medecins];
        console.log('Tous les médecins chargés :', this.medecins);
        
        // Si aucun médecin n'est affiché, vérifier s'il y en a dans la collection
        if (this.medecins.length === 0) {
          console.warn('Aucun médecin chargé depuis l\'API');
          // Ajout d'un médecin de test si nécessaire (à retirer en production)
          if (true) {
            const testDoctor = {
              _id: '67d49a1634378e1594084135',
              id: '67d49a1634378e1594084131',
              prenom: 'Marie',
              nom: 'Martin',
              email: 'dr.martin@example.com',
              specialite: 'Généraliste',
              age: 45,
              dateDeNaissance: '1978-08-22T00:00:00.000+00:00',
              adresse: '456 Avenue Santé, Lyon',
              genre: 'Femme',
              numeroTelephone: '0987654321',
              photoProfil: 'assets/default-avatar.png'
            };
            this.medecins = [testDoctor];
            this.filteredMedecins = [testDoctor];
          }
        }
      },
      error: (err) => console.error('Erreur chargement médecins :', err),
    });
  }

  filterMedecins() {
    // Appliquer le filtre de recherche textuelle
    if (this.searchQuery || this.selectedSpecialite) {
      this.loadMedecins(); // Recharger les médecins avec les nouveaux filtres
    } else {
      this.filteredMedecins = this.medecins;
    }
  }

  onSpecialiteChange() {
    console.log('Spécialité sélectionnée :', this.selectedSpecialite);
    this.loadMedecins(); // Recharger les médecins avec la nouvelle spécialité
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedSpecialite = '';
    this.loadMedecins();
  }

  goToMedecinCalendar(medecinEmail: string) {
    this.router.navigate(['/rendez-vous'], { queryParams: { medecinEmail } });
  }

  goToConversation(medecinEmail: string) {
    this.router.navigate(['/conversation'], { 
      queryParams: { 
        otherUser: medecinEmail
      }
    });
  }
}