import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ToastController } from '@ionic/angular';

interface MedecinStats {
  totalPatients: number;
  totalRendezVous: number;
  rdvConfirmes: number;
  rdvEnAttente: number;
  rdvAnnules: number;
  rdvTermines: number;
  patientsPresents: number;
  patientsAbsents: number;
  tauxPresence: number;
  tempsMoyenConsultation: number;
  rendezVousParMois: { [mois: string]: number };
  rendezVousParStatut: { [statut: string]: number };
}

@Component({
  selector: 'app-stats-medecin',
  templateUrl: './stats-medecin.page.html',
  styleUrls: ['./stats-medecin.page.scss'],
  standalone: false
})
export class StatsMedecinPage implements OnInit {
  stats: MedecinStats = {
    totalPatients: 0,
    totalRendezVous: 0,
    rdvConfirmes: 0,
    rdvEnAttente: 0,
    rdvAnnules: 0,
    rdvTermines: 0,
    patientsPresents: 0,
    patientsAbsents: 0,
    tauxPresence: 0,
    tempsMoyenConsultation: 0,
    rendezVousParMois: {},
    rendezVousParStatut: {}
  };
  
  isLoading: boolean = true;
  
  constructor(
    private authService: AuthService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadStats();
  }
  
  loadStats() {
    this.isLoading = true;
    const email = localStorage.getItem('email') || '';
    
    this.authService.getMedecinStats(email).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.isLoading = false;
        this.showToast('Impossible de charger les statistiques', 'danger');
        
        // Générer des données de test pour la démo
        this.generateTestData();
      }
    });
  }
  
  refreshStats() {
    this.loadStats();
    this.showToast('Statistiques mises à jour', 'success');
  }
  
  // Fonction pour générer des données de test (à utiliser uniquement pour la démo)
  generateTestData() {
    this.stats = {
      totalPatients: 87,
      totalRendezVous: 156,
      rdvConfirmes: 24,
      rdvEnAttente: 12,
      rdvAnnules: 8,
      rdvTermines: 112,
      patientsPresents: 104,
      patientsAbsents: 8,
      tauxPresence: 93,
      tempsMoyenConsultation: 25,
      rendezVousParMois: {
        'Jan': 12,
        'Fév': 15,
        'Mar': 18,
        'Avr': 14,
        'Mai': 16,
        'Juin': 13,
        'Juil': 10,
        'Août': 8,
        'Sep': 14,
        'Oct': 16,
        'Nov': 12,
        'Déc': 8
      },
      rendezVousParStatut: {
        'confirmé': 24,
        'en attente': 12,
        'annulé': 8,
        'terminé': 112
      }
    };
  }
  
  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}
