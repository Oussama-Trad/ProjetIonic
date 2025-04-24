import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-rendez-vous',
  templateUrl: './rendez-vous.page.html',
  styleUrls: ['./rendez-vous.page.scss'],
  standalone: false,
})
export class RendezVousPage implements OnInit {
  medecin: any = {};
  currentMonth: Date = new Date();
  calendarDays: { 
    date: Date; 
    isAvailable: boolean; 
    isToday: boolean;
  }[] = [];
  selectedDay: string | null = null;
  selectedHeure: string = '';
  disponibilites: any = { rendezVousConfirmes: [], rendezVousDemandes: [], creneauxDisponibles: [] };
  documentName: string = '';
  documentFile: File | null = null;
  documentUrl: string | null = null;
  isLoading: boolean = false;
  isPatient: boolean = false;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    await this.showLoading('Chargement du calendrier...');
    
    const medecinEmail = this.route.snapshot.queryParamMap.get('medecinEmail');
    if (medecinEmail) {
      this.loadMedecinData(medecinEmail);
      this.loadDisponibilites(medecinEmail);
    } else {
      this.hideLoading();
      this.showToast('Aucun médecin sélectionné', 'danger');
      this.router.navigate(['/tabs/accueil']);
    }
    
    this.checkAuth();
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

  checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.showToast('Vous devez vous connecter pour prendre un rendez-vous', 'warning');
      this.router.navigate(['/login']);
      return;
    }
    
    // Vérifier si l'utilisateur est un patient
    const role = localStorage.getItem('role');
    if (role === 'medecin') {
      this.isPatient = false;
      this.showToast('Les médecins ne peuvent pas prendre de rendez-vous. Cette fonctionnalité est réservée aux patients.', 'warning');
    } else {
      this.isPatient = true;
    }
  }

  async loadMedecinData(medecinEmail: string) {
    try {
      const response: any = await this.authService.getMedecin(medecinEmail).toPromise();
      this.medecin = response;
      console.log('Données médecin chargées :', this.medecin);
      this.loadCalendar();
    } catch (err: any) {
      console.error('Erreur chargement médecin :', err);
      this.hideLoading();
      this.showToast('Impossible de charger les informations du médecin', 'danger');
      
      if (err.status === 401) {
        this.router.navigate(['/login']);
      } else {
        this.router.navigate(['/tabs/tous-les-medecins']);
      }
    }
  }

  async loadDisponibilites(medecinEmail: string) {
    try {
      const response: any = await this.authService.getMedecinDisponibilites(medecinEmail).toPromise();
      this.disponibilites = response;
      console.log('Disponibilités chargées :', this.disponibilites);
      this.loadCalendar();
      this.hideLoading();
    } catch (err: any) {
      console.error('Erreur chargement disponibilités :', err);
      this.hideLoading();
      this.showToast('Impossible de charger les disponibilités', 'danger');
      
      if (err.status === 401) {
        this.router.navigate(['/login']);
      }
    }
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
        isAvailable: false, 
        isToday: this.isToday(prevDate)
      });
    }
    
    // Jours du mois actuel
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const isAvailable = this.isDayAvailable(currentDate);
      const isToday = this.isToday(currentDate);
      
      this.calendarDays.push({ 
        date: currentDate, 
        isAvailable, 
        isToday 
      });
    }
    
    // Jours du mois suivant pour compléter la dernière semaine
    const remainingDays = 42 - this.calendarDays.length; // 6 semaines * 7 jours = 42
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(year, month + 1, i);
      this.calendarDays.push({ 
        date: nextDate, 
        isAvailable: false, 
        isToday: this.isToday(nextDate)
      });
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  }

  isDayAvailable(date: Date): boolean {
    // Vérifier si c'est un jour dans le passé
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      return false;
    }
    
    // Vérifier si c'est un week-end
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    // Convertir la date en format ISO string YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    
    // Vérifier la disponibilité du médecin pour ce jour de la semaine
    const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const jourSemaine = joursSemaine[dayOfWeek].toLowerCase();
    
    // Si le médecin n'a pas de disponibilités pour ce jour, retourner false
    if (!this.medecin.disponibilites || !this.medecin.disponibilites[jourSemaine] || this.medecin.disponibilites[jourSemaine].length === 0) {
      return false;
    }
    
    // Récupérer tous les rendez-vous pour ce jour
    const rdvConflicts = (this.disponibilites.rendezVousConfirmes || [])
      .concat(this.disponibilites.rendezVousDemandes || [])
      .filter((rdv: any) => rdv.date === dateStr && ['accepté', 'en attente'].includes(rdv.statut));

    // Vérifier s'il y a des créneaux disponibles
    const availableSlots = this.medecin.disponibilites[jourSemaine].filter((heure: string) =>
      !rdvConflicts.some((rdv: any) => rdv.heure === heure)
    );
    
    return availableSlots.length > 0;
  }

  selectDay(day: { date: Date; isAvailable: boolean; isToday: boolean }) {
    // Ne rien faire si le jour n'est pas disponible
    if (!day.isAvailable) {
      console.log('Jour non disponible:', day.date);
      this.showToast('Ce jour n\'est pas disponible pour les rendez-vous', 'warning');
      return;
    }
    
    this.selectedDay = day.date.toISOString().split('T')[0];
    this.selectedHeure = '';
    console.log('Jour sélectionné:', this.selectedDay);
    
    // Charger les créneaux disponibles pour ce jour
    this.loadCreneauxDisponibles(this.selectedDay);
  }

  async loadCreneauxDisponibles(date: string) {
    if (!this.medecin || !this.medecin.email) {
      console.error('Aucun médecin sélectionné');
      return;
    }
    
    const loading = await this.showLoading('Chargement des créneaux disponibles...');
    
    try {
      const response: any = await this.authService.getMedecinCreneauxDisponibles(this.medecin.email, date).toPromise();
      console.log('Créneaux disponibles:', response);
      
      if (response.disponible) {
        // Mettre à jour l'interface avec les créneaux disponibles
        this.disponibilites.creneauxDisponibles = response.creneaux;
      } else {
        // Afficher un message si aucun créneau n'est disponible
        this.showToast(response.message || 'Aucun créneau disponible pour ce jour', 'warning');
        this.disponibilites.creneauxDisponibles = [];
      }
      
      this.hideLoading();
    } catch (err: any) {
      console.error('Erreur chargement créneaux:', err);
      this.hideLoading();
      this.showToast('Impossible de charger les créneaux disponibles', 'danger');
    }
  }

  getHoursForSelectedDay(): { heure: string; disponible: boolean }[] {
    if (!this.selectedDay) return [];
    
    // Si nous avons des créneaux disponibles chargés depuis l'API
    if (this.disponibilites.creneauxDisponibles) {
      return this.disponibilites.creneauxDisponibles.map((heure: string) => {
        return { heure, disponible: true };
      }).sort((a: { heure: string; disponible: boolean }, b: { heure: string; disponible: boolean }) => 
        a.heure.localeCompare(b.heure)
      );
    }
    
    // Fallback à l'ancienne méthode si les créneaux ne sont pas disponibles
    const selectedDate = new Date(this.selectedDay);
    const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const jourSemaine = joursSemaine[selectedDate.getDay()].toLowerCase();
    
    // Si le médecin n'a pas de disponibilités pour ce jour, retourner un tableau vide
    if (!this.medecin.disponibilites || !this.medecin.disponibilites[jourSemaine]) {
      return [];
    }
    
    // Récupérer tous les rendez-vous pour ce jour
    const rdvConflicts = (this.disponibilites.rendezVousConfirmes || [])
      .concat(this.disponibilites.rendezVousDemandes || [])
      .filter((rdv: any) => rdv.date === this.selectedDay && ['accepté', 'en attente'].includes(rdv.statut));
    
    // Créer un tableau avec toutes les heures et leur disponibilité
    return this.medecin.disponibilites[jourSemaine].map((heure: string) => {
      const disponible = !rdvConflicts.some((rdv: any) => rdv.heure === heure);
      return { heure, disponible };
    }).sort((a: { heure: string; disponible: boolean }, b: { heure: string; disponible: boolean }) => a.heure.localeCompare(b.heure));
  }

  isSlotAvailable(date: string, heure: string): boolean {
    const rdvConflicts = (this.disponibilites.rendezVousConfirmes || [])
      .concat(this.disponibilites.rendezVousDemandes || [])
      .some((rdv: any) => rdv.date === date && rdv.heure === heure && ['accepté', 'en attente'].includes(rdv.statut));
    
    return !rdvConflicts;
  }

  selectHeure(heure: string, disponible: boolean) {
    if (!disponible) return;
    
    this.selectedHeure = heure;
    console.log('Heure sélectionnée:', this.selectedHeure);
  }

  previousMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.loadCalendar();
  }

  nextMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.loadCalendar();
  }

  onFileChange(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      this.documentFile = fileInput.files[0];
      this.documentName = this.documentFile.name;
      console.log('Document sélectionné:', this.documentName);
      
      // Pour simuler un téléversement réussi
      this.uploadDocument();
    }
  }

  async uploadDocument() {
    if (!this.documentFile) return;
    
    const loading = await this.showLoading('Téléversement du document...');
    
    try {
      // Simuler un téléversement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dans un cas réel, vous téléverseriez le fichier sur un serveur et récupéreriez l'URL
      this.documentUrl = `https://example.com/documents/${this.documentName}`;
      
      this.hideLoading();
      this.showToast('Document téléversé avec succès', 'success');
      
    } catch (err) {
      this.hideLoading();
      console.error('Erreur téléversement document:', err);
      this.showToast('Erreur lors du téléversement du document', 'danger');
    }
  }

  async createRendezVous() {
    if (!this.isPatient) {
      this.showToast('Les médecins ne peuvent pas prendre de rendez-vous. Cette fonctionnalité est réservée aux patients.', 'warning');
      return;
    }
    
    if (!this.selectedDay || !this.selectedHeure) {
      this.showToast('Veuillez sélectionner un jour et un créneau horaire', 'warning');
      return;
    }

    const userEmail = localStorage.getItem('email');
    if (!userEmail) {
      this.showToast('Vous devez être connecté pour réserver', 'warning');
      this.goToLogin();
      return;
    }

    const confirmAlert = await this.alertController.create({
      header: 'Confirmer le rendez-vous',
      message: `Voulez-vous confirmer votre rendez-vous avec ${this.medecin.firstName} ${this.medecin.lastName} le ${new Date(this.selectedDay).toLocaleDateString('fr-FR')} à ${this.selectedHeure} ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: () => this.submitRendezVous(userEmail)
        }
      ]
    });
    
    await confirmAlert.present();
  }
  
  async submitRendezVous(userEmail: string) {
    if (!this.isPatient) {
      this.showToast('Les médecins ne peuvent pas prendre de rendez-vous', 'warning');
      return;
    }
    
    const loading = await this.showLoading('Enregistrement du rendez-vous...');
    
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

    try {
      await this.authService.createRendezVous(rdvData).toPromise();
      
      loading.dismiss();
      
      const successAlert = await this.alertController.create({
        header: 'Rendez-vous demandé',
        message: 'Votre demande de rendez-vous a été envoyée avec succès. Vous serez notifié lorsque le médecin aura répondu.',
        buttons: [
          {
            text: 'OK',
            handler: () => {
              this.selectedDay = null;
              this.selectedHeure = '';
              this.documentName = '';
              this.documentFile = null;
              this.documentUrl = null;
              if (this.fileInput && this.fileInput.nativeElement) {
                this.fileInput.nativeElement.value = '';
              }
              this.loadDisponibilites(this.medecin.email);
            }
          }
        ]
      });
      
      await successAlert.present();
      
    } catch (err: any) {
      loading.dismiss();
      console.error('Erreur création rendez-vous :', err);
      
      this.showToast(err.error?.msg || 'Erreur lors de la création du rendez-vous', 'danger');
      
      if (err.status === 401) {
        this.router.navigate(['/login']);
      }
    }
  }

  getMonthYear(): string {
    const options = { month: 'long' as const, year: 'numeric' as const };
    return this.currentMonth.toLocaleDateString('fr-FR', options);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToAccueil() {
    this.router.navigate(['/tabs/accueil']);
  }

  goToConversation() {
    this.router.navigate(['/conversation'], { 
      queryParams: { 
        otherUser: this.medecin.email
      }
    });
  }
}