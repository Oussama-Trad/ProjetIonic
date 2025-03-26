import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TabsComponent } from './components/tabs/tabs.component';
import { LoginPage } from './pages/login/login.page';
import { RegisterPage } from './pages/register/register.page';
import { HomePage } from './pages/home/home.page';
import { AccueilPage } from './pages/accueil/accueil.page';
import { MedecinPage } from './pages/medecin/medecin.page';
import { RendezVousPage } from './pages/rendez-vous/rendez-vous.page';
import { AccueilMedecinPage } from './pages/accueil-medecin/accueil-medecin.page';
import { DocumentsPage } from './pages/documents/documents.page';
import { ConsultationPage } from './pages/consultation/consultation.page';
import { HistoriquePage } from './pages/historique/historique.page';
import { ParametresPage } from './pages/parametres/parametres.page';
import { TousLesMedecinsPage } from './pages/tous-les-medecins/tous-les-medecins.page';
import { HeaderComponent } from './components/header/header.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';


@NgModule({
  declarations: [
    AppComponent,
    TabsComponent,
    LoginPage,
    RegisterPage,
    HomePage,
    AccueilPage,
    MedecinPage,
    RendezVousPage,
    AccueilMedecinPage,
    DocumentsPage,
    ConsultationPage,
    HistoriquePage,
    ParametresPage,
    TousLesMedecinsPage,
    HeaderComponent,

  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    FormsModule, // Pour ngModel
    HttpClientModule,
    CommonModule, // Pour le pipe date et ngClass
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Pour les composants Web Ionic
  bootstrap: [AppComponent],
})
export class AppModule {}