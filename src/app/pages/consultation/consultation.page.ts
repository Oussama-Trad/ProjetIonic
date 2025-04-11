import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-consultation',
  templateUrl: './consultation.page.html',
  styleUrls: ['./consultation.page.scss'],
  standalone: false, // Déclaré dans un module
})
export class ConsultationPage implements OnInit {
  isLoggedIn: boolean = false;
  role: string | null = null;
  userEmail: string | null = null;
  date: string | null = null;
  heure: string | null = null;
  diagnostics: string[] = [];
  prescriptions: string[] = [];
  newDiagnostic: string = '';
  newPrescription: string = '';

  constructor(private route: ActivatedRoute, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      this.role = localStorage.getItem('role');
      if (loggedIn && this.role === 'medecin') {
        this.userEmail = this.route.snapshot.queryParamMap.get('userEmail');
        this.date = this.route.snapshot.queryParamMap.get('date');
        this.heure = this.route.snapshot.queryParamMap.get('heure');
        this.loadConsultation();
      } else if (this.role === 'patient') {
        this.router.navigate(['/accueil']);
      }
    });
  }

  loadConsultation() {
    if (this.userEmail && this.date && this.heure) {
      this.authService.getConsultation(this.userEmail, this.date, this.heure).subscribe({
        next: (response: any) => {
          this.diagnostics = response.diagnostics || [];
          this.prescriptions = response.prescriptions || [];
        },
        error: (err: any) => console.error('Erreur chargement consultation :', err),
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
      prescriptions: this.prescriptions,
    };
    this.authService.saveConsultation(consultation).subscribe({
      next: () => {
        alert('Consultation enregistrée avec succès');
        this.router.navigate(['/accueil-medecin']);
      },
      error: (err: any) => alert('Erreur : ' + (err.error?.msg || 'Échec')),
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}