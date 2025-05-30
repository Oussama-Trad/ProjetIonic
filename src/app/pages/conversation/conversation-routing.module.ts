import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ConversationComponent } from './conversation.component';

const routes: Routes = [
  {
    path: '',
    component: ConversationComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConversationRoutingModule { }
