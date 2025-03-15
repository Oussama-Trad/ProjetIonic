import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-rendez-vous',
  templateUrl: './rendez-vous.page.html',
  styleUrls: ['./rendez-vous.page.scss'],
  standalone : false
})
export class RendezVousPage implements OnInit {
  medecin: any = {};
  currentMonth: Date = new Date(); // Mois actuel
  calendarDays: { date: Date; isAvailable: boolean; isToday: boolean }[] = [];
  selectedDay: Date | null = null;
  selectedHeure: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const medecinEmail = this.route.snapshot.queryParamMap.get('medecinEmail');
    if (medecinEmail) {
      this.loadMedecinData(medecinEmail);
    } else {
      console.error('Aucun email de médecin fourni dans les paramètres');
      this.router.navigate(['/login']);
    }
    this.checkAuth();
  }

  checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('Aucun token trouvé. Redirection vers la page de connexion.');
      this.router.navigate(['/login']);
    }
  }

  loadMedecinData(medecinEmail: string) {
    this.authService.getMedecin(medecinEmail).subscribe({
      next: (response: any) => {
        this.medecin = response;
        console.log('Données du médecin chargées :', this.medecin);
        console.log('Rendez-vous demandés :', this.medecin.rendezVousDemandes); // Ajoute ceci
        this.loadCalendar();
      },
      error: (err: any) => {
        console.error('Erreur chargement médecin :', err);
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
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Ajustement pour commencer par lundi

    this.calendarDays = [];
    // Ajouter les jours vides avant le 1er du mois
    for (let i = 0; i < startDay; i++) {
      this.calendarDays.push({ date: new Date(year, month, -(startDay - 1) + i), isAvailable: false, isToday: false });
    }
    // Ajouter les jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const isAvailable = this.isDayAvailable(currentDate);
      const isToday = currentDate.toDateString() === new Date().toDateString();
      this.calendarDays.push({ date: currentDate, isAvailable, isToday });
    }
  }

  isDayAvailable(date: Date): boolean {
    const dayOfWeek = date.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
    if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Week-end

    const heuresPossibles = this.generateAvailableSlots(date);
    const dateStr = date.toISOString().split('T')[0];
    const rdvConflicts = (this.medecin.rendezVousConfirmes || [])
      .concat(this.medecin.rendezVousDemandes || [])
      .filter((rdv: any) => rdv.date === dateStr && ['accepté', 'en attente'].includes(rdv.statut));

    const availableSlots = heuresPossibles.filter(heure => 
      !rdvConflicts.some((rdv: any) => rdv.heure === heure)
    );
    return availableSlots.length > 0;
  }

  generateAvailableSlots(date: Date): string[] {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      const heureStr = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(heureStr);
    }
    return slots;
  }

  isSlotAvailable(date: string, heure: string): boolean {
    const rdvConflicts = (this.medecin.rendezVousConfirmes || [])
      .concat(this.medecin.rendezVousDemandes || [])
      .some((rdv: any) => rdv.date === date && rdv.heure === heure && ['accepté', 'en attente'].includes(rdv.statut));
    return !rdvConflicts;
  }

  selectDay(day: { date: Date; isAvailable: boolean; isToday: boolean }) {
    if (day.isAvailable) {
      this.selectedDay = day.date;
      this.selectedHeure = '';
      console.log('Jour sélectionné :', this.selectedDay);
    }
  }

  getHoursForSelectedDay(): { heure: string; disponible: boolean }[] {
    if (!this.selectedDay) return [];
    const dateStr = this.selectedDay.toISOString().split('T')[0];
    const heuresPossibles = this.generateAvailableSlots(this.selectedDay);
    return heuresPossibles.map(heure => ({
      heure,
      disponible: this.isSlotAvailable(dateStr, heure)
    }));
  }

  previousMonth() {
    this.currentMonth = new Date(this.currentMonth.setMonth(this.currentMonth.getMonth() - 1));
    this.loadCalendar();
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.setMonth(this.currentMonth.getMonth() + 1));
    this.loadCalendar();
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

    const dateStr = this.selectedDay.toISOString().split('T')[0];
    const rdvData = {
      medecinEmail: this.medecin.email,
      userEmail,
      date: dateStr,
      heure: this.selectedHeure,
      motif: 'Consultation générale' // Valeur par défaut, personnalisable si besoin
    };

    this.authService.createRendezVous(rdvData).subscribe({
      next: (response) => {
        console.log('Réponse du serveur :', response);
        alert('Rendez-vous demandé avec succès !');
        this.selectedDay = null;
        this.selectedHeure = '';
        this.loadMedecinData(this.medecin.email); // Recharger pour mettre à jour le calendrier
      },
      error: (err) => {
        console.error('Erreur lors de la création du rendez-vous :', err);
        const errorMsg = err.message || 'Échec de la réservation';
        alert(`Erreur : ${errorMsg}`);
        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
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
    this.router.navigate(['/accueil']);
  }
}