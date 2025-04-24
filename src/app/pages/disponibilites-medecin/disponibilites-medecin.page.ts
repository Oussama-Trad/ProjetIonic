import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-disponibilites-medecin',
  templateUrl: './disponibilites-medecin.page.html',
  styleUrls: ['./disponibilites-medecin.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DisponibilitesMedecinPage implements OnInit {
  medecin: any = {};
  disponibilites: any = {
    lundi: [],
    mardi: [],
    mercredi: [],
    jeudi: [],
    vendredi: [],
    samedi: [],
    dimanche: []
  };
  joursSemaine = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  heuresDisponibles: string[] = [];
  jourSelectionne: string = 'lundi';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    // Générer toutes les heures disponibles (8h-18h par tranches de 30min)
    for (let heure = 8; heure < 18; heure++) {
      for (let minute of [0, 30]) {
        this.heuresDisponibles.push(`${heure.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
  }

  async ngOnInit() {
    await this.showLoading('Chargement de vos disponibilités...');
    this.loadMedecinData();
  }

  async showLoading(message: string) {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: message,
      spinner: 'crescent'
    });
    await loading.present();
    return loading;
  }

  hideLoading() {
    this.isLoading = false;
    this.loadingController.dismiss();
  }

  async showToast(message: string, color: string = 'primary') {
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

  async loadMedecinData() {
    const email = localStorage.getItem('email');
    if (!email) {
      this.hideLoading();
      this.showToast('Vous devez être connecté pour accéder à cette page', 'danger');
      this.router.navigate(['/login']);
      return;
    }

    try {
      const response: any = await this.authService.getMedecin(email).toPromise();
      this.medecin = response;
      console.log('Données médecin chargées :', this.medecin);
      
      // Initialiser les disponibilités avec celles du médecin ou avec un objet vide
      if (this.medecin.disponibilites) {
        this.disponibilites = { ...this.medecin.disponibilites };
      } else {
        // Initialiser avec des tableaux vides pour chaque jour
        this.joursSemaine.forEach(jour => {
          this.disponibilites[jour] = [];
        });
      }
      
      this.hideLoading();
    } catch (err: any) {
      console.error('Erreur chargement médecin :', err);
      this.hideLoading();
      this.showToast('Impossible de charger vos informations', 'danger');
      
      if (err.status === 401) {
        this.router.navigate(['/login']);
      } else {
        this.router.navigate(['/accueil-medecin']);
      }
    }
  }

  selectJour(jour: string) {
    this.jourSelectionne = jour;
  }

  toggleHeure(heure: string) {
    const index = this.disponibilites[this.jourSelectionne].indexOf(heure);
    if (index === -1) {
      // Ajouter l'heure aux disponibilités
      this.disponibilites[this.jourSelectionne].push(heure);
      // Trier les heures
      this.disponibilites[this.jourSelectionne].sort();
    } else {
      // Supprimer l'heure des disponibilités
      this.disponibilites[this.jourSelectionne].splice(index, 1);
    }
  }

  isHeureSelected(heure: string): boolean {
    return this.disponibilites[this.jourSelectionne].includes(heure);
  }

  async saveDisponibilites() {
    await this.showLoading('Enregistrement de vos disponibilités...');
    
    try {
      await this.authService.updateMedecinDisponibilites(this.disponibilites).toPromise();
      this.hideLoading();
      this.showToast('Vos disponibilités ont été mises à jour avec succès', 'success');
    } catch (err: any) {
      console.error('Erreur enregistrement disponibilités :', err);
      this.hideLoading();
      this.showToast('Erreur lors de l\'enregistrement de vos disponibilités', 'danger');
    }
  }

  async copierJourPrecedent() {
    const jourIndex = this.joursSemaine.indexOf(this.jourSelectionne);
    if (jourIndex > 0) {
      const jourPrecedent = this.joursSemaine[jourIndex - 1];
      const alert = await this.alertController.create({
        header: 'Copier les disponibilités',
        message: `Voulez-vous copier les disponibilités de ${jourPrecedent} vers ${this.jourSelectionne} ?`,
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'Copier',
            handler: () => {
              this.disponibilites[this.jourSelectionne] = [...this.disponibilites[jourPrecedent]];
              this.showToast(`Disponibilités de ${jourPrecedent} copiées vers ${this.jourSelectionne}`, 'success');
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.showToast('Aucun jour précédent disponible', 'warning');
    }
  }

  async copierJourSuivant() {
    const jourIndex = this.joursSemaine.indexOf(this.jourSelectionne);
    if (jourIndex < this.joursSemaine.length - 1) {
      const jourSuivant = this.joursSemaine[jourIndex + 1];
      const alert = await this.alertController.create({
        header: 'Copier les disponibilités',
        message: `Voulez-vous copier les disponibilités de ${jourSuivant} vers ${this.jourSelectionne} ?`,
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'Copier',
            handler: () => {
              this.disponibilites[this.jourSelectionne] = [...this.disponibilites[jourSuivant]];
              this.showToast(`Disponibilités de ${jourSuivant} copiées vers ${this.jourSelectionne}`, 'success');
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.showToast('Aucun jour suivant disponible', 'warning');
    }
  }

  async copierVersAutresJours() {
    const alert = await this.alertController.create({
      header: 'Copier vers tous les jours',
      message: `Voulez-vous copier les disponibilités de ${this.jourSelectionne} vers tous les autres jours de la semaine ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Copier',
          handler: () => {
            const disponibilitesJourCourant = [...this.disponibilites[this.jourSelectionne]];
            this.joursSemaine.forEach(jour => {
              if (jour !== this.jourSelectionne) {
                this.disponibilites[jour] = [...disponibilitesJourCourant];
              }
            });
            this.showToast(`Disponibilités copiées vers tous les jours`, 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  async effacerJour() {
    const alert = await this.alertController.create({
      header: 'Effacer les disponibilités',
      message: `Voulez-vous effacer toutes les disponibilités pour ${this.jourSelectionne} ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Effacer',
          handler: () => {
            this.disponibilites[this.jourSelectionne] = [];
            this.showToast(`Disponibilités effacées pour ${this.jourSelectionne}`, 'success');
          }
        }
      ]
    });
    await alert.present();
  }
}
