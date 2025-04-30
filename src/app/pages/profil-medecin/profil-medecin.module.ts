import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProfilMedecinPageRoutingModule } from './profil-medecin-routing.module';

import { ProfilMedecinPage } from './profil-medecin.page';
import { SharedModule } from '../../shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProfilMedecinPageRoutingModule,
    SharedModule
  ],
  declarations: [ProfilMedecinPage]
})
export class ProfilMedecinPageModule {}
