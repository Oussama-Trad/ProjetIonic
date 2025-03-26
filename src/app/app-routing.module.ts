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

const routes: Routes = [
  { path: '', redirectTo: '/tabs/accueil', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'rendez-vous', component: RendezVousPage },
  { path: 'accueil-medecin', component: AccueilMedecinPage },
  { path: 'documents', component: DocumentsPage },
  { path: 'historique', component: HistoriquePage },
  { path: 'consultation', component: ConsultationPage },
  { path: 'medecin', component: MedecinPage },
  {
    path: 'tabs',
    children: [
      { path: '', redirectTo: 'accueil', pathMatch: 'full' },
      { path: 'accueil', component: AccueilPage },
      { path: 'tous-les-medecins', component: TousLesMedecinsPage },
      { path: 'home', component: HomePage },
      { path: 'parametres', component: ParametresPage },
    ],
  },
  { path: '**', redirectTo: '/tabs/accueil' }, // Redirection pour les routes inconnues
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}