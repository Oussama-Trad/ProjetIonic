import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
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

const routes: Routes = [
  {
    path: '',
    component: TabsComponent,
    children: [
      { path: 'accueil', component: AccueilPage },
      { path: 'home', component: HomePage },
      { path: 'medecin', component: MedecinPage },
      { path: 'accueil-medecin', component: AccueilMedecinPage },
      { path: 'parametres', component: ParametresPage },
      { path: '', redirectTo: 'accueil', pathMatch: 'full' } // Redirection par défaut vers accueil
    ]
  },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'rendez-vous', component: RendezVousPage },
  { path: 'documents', component: DocumentsPage },
  { path: 'consultation', component: ConsultationPage },
  { path: 'historique', component: HistoriquePage },
  { path: '**', redirectTo: '' } // Redirection pour les routes inconnues
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}