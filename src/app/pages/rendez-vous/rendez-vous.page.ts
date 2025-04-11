import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-rendez-vous',
  templateUrl: './rendez-vous.page.html',
  styleUrls: ['./rendez-vous.page.scss'],
  standalone: false, // Déclaré dans un module
})
export class RendezVousPage implements OnInit {
  medecin: any = {};
  currentMonth: Date = new Date();
  calendarDays: { date: Date; isAvailable: boolean; isToday: boolean }[] = [];
  selectedDay: string | null = null;
  selectedHeure: string = '';
  disponibilites: any = {};
  documentName: string = '';
  documentFile: File | null = null;
  documentUrl: string | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const medecinEmail = this.route.snapshot.queryParamMap.get('medecinEmail');
    if (medecinEmail) {
      this.loadMedecinData(medecinEmail);
      this.loadDisponibilites(medecinEmail);
    } else {
      console.error('Aucun email de médecin fourni');
      this.router.navigate(['/accueil']);
    }
    this.checkAuth();
  }

  checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Aucun token trouvé');
      this.router.navigate(['/login']);
    }
  }

  loadMedecinData(medecinEmail: string) {
    this.authService.getMedecin(medecinEmail).subscribe({
      next: (response: any) => {
        this.medecin = response;
        console.log('Données médecin chargées :', this.medecin);
        this.loadCalendar();
      },
      error: (err: any) => {
        console.error('Erreur chargement médecin :', err);
        if (err.status === 401) this.router.navigate(['/login']);
      },
    });
  }

  loadDisponibilites(medecinEmail: string) {
    this.authService.getMedecinDisponibilites(medecinEmail).subscribe({
      next: (response: any) => {
        this.disponibilites = response;
        console.log('Disponibilités chargées :', this.disponibilites);
        this.loadCalendar();
      },
      error: (err: any) => {
        console.error('Erreur chargement disponibilités :', err);
        if (err.status === 401) this.router.navigate(['/login']);
      },
    });
  }

  loadCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    this.calendarDays = [];
    for (let i = 0; i < startDay; i++) {
      this.calendarDays.push({ date: new Date(year, month, -(startDay - 1) + i), isAvailable: false, isToday: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const isAvailable = this.isDayAvailable(currentDate);
      const isToday = currentDate.toDateString() === new Date().toDateString();
      this.calendarDays.push({ date: currentDate, isAvailable, isToday });
    }
  }

  isDayAvailable(date: Date): boolean {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    const dateStr = date.toISOString().split('T')[0];
    const heuresPossibles = this.generateAvailableSlots();
    const rdvConflicts = (this.disponibilites.rendezVousConfirmes || [])
      .concat(this.disponibilites.rendezVousDemandes || [])
      .filter((rdv: any) => rdv.date === dateStr && ['accepté', 'en attente'].includes(rdv.statut));

    const availableSlots = heuresPossibles.filter((heure) =>
      !rdvConflicts.some((rdv: any) => rdv.heure === heure)
    );
    return availableSlots.length > 0;
  }

  generateAvailableSlots(): string[] {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }

  isSlotAvailable(date: string, heure: string): boolean {
    const rdvConflicts = (this.disponibilites.rendezVousConfirmes || [])
      .concat(this.disponibilites.rendezVousDemandes || [])
      .some((rdv: any) => rdv.date === date && rdv.heure === heure && ['accepté', 'en attente'].includes(rdv.statut));
    return !rdvConflicts;
  }

  selectDay(day: { date: Date; isAvailable: boolean; isToday: boolean }) {
    if (day.isAvailable) {
      this.selectedDay = day.date.toISOString().split('T')[0];
      this.selectedHeure = '';
      console.log('Jour sélectionné :', this.selectedDay);
    }
  }

  getHoursForSelectedDay(): { heure: string; disponible: boolean }[] {
    if (!this.selectedDay) return [];
    const heuresPossibles = this.generateAvailableSlots();
    return heuresPossibles.map((heure) => ({
      heure,
      disponible: this.isSlotAvailable(this.selectedDay!, heure),
    }));
  }

  previousMonth() {
    this.currentMonth = new Date(this.currentMonth.setMonth(this.currentMonth.getMonth() - 1));
    this.loadCalendar();
    this.selectedDay = null;
    this.selectedHeure = '';
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.setMonth(this.currentMonth.getMonth() + 1));
    this.loadCalendar();
    this.selectedDay = null;
    this.selectedHeure = '';
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.documentFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.documentUrl = reader.result as string;
      };
      reader.readAsDataURL(this.documentFile);
    }
  }

  uploadDocument() {
    if (!this.documentFile || !this.documentName) return;
    this.authService.uploadDocument(this.documentName, this.documentUrl!, this.medecin.email).subscribe({
      next: () => console.log('Document téléversé avec succès'),
      error: (err) => {
        console.error('Erreur téléversement document :', err);
        alert('Erreur ajout document');
      },
    });
  }

  createRendezVous() {
    if (!this.selectedDay || !this.selectedHeure) {
      alert('Veuillez sélectionner un jour et un créneau horaire');
      return;
    }

    const userEmail = localStorage.getItem('email');
    if (!userEmail) {
      alert('Vous devez être connecté pour réserver');
      this.goToLogin();
      return;
    }

    const rdvData: any = {
      medecinEmail: this.medecin.email,
      userEmail: userEmail,
      date: this.selectedDay,
      heure: this.selectedHeure,
      motif: 'Consultation générale',
    };

    if (this.documentUrl && this.documentName) {
      rdvData.document = { nom: this.documentName, url: this.documentUrl };
    }

    this.authService.createRendezVous(rdvData).subscribe({
      next: (response) => {
        alert('Rendez-vous demandé avec succès !');
        this.selectedDay = null;
        this.selectedHeure = '';
        this.documentName = '';
        this.documentFile = null;
        this.documentUrl = null;
        this.fileInput.nativeElement.value = '';
        this.loadDisponibilites(this.medecin.email);
      },
      error: (err) => {
        console.error('Erreur création rendez-vous :', err);
        alert(`Erreur : ${err.error?.msg || 'Échec'}`);
        if (err.status === 401) this.router.navigate(['/login']);
      },
    });
  }

  getMonthYear(): string {
    return this.currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToAccueil() {
    this.router.navigate(['/tabs/accueil']);
  }
}