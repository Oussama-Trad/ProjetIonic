import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms'; // Pour ngModel
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-rendez-vous',
  templateUrl: './rendez-vous.page.html',
  styleUrls: ['./rendez-vous.page.scss'],


  standalone: false
})
export class RendezVousPage implements OnInit {
  medecin: any = {};
  selectedDate: string = '';
  selectedHeure: string = '';
  motif: string = '';
  availableSlots: { date: string, heure: string, disponible: boolean }[] = [];

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    const medecinEmail = this.route.snapshot.queryParamMap.get('medecinEmail');
    if (medecinEmail) {
      this.authService.getMedecin(medecinEmail).subscribe({
        next: (response: any) => {
          this.medecin = response;
          this.loadAvailableSlots();
        },
        error: (err: any) => console.error('Erreur chargement médecin :', err)
      });
    }
  }

  loadAvailableSlots() {
    const today = new Date();
    this.availableSlots = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const heures = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
      heures.forEach(heure => {
        const disponible = this.isSlotAvailable(dateStr, heure);
        this.availableSlots.push({ date: dateStr, heure, disponible });
      });
    }
  }

  isSlotAvailable(date: string, heure: string): boolean {
    const horaires = this.medecin.horairesDisponibilite || [];
    const isInHoraires = horaires.some((slot: any) => slot.date === date && slot.heure === heure && slot.disponible);
    if (!isInHoraires) return false;

    const rdvConflict = (this.medecin.rendezVousConfirmes || []).concat(this.medecin.rendezVousDemandes || [])
      .some((rdv: any) => rdv.date === date && rdv.heure === heure && rdv.statut in ['accepté', 'en attente']);
    return !rdvConflict;
  }

  selectSlot(date: string, heure: string) {
    if (this.isSlotAvailable(date, heure)) {
      this.selectedDate = date;
      this.selectedHeure = heure;
    }
  }

  createRendezVous() {
    if (!this.selectedDate || !this.selectedHeure || !this.motif) {
      alert('Veuillez sélectionner un créneau et entrer un motif');
      return;
    }
    this.authService.createRendezVous({
      medecinEmail: this.medecin.email,
      date: this.selectedDate,
      heure: this.selectedHeure,
      motif: this.motif
    }).subscribe({
      next: () => {
        alert('Rendez-vous demandé avec succès !');
        this.router.navigate(['/accueil']);
      },
      error: (err: any) => alert('Erreur : ' + (err.error?.msg || 'Échec'))
    });
  }
}