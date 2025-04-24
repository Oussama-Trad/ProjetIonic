import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { LoginPage } from './pages/login/login.page';
import { RegisterPage } from './pages/register/register.page';
import { AccueilPage } from './pages/accueil/accueil.page';
import { MedecinPage } from './pages/medecin/medecin.page';
import { RendezVousPage } from './pages/rendez-vous/rendez-vous.page';
import { AccueilMedecinPage } from './pages/accueil-medecin/accueil-medecin.page';
import { DocumentsPage } from './pages/documents/documents.page';
import { ConsultationPage } from './pages/consultation/consultation.page';
import { HistoriquePage } from './pages/historique/historique.page';
import { ParametresPage } from './pages/parametres/parametres.page';
import { TousLesMedecinsPage } from './pages/tous-les-medecins/tous-les-medecins.page';
import { ConversationComponent } from './pages/conversation/conversation.component';
import { DisponibilitesMedecinPage } from './pages/disponibilites-medecin/disponibilites-medecin.page';
import { MapMedecinsPage } from './pages/map-medecins/map-medecins.page';

const routes: Routes = [
  { path: '', redirectTo: '/tabs/accueil', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  {
    path: 'rendez-vous',
    component: RendezVousPage
  },
  { path: 'accueil-medecin', component: AccueilMedecinPage },
  { path: 'documents', component: DocumentsPage },
  { path: 'historique', component: HistoriquePage },
  { path: 'consultation', component: ConsultationPage },
  { path: 'medecin', component: MedecinPage },
  { path: 'disponibilites-medecin', component: DisponibilitesMedecinPage },
  { path: 'map-medecins', component: MapMedecinsPage },
  {
    path: 'tabs',
    children: [
      { path: '', redirectTo: 'accueil', pathMatch: 'full' },
      { path: 'accueil', component: AccueilPage },
      { path: 'tous-les-medecins', component: TousLesMedecinsPage },
      { 
        path: 'messages-list',
        loadChildren: () => import('./pages/messages-list/messages-list.module').then(m => m.MessagesListPageModule)
      },
      { path: 'home', component: HomePage },
      { path: 'parametres', component: ParametresPage },
    ],
  },
  {
    path: 'conversation',
    component: ConversationComponent
  },
  {
    path: 'messages/:id',
    loadChildren: () => import('./pages/message-detail/message-detail.module').then(m => m.MessageDetailPageModule)
  },
  {
    path: 'new-message',
    loadChildren: () => import('./pages/new-message/new-message.module').then(m => m.NewMessagePageModule)
  },
  { path: '**', redirectTo: '/tabs/accueil' }, // Redirection pour les routes inconnues
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}