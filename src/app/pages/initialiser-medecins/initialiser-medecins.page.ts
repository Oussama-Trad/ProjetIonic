import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AjouterMedecinsService } from '../../services/ajouter-medecins.service';

@Component({
  selector: 'app-initialiser-medecins',
  templateUrl: './initialiser-medecins.page.html',
  styleUrls: ['./initialiser-medecins.page.scss'],
  standalone: false,
})
export class InitialiserMedecinsPage implements OnInit {
  isLoading: boolean = false;
  resultat: string = '';

  constructor(
    private ajouterMedecinsService: AjouterMedecinsService,
    private toastController: ToastController
  ) { }

  ngOnInit() {
  }

  async initialiserMedecins() {
    this.isLoading = true;
    this.resultat = 'Initialisation des médecins en cours...';
    
    this.ajouterMedecinsService.ajouterMedecins().subscribe({
      next: (response) => {
        console.log('Résultat de l\'initialisation :', response);
        this.resultat = 'Médecins ajoutés avec succès !';
        this.isLoading = false;
        this.showToast('Base de données initialisée avec succès', 'success');
      },
      error: (error) => {
        console.error('Erreur lors de l\'initialisation :', error);
        this.resultat = 'Erreur lors de l\'initialisation des médecins. Veuillez consulter la console pour plus de détails.';
        this.isLoading = false;
        this.showToast('Erreur lors de l\'initialisation', 'danger');
      }
    });
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