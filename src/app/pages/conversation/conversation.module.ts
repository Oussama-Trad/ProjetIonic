import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ConversationRoutingModule } from './conversation-routing.module';
import { ConversationComponent } from './conversation.component';
import { SharedModule } from '../../shared.module';

@NgModule({
  declarations: [
    ConversationComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConversationRoutingModule,
    SharedModule
  ]
})
export class ConversationPageModule { }
