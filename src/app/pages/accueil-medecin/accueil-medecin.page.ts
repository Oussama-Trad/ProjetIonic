import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-accueil-medecin',
  templateUrl: './accueil-medecin.page.html',
  styleUrls: ['./accueil-medecin.page.scss'],
  standalone:false
})
export class AccueilMedecinPage implements OnInit {
  user: any = {};
  fullName: string = 'Médecin';
  rendezVousDemandes: any[] = [];
  rendezVousConfirmes: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    const email = localStorage.getItem('email');
    if (email) {
      const loading = await this.loadingController.create({
        message: 'Chargement des données...',
      });
      await loading.present();

      this.authService.getMedecin(email).subscribe({
        next: (response: any) => {
          this.user = response || {};
          this.fullName = `${this.user.prenom || ''} ${this.user.nom || ''}`.trim() || 'Médecin';
          this.rendezVousDemandes = this.user.rendezVousDemandes || [];
          this.rendezVousConfirmes = this.user.rendezVousConfirmes || [];
          loading.dismiss();
        },
        error: async (err: any) => {
          console.error('Erreur chargement données médecin:', err);
          await this.showToast('Erreur', 'Échec du chargement des données');
          loading.dismiss();
        },
      });
    }
  }

  async manageRendezVous(rdv: any, action: string) {
    const loading = await this.loadingController.create({
      message: 'Traitement en cours...',
    });
    await loading.present();

    this.authService
      .manageRendezVous(rdv.userEmail, rdv.date, rdv.heure, action)
      .subscribe({
        next: async () => {
          await this.refreshData();
          await this.showToast('Succès', `Rendez-vous ${action === 'accept' ? 'accepté' : 'refusé'} avec succès`, 'success');
          loading.dismiss();
        },
        error: async (err: any) => {
          console.error(`Erreur lors de ${action} rendez-vous:`, err);
          await this.showToast('Erreur', 'Échec de l’opération. Veuillez réessayer.');
          loading.dismiss();
        },
      });
  }

  async refreshData() {
    const email = localStorage.getItem('email');
    if (email) {
      this.authService.getMedecin(email).subscribe({
        next: (response: any) => {
          this.user = response || {};
          this.rendezVousDemandes = this.user.rendezVousDemandes || [];
          this.rendezVousConfirmes = this.user.rendezVousConfirmes || [];
        },
        error: async (err: any) => {
          console.error('Erreur rechargement données:', err);
          await this.showToast('Erreur', 'Échec du rechargement des données');
        },
      });
    }
  }

  goToConsultation(rdv: any) {
    this.router.navigate(['/consultation'], {
      queryParams: {
        userEmail: rdv.userEmail,
        date: rdv.date,
        heure: rdv.heure,
      },
    });
  }

  async showToast(header: string, message: string, color: string = 'danger') {
    const toast = await this.toastController.create({
      header,
      message,
      duration: 3000,
      position: 'top',
      color: color === 'success' ? 'success' : 'danger',
      buttons: [{ text: 'OK', role: 'cancel' }],
    });
    await toast.present();
  }
}