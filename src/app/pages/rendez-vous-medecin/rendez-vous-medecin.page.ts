import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-rendez-vous-medecin',
  templateUrl: './rendez-vous-medecin.page.html',
  styleUrls: ['./rendez-vous-medecin.page.scss'],
  standalone: false,
})
export class RendezVousMedecinPage implements OnInit {
  rendezVous: any[] = [];
  rendezVousFiltered: any[] = [];
  currentFilter: string = 'all';
  isLoading: boolean = false;
  medecinEmail: string | null = null;
  
  // Vue calendrier
  currentMonth: Date = new Date();
  calendarDays: { 
    date: Date; 
    isAvailable: boolean; 
    isToday: boolean;
    hasAppointments: boolean;
    appointmentsCount: number;
  }[] = [];
  
  // Options de filtre de date
  startDate: string = '';
  endDate: string = '';
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    this.medecinEmail = localStorage.getItem('email');
    if (!this.medecinEmail) {
      this.showToast('Erreur: Utilisateur non connecté', 'danger');
      this.router.navigate(['/login']);
      return;
    }
    
    const role = localStorage.getItem('role');
    if (role !== 'medecin') {
      this.showToast('Accès refusé: Cette page est réservée aux médecins', 'danger');
      this.router.navigate(['/tabs/accueil']);
      return;
    }
    
    // Initialiser les dates par défaut (derniers 30 jours)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    this.startDate = this.formatDateForInput(thirtyDaysAgo);
    this.endDate = this.formatDateForInput(today);
    
    await this.loadRendezVous();
    this.loadCalendar();
  }
  
  formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  async loadRendezVous() {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Chargement des rendez-vous...',
      spinner: 'crescent'
    });
    await loading.present();
    
    if (!this.medecinEmail) return;
    
    try {
      // Récupérer les rendez-vous du médecin
      const response: any = await this.authService.getMedecinDisponibilites(this.medecinEmail).toPromise();
      
      // Fusionner les rendez-vous confirmés et demandés
      this.rendezVous = [
        ...(response.rendezVousConfirmes || []).map((rdv: any) => ({
          ...rdv,
          status: 'confirmé'
        })),
        ...(response.rendezVousDemandes || []).map((rdv: any) => ({
          ...rdv,
          status: 'en attente'
        }))
      ];
      
      // Trier par date et heure
      this.rendezVous.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.heure}`);
        const dateB = new Date(`${b.date}T${b.heure}`);
        return dateA.getTime() - dateB.getTime();
      });
      
      this.applyFilters();
      loading.dismiss();
      this.isLoading = false;
    } catch (error) {
      console.error('Erreur lors du chargement des rendez-vous:', error);
      this.showToast('Erreur lors du chargement des rendez-vous', 'danger');
      loading.dismiss();
      this.isLoading = false;
    }
  }
  
  applyFilters() {
    let filtered = [...this.rendezVous];
    
    // Filtrer par statut
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(rdv => rdv.status === this.currentFilter);
    }
    
    // Filtrer par plage de dates
    if (this.startDate && this.endDate) {
      filtered = filtered.filter(rdv => {
        const rdvDate = new Date(rdv.date);
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        // Ajuster pour inclure la date de fin complète
        end.setHours(23, 59, 59, 999);
        
        return rdvDate >= start && rdvDate <= end;
      });
    }
    
    this.rendezVousFiltered = filtered;
  }
  
  loadCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    // Premier jour du mois
    const firstDay = new Date(year, month, 1);
    
    // Dernier jour du mois
    const lastDay = new Date(year, month + 1, 0);
    
    // Nombre de jours dans le mois
    const daysInMonth = lastDay.getDate();
    
    // Jour de la semaine du premier jour (0 = dimanche, 1 = lundi, ..., 6 = samedi)
    // On ajuste pour que lundi soit le premier jour (0)
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    this.calendarDays = [];
    
    // Jours du mois précédent pour compléter la première semaine
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startDay; i++) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - startDay + i + 1);
      this.calendarDays.push({ 
        date: prevDate, 
        isAvailable: true, 
        isToday: this.isToday(prevDate),
        hasAppointments: this.hasAppointmentsOnDate(prevDate),
        appointmentsCount: this.getAppointmentsCountForDate(prevDate)
      });
    }
    
    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      
      this.calendarDays.push({ 
        date: currentDate, 
        isAvailable: true, 
        isToday: this.isToday(currentDate),
        hasAppointments: this.hasAppointmentsOnDate(currentDate),
        appointmentsCount: this.getAppointmentsCountForDate(currentDate)
      });
    }
    
    // Jours du mois suivant pour compléter la dernière semaine
    const remainingDays = 42 - this.calendarDays.length; // 6 semaines * 7 jours = 42
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      this.calendarDays.push({ 
        date: nextDate, 
        isAvailable: true, 
        isToday: this.isToday(nextDate),
        hasAppointments: this.hasAppointmentsOnDate(nextDate),
        appointmentsCount: this.getAppointmentsCountForDate(nextDate)
      });
    }
  }
  
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  }
  
  hasAppointmentsOnDate(date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return this.rendezVous.some(rdv => rdv.date === dateStr);
  }
  
  getAppointmentsCountForDate(date: Date): number {
    const dateStr = date.toISOString().split('T')[0];
    return this.rendezVous.filter(rdv => rdv.date === dateStr).length;
  }
  
  getAppointmentsForDate(date: Date): any[] {
    const dateStr = date.toISOString().split('T')[0];
    return this.rendezVous.filter(rdv => rdv.date === dateStr).sort((a, b) => {
      return a.heure.localeCompare(b.heure);
    });
  }
  
  async showAppointmentsForDay(day: any) {
    const appointments = this.getAppointmentsForDate(day.date);
    
    if (appointments.length === 0) {
      this.showToast('Aucun rendez-vous pour cette date', 'secondary');
      return;
    }
    
    const dateFormatted = day.date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    const alert = await this.alertController.create({
      header: `Rendez-vous du ${dateFormatted}`,
      cssClass: 'appointment-alert',
      message: this.formatAppointmentsListForAlert(appointments),
      buttons: [
        {
          text: 'Fermer',
          role: 'cancel'
        },
        {
          text: 'Voir tous',
          handler: () => {
            this.startDate = this.formatDateForInput(day.date);
            this.endDate = this.formatDateForInput(day.date);
            this.applyFilters();
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  formatAppointmentsListForAlert(appointments: any[]): string {
    let html = '<div class="appointments-list">';
    
    appointments.forEach(app => {
      const statusClass = app.status === 'confirmé' ? 'confirmed' : 'pending';
      
      html += `
        <div class="appointment-item ${statusClass}">
          <div class="time">${app.heure}</div>
          <div class="patient">${app.userName}</div>
          <div class="status">${app.status}</div>
        </div>
      `;
    });
    
    html += '</div>';
    return html;
  }
  
  previousMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.loadCalendar();
  }
  
  nextMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.loadCalendar();
  }
  
  filterChanged() {
    this.applyFilters();
  }
  
  dateFilterChanged() {
    this.applyFilters();
  }
  
  async confirmRendezVous(rdv: any) {
    const alert = await this.alertController.create({
      header: 'Confirmer le rendez-vous',
      message: `Voulez-vous confirmer le rendez-vous avec ${rdv.userName} le ${new Date(rdv.date).toLocaleDateString('fr-FR')} à ${rdv.heure} ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: async () => {
            try {
              await this.authService.manageRendezVous(rdv.userEmail, rdv.date, rdv.heure, 'confirmer').toPromise();
              this.showToast('Rendez-vous confirmé avec succès', 'success');
              // Mettre à jour le rendez-vous dans la liste
              const index = this.rendezVous.findIndex(r => 
                r.userEmail === rdv.userEmail && r.date === rdv.date && r.heure === rdv.heure
              );
              if (index !== -1) {
                this.rendezVous[index].status = 'confirmé';
                this.applyFilters();
              }
            } catch (error) {
              console.error('Erreur lors de la confirmation du rendez-vous:', error);
              this.showToast('Erreur lors de la confirmation du rendez-vous', 'danger');
            }
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  async rejectRendezVous(rdv: any) {
    const alert = await this.alertController.create({
      header: 'Rejeter le rendez-vous',
      message: `Voulez-vous rejeter le rendez-vous avec ${rdv.userName} le ${new Date(rdv.date).toLocaleDateString('fr-FR')} à ${rdv.heure} ?`,
      inputs: [
        {
          name: 'reason',
          type: 'text',
          placeholder: 'Motif du rejet (optionnel)'
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Rejeter',
          handler: async (data) => {
            try {
              await this.authService.manageRendezVous(rdv.userEmail, rdv.date, rdv.heure, 'rejeter').toPromise();
              this.showToast('Rendez-vous rejeté', 'success');
              // Supprimer le rendez-vous de la liste
              this.rendezVous = this.rendezVous.filter(r => 
                !(r.userEmail === rdv.userEmail && r.date === rdv.date && r.heure === rdv.heure)
              );
              this.applyFilters();
            } catch (error) {
              console.error('Erreur lors du rejet du rendez-vous:', error);
              this.showToast('Erreur lors du rejet du rendez-vous', 'danger');
            }
          }
        }
      ]
    });
    
    await alert.present();
  }
  
  getMonthYear(): string {
    const options = { month: 'long' as const, year: 'numeric' as const };
    return this.currentMonth.toLocaleDateString('fr-FR', options);
  }
  
  async goToConsultation(rdv: any) {
    this.router.navigate(['/consultation'], { 
      queryParams: { 
        userEmail: rdv.userEmail,
        date: rdv.date,
        heure: rdv.heure
      }
    });
  }
  
  async contactPatient(rdv: any) {
    this.router.navigate(['/conversation'], { 
      queryParams: { 
        otherUser: rdv.userEmail
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