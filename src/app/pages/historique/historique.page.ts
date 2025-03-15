import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-historique',
  templateUrl: './historique.page.html',
  styleUrls: ['./historique.page.scss'],
  standalone: false,
})
export class HistoriquePage implements OnInit {
  role: string | null = null;
  email: string | null = null;
  historique: any[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.role = localStorage.getItem('role');
    this.email = localStorage.getItem('email');
    this.loadHistorique();
  }

  loadHistorique() {
    if (this.email) {
      const fetchMethod = this.role === 'medecin' ? this.authService.getMedecin : this.authService.getUser;
      fetchMethod(this.email).subscribe({
        next: (response: any) => {
          this.historique = response.consultations || [];
        },
        error: (err) => console.error('Erreur chargement historique :', err)
      });
    }
  }
}