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
    this.loadMedecins();
    loading.dismiss();
  }

  loadMedecins() {
    this.authService.getAllMedecins().subscribe({
      next: (response) => {
        this.medecins = response || [];
        this.filteredMedecins = [...this.medecins];
        console.log('Tous les médecins chargés :', this.medecins);
      },
      error: (err) => console.error('Erreur chargement médecins :', err),
    });
  }

  filterMedecins() {
    this.filteredMedecins = this.medecins.filter((medecin) =>
      `${medecin.prenom} ${medecin.nom} ${medecin.specialite}`
        .toLowerCase()
        .includes(this.searchQuery.toLowerCase())
    );
  }

  goToMedecinCalendar(medecinEmail: string) {
    this.router.navigate(['/rendez-vous'], { queryParams: { medecinEmail } });
  }
}