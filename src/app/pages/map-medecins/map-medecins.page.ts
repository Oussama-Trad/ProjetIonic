import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

// Définir les types pour Google Maps
declare global {
  interface Window {
    google: any;
  }
}

@Component({
  selector: 'app-map-medecins',
  templateUrl: './map-medecins.page.html',
  styleUrls: ['./map-medecins.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class MapMedecinsPage implements OnInit, AfterViewInit {
  @ViewChild('map', { static: false }) mapElement!: ElementRef;
  map: any;
  medecins: any[] = [];
  markers: any[] = [];
  infoWindows: any[] = [];
  isLoading: boolean = false;
  mapInitialized: boolean = false;

  constructor(
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.showLoading('Chargement de la carte...');
    this.loadMedecins();
  }

  ngAfterViewInit() {
    // La carte sera initialisée une fois que les médecins seront chargés
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

  loadMedecins() {
    this.authService.getAllMedecins().subscribe({
      next: (response) => {
        this.medecins = response || [];
        console.log('Médecins chargés pour la carte:', this.medecins);
        
        if (this.medecins.length === 0) {
          this.hideLoading();
          this.showToast('Aucun médecin trouvé', 'warning');
        } else {
          this.initMap();
        }
      },
      error: (err) => {
        console.error('Erreur chargement médecins pour la carte:', err);
        this.hideLoading();
        this.showToast('Impossible de charger les médecins', 'danger');
      }
    });
  }

  initMap() {
    if (!this.mapElement || this.mapInitialized) {
      this.hideLoading();
      return;
    }

    // Coordonnées par défaut (Paris, France)
    const defaultLatLng = { lat: 48.8566, lng: 2.3522 };
    
    // Options de la carte
    const mapOptions = {
      center: defaultLatLng,
      zoom: 12,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true
    };
    
    // Créer la carte
    this.map = new window.google.maps.Map(this.mapElement.nativeElement, mapOptions);
    this.mapInitialized = true;
    
    // Ajouter les marqueurs pour chaque médecin
    this.addMarkers();
    
    this.hideLoading();
  }

  addMarkers() {
    // Nettoyer les marqueurs existants
    this.clearMarkers();
    
    // Créer des limites pour centrer la carte sur tous les marqueurs
    const bounds = new window.google.maps.LatLngBounds();
    
    // Ajouter un marqueur pour chaque médecin
    this.medecins.forEach((medecin, index) => {
      // Géocoder l'adresse pour obtenir les coordonnées
      this.geocodeAddress(medecin.adresse, (results: any, status: string) => {
        if (status === 'OK' && results && results.length > 0) {
          const position = results[0].geometry.location;
          
          // Créer un marqueur
          const marker = new window.google.maps.Marker({
            position: position,
            map: this.map,
            title: `Dr. ${medecin.prenom} ${medecin.nom}`,
            animation: window.google.maps.Animation.DROP,
            icon: {
              url: 'assets/icon/doctor-marker.svg',
              scaledSize: new window.google.maps.Size(40, 40)
            }
          });
          
          // Créer une fenêtre d'info
          const infoContent = `
            <div class="info-window">
              <h3>Dr. ${medecin.prenom} ${medecin.nom}</h3>
              <p><strong>Spécialité:</strong> ${medecin.specialite}</p>
              <p><strong>Adresse:</strong> ${medecin.adresse}</p>
              <p><strong>Téléphone:</strong> ${medecin.telephone || 'Non disponible'}</p>
              <button class="info-btn" onclick="window.location.href='/rendez-vous?medecinEmail=${medecin.email}'">
                Prendre rendez-vous
              </button>
            </div>
          `;
          
          const infoWindow = new window.google.maps.InfoWindow({
            content: infoContent
          });
          
          // Ajouter un écouteur d'événements pour ouvrir la fenêtre d'info
          marker.addListener('click', () => {
            // Fermer toutes les fenêtres d'info ouvertes
            this.infoWindows.forEach(window => window.close());
            
            // Ouvrir cette fenêtre d'info
            infoWindow.open(this.map, marker);
          });
          
          // Ajouter le marqueur et la fenêtre d'info aux tableaux
          this.markers.push(marker);
          this.infoWindows.push(infoWindow);
          
          // Étendre les limites pour inclure ce marqueur
          bounds.extend(position);
          
          // Si c'est le dernier médecin, ajuster la carte pour afficher tous les marqueurs
          if (index === this.medecins.length - 1) {
            this.map.fitBounds(bounds);
            
            // Si un seul marqueur, zoomer un peu
            if (this.markers.length === 1) {
              this.map.setZoom(15);
            }
          }
        } else {
          console.error('Erreur de géocodage pour:', medecin.adresse, status);
        }
      });
    });
  }

  geocodeAddress(address: string, callback: (results: any, status: string) => void) {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ 'address': address }, callback);
  }

  clearMarkers() {
    // Supprimer tous les marqueurs de la carte
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
    
    // Fermer toutes les fenêtres d'info
    this.infoWindows.forEach(window => window.close());
    this.infoWindows = [];
  }

  filterBySpeciality(specialite: string | number | undefined) {
    // Convertir en string si c'est un nombre
    const specialiteStr = specialite !== undefined ? String(specialite) : undefined;
    
    if (!specialiteStr) {
      // Si aucune spécialité n'est sélectionnée, afficher tous les médecins
      this.clearMarkers();
      this.addMarkers();
      return;
    }
    
    // Filtrer les médecins par spécialité
    const filteredMedecins = this.medecins.filter(medecin => 
      medecin.specialite.toLowerCase() === specialiteStr.toLowerCase()
    );
    
    // Mettre à jour les marqueurs
    this.clearMarkers();
    
    // Sauvegarder les médecins originaux
    const originalMedecins = [...this.medecins];
    
    // Remplacer temporairement les médecins par les médecins filtrés
    this.medecins = filteredMedecins;
    
    // Ajouter les nouveaux marqueurs
    this.addMarkers();
    
    // Restaurer les médecins originaux
    this.medecins = originalMedecins;
  }
}
