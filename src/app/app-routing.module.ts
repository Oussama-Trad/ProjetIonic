import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { LoginPage } from './pages/login/login.page';
import { RegisterPage } from './pages/register/register.page';
import { AccueilPage } from './pages/accueil/accueil.page';
import { MedecinPage } from './pages/medecin/medecin.page';
import { RendezVousPage } from './pages/rendez-vous/rendez-vous.page';
import { AccueilMedecinPage } from './pages/accueil-medecin/accueil-medecin.page';
import { ConsultationPage } from './pages/consultation/consultation.page';
import { HistoriquePage } from './pages/historique/historique.page';
import { TousLesMedecinsPage } from './pages/tous-les-medecins/tous-les-medecins.page';
import { ConversationComponent } from './pages/conversation/conversation.component';
import { DisponibilitesMedecinPage } from './pages/disponibilites-medecin/disponibilites-medecin.page';

// Import des gardes d'authentification
import { AuthGuard } from './guards/auth.guard';
import { PatientGuard } from './guards/patient.guard';
import { MedecinGuard } from './guards/medecin.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  {
    path: 'rendez-vous',
    component: RendezVousPage,
    canActivate: [PatientGuard]
  },
  { 
    path: 'historique', 
    component: HistoriquePage,
    canActivate: [AuthGuard]
  },
  { 
    path: 'consultation', 
    component: ConsultationPage,
    canActivate: [MedecinGuard]
  },
  { 
    path: 'medecin', 
    component: MedecinPage,
    canActivate: [PatientGuard]
  },
  {
    path: 'conversation',
    component: ConversationComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'messages/:id',
    loadChildren: () => import('./pages/message-detail/message-detail.module').then(m => m.MessageDetailPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'new-message',
    loadChildren: () => import('./pages/new-message/new-message.module').then(m => m.NewMessagePageModule),
    canActivate: [AuthGuard]
  },
  // Routes pour les patients (avec tabs)
  {
    path: 'tabs',
    canActivate: [PatientGuard],
    children: [
      { path: '', redirectTo: 'accueil', pathMatch: 'full' },
      { path: 'accueil', component: AccueilPage },
      { path: 'tous-les-medecins', component: TousLesMedecinsPage },
      { path: 'home', component: HomePage },
      { 
        path: 'messages-list',
        loadChildren: () => import('./pages/messages-list/messages-list.module').then(m => m.MessagesListPageModule)
      }
    ],
  },
  // Routes pour les médecins (avec tabs-medecin)
  {
    path: 'tabs-medecin',
    canActivate: [MedecinGuard],
    children: [
      { path: '', redirectTo: 'accueil-medecin', pathMatch: 'full' },
      { path: 'accueil-medecin', component: AccueilMedecinPage },
      { path: 'disponibilites-medecin', component: DisponibilitesMedecinPage },
      { 
        path: 'messages-list',
        loadChildren: () => import('./pages/messages-list/messages-list.module').then(m => m.MessagesListPageModule)
      },
      { 
        path: 'stats-medecin',
        loadChildren: () => import('./pages/stats-medecin/stats-medecin.module').then(m => m.StatsMedecinPageModule)
      },
      {
        path: 'profil-medecin',
        loadChildren: () => import('./pages/profil-medecin/profil-medecin.module').then(m => m.ProfilMedecinPageModule)
      }
    ],
  },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
