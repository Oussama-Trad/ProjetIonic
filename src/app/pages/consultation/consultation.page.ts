import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-consultation',
  templateUrl: './consultation.page.html',
  styleUrls: ['./consultation.page.scss'],
  standalone: false,
})
export class ConsultationPage implements OnInit {
  userEmail: string | null = null; // Remplace patientId
  date: string | null = null;
  heure: string | null = null;
  diagnostics: string[] = [];
  prescriptions: string[] = [];
  newDiagnostic: string = '';
  newPrescription: string = '';

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.userEmail = this.route.snapshot.queryParamMap.get('userEmail');
    this.date = this.route.snapshot.queryParamMap.get('date');
    this.heure = this.route.snapshot.queryParamMap.get('heure');
    this.loadConsultation();
  }

  loadConsultation() {
    if (this.userEmail && this.date && this.heure) {
      this.authService.getConsultation(this.userEmail, this.date, this.heure).subscribe({
        next: (response: any) => {
          this.diagnostics = response.diagnostics || [];
          this.prescriptions = response.prescriptions || [];
        },
        error: (err: any) => console.error('Erreur chargement consultation :', err)
      });
    }
  }

  addDiagnostic() {
    if (this.newDiagnostic.trim()) {
      this.diagnostics.push(this.newDiagnostic.trim());
      this.newDiagnostic = '';
    }
  }

  addPrescription() {
    if (this.newPrescription.trim()) {
      this.prescriptions.push(this.newPrescription.trim());
      this.newPrescription = '';
    }
  }

  saveConsultation() {
    if (!this.userEmail || !this.date || !this.heure) {
      alert('Informations de consultation manquantes');
      return;
    }
    const consultation = {
      userEmail: this.userEmail,
      date: this.date,
      heure: this.heure,
      diagnostics: this.diagnostics,
      prescriptions: this.prescriptions
    };
    this.authService.saveConsultation(consultation).subscribe({
      next: () => {
        alert('Consultation enregistrée avec succès');
        this.router.navigate(['/accueil-medecin']);
      },
      error: (err: any) => alert('Erreur : ' + (err.error?.msg || 'Échec'))
    });
  }
}