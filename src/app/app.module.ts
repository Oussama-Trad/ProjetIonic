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
import { TabsComponent } from './components/tabs/tabs.component';
import { TabsMedecinComponent } from './components/tabs-medecin/tabs-medecin.component';
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
import { RendezVousMedecinPage } from './pages/rendez-vous-medecin/rendez-vous-medecin.page';
import { TousLesMedecinsPage } from './pages/tous-les-medecins/tous-les-medecins.page';
import { SharedModule } from './shared.module';
import { ConversationComponent } from './pages/conversation/conversation.component';

@NgModule({
  declarations: [
    AppComponent,
    TabsComponent,
    TabsMedecinComponent,
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
    RendezVousMedecinPage,
    TousLesMedecinsPage,
    ConversationComponent
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    FormsModule,
    CommonModule,
    HttpClientModule,
    AppRoutingModule,
    SharedModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireMessagingModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}