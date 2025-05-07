import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-accueil-medecin',
  templateUrl: './accueil-medecin.page.html',
  styleUrls: ['./accueil-medecin.page.scss'],
  standalone: false,
})
export class AccueilMedecinPage implements OnInit {
  medecin: any = {};
  isLoading: boolean = false;
  rendezVousAujourdhui: any[] = [];
  rendezVousAttente: any[] = [];
  isRendezVousExpanded: boolean = true;
  isPatientsExpanded: boolean = true;
  
  stats = {
    totalPatients: 0,
    rdvConfirmes: 0,
    rdvEnAttente: 0,
    consultations: 0
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    const medecinEmail = localStorage.getItem('email');
    if (!medecinEmail) {
      this.showToast('Erreur: Utilisateur non connecté', 'danger');
      this.router.navigate(['/login']);
      return;
    }
    
    const role = localStorage.getItem('role');
    if (role !== 'medecin') {
      this.showToast('Accès refusé: Cette page est réservée aux médecins', 'danger');
      this.router.navigate(['/tabs/accueil']);
      return;
    }
    
    await this.loadMedecinData(medecinEmail);
    await this.loadRendezVous(medecinEmail);
  }
  
  async loadMedecinData(medecinEmail: string) {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Chargement des données...',
      spinner: 'crescent'
    });
    await loading.present();
    
    try {
      this.medecin = await this.authService.getMedecin(medecinEmail).toPromise();
      console.log('Données médecin chargées :', this.medecin);
      loading.dismiss();
      this.isLoading = false;
    } catch (error) {
      console.error('Erreur chargement médecin :', error);
      this.showToast('Impossible de charger vos informations', 'danger');
      loading.dismiss();
      this.isLoading = false;
      
      if ((error as any).status === 401) {
        this.router.navigate(['/login']);
      }
    }
  }
  
  async loadRendezVous(medecinEmail: string) {
    try {
      const response: any = await this.authService.getMedecinDisponibilites(medecinEmail).toPromise();
      
      // Fusionner les rendez-vous et ajouter les statuts
      const rendezVous = [
        ...(response.rendezVousConfirmes || []).map((rdv: any) => ({
          ...rdv,
          status: 'confirmé'
        })),
        ...(response.rendezVousDemandes || []).map((rdv: any) => ({
          ...rdv,
          status: 'en attente'
        }))
      ];
      
      // Calculer les statistiques
      this.stats.rdvConfirmes = response.rendezVousConfirmes?.length || 0;
      this.stats.rdvEnAttente = response.rendezVousDemandes?.length || 0;
      
      // Un ensemble d'emails uniques pour compter les patients
      const uniquePatients = new Set();
      rendezVous.forEach((rdv: any) => {
        uniquePatients.add(rdv.userEmail);
      });
      this.stats.totalPatients = uniquePatients.size;
      
      // Rendez-vous d'aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      this.rendezVousAujourdhui = rendezVous
        .filter((rdv: any) => rdv.date === today)
        .sort((a: any, b: any) => a.heure.localeCompare(b.heure));
      
      // Rendez-vous en attente
      this.rendezVousAttente = rendezVous
        .filter((rdv: any) => rdv.status === 'en attente')
        .sort((a: any, b: any) => new Date(a.date + 'T' + a.heure).getTime() - new Date(b.date + 'T' + b.heure).getTime());
      
      console.log('Rendez-vous chargés:', rendezVous);
    } catch (error) {
      console.error('Erreur chargement rendez-vous:', error);
      this.showToast('Impossible de charger vos rendez-vous', 'danger');
    }
  }
  
  toggleRendezVousExpand() {
    this.isRendezVousExpanded = !this.isRendezVousExpanded;
  }
  
  togglePatientsExpand() {
    this.isPatientsExpanded = !this.isPatientsExpanded;
  }
  
  async confirmRendezVous(rdv: any) {
    try {
      await this.authService.manageRendezVous(rdv.userEmail, rdv.date, rdv.heure, 'accept').toPromise();
      this.showToast('Rendez-vous confirmé avec succès', 'success');
      // Actualiser la liste des rendez-vous
      const medecinEmail = localStorage.getItem('email');
      if (medecinEmail) {
        await this.loadRendezVous(medecinEmail);
      }
    } catch (error) {
      console.error('Erreur lors de la confirmation du rendez-vous:', error);
      this.showToast('Erreur lors de la confirmation du rendez-vous', 'danger');
    }
  }
  
  async rejectRendezVous(rdv: any) {
    try {
      await this.authService.manageRendezVous(rdv.userEmail, rdv.date, rdv.heure, 'refuse').toPromise();
      this.showToast('Rendez-vous rejeté', 'success');
      // Actualiser la liste des rendez-vous
      const medecinEmail = localStorage.getItem('email');
      if (medecinEmail) {
        await this.loadRendezVous(medecinEmail);
      }
    } catch (error) {
      console.error('Erreur lors du rejet du rendez-vous:', error);
      this.showToast('Erreur lors du rejet du rendez-vous', 'danger');
    }
  }
  
  goToRendezVous() {
    this.router.navigate(['/rendez-vous-medecin']);
  }
  
  goToConsultation(rdv: any) {
    this.router.navigate(['/consultation'], { 
      queryParams: { 
        userEmail: rdv.userEmail,
        date: rdv.date,
        heure: rdv.heure 
      } 
    });
  }
  
  contactPatient(rdv: any) {
    this.router.navigate(['/conversation'], { 
      queryParams: { 
        otherUser: rdv.userEmail 
      } 
    });
  }
  
  goToPatients() {
    this.router.navigate(['/patients-medecin']);
  }
  
  goToMessages() {
    // Bypass any login check for navigation
    this.router.navigate(['/tabs/messages-list']);
  }
  
  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color,
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    toast.present();
  }
}
