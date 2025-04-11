import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireMessagingModule } from '@angular/fire/compat/messaging';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { TabsComponent } from './components/tabs/tabs.component';
import { AccueilPage } from './pages/accueil/accueil.page';
import { AccueilMedecinPage } from './pages/accueil-medecin/accueil-medecin.page';
import { ConsultationPage } from './pages/consultation/consultation.page';
import { DocumentsPage } from './pages/documents/documents.page';
import { HistoriquePage } from './pages/historique/historique.page';
import { HomePage } from './pages/home/home.page';
import { LoginPage } from './pages/login/login.page';
import { MedecinPage } from './pages/medecin/medecin.page';
import { NotificationsComponent } from './pages/notifications/notifications.page';
import { ParametresPage } from './pages/parametres/parametres.page';
import { RegisterPage } from './pages/register/register.page';
import { RendezVousPage } from './pages/rendez-vous/rendez-vous.page';
import { TousLesMedecinsPage } from './pages/tous-les-medecins/tous-les-medecins.page';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    TabsComponent,
    AccueilPage,
    AccueilMedecinPage,
    ConsultationPage,
    DocumentsPage,
    HistoriquePage,
    HomePage,
    LoginPage,
    MedecinPage,
    NotificationsComponent,
    ParametresPage,
    RegisterPage,
    RendezVousPage,
    TousLesMedecinsPage,
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    FormsModule, // Pour ngModel et autres directives de formulaires
    CommonModule, // Pour ngClass, ngFor, date pipe, etc.
    HttpClientModule, // Pour les requêtes HTTP
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase), // Initialisation Firebase
    AngularFireMessagingModule, // Module pour FCM
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}