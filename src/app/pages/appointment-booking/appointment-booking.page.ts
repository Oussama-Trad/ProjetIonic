import { Component, OnInit } from '@angular/core';
import { Appointment } from '../../models/appointment.model';

import { AppointmentService } from '../../services/appointment.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-appointment-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './appointment-booking.page.html',
  styleUrls: ['./appointment-booking.page.scss']
})
export class AppointmentBookingPage {
  doctors: any[] = [];
  selectedDoctor: string = '';
  selectedDate: Date = new Date();
  availableSlots: Date[] = [];
  loading = false;

  constructor(
    private appointmentService: AppointmentService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.appointmentService.getDoctors().subscribe(
      (doctors) => {
        this.doctors = doctors;
      },
      (error) => {
        console.error('Error fetching doctors:', error);
      }
    );
  }

  async getAvailableSlots() {
    if (!this.selectedDoctor) return;

    this.loading = true;
    try {
      const slots = await this.appointmentService
        .getAvailableSlots(this.selectedDoctor, this.selectedDate)
        .toPromise();
      this.availableSlots = slots || [];
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      this.loading = false;
    }
  }

  async bookAppointment(slot: Date) {
    if (!this.selectedDoctor) {
      await this.showToast('Please select a doctor first');
      return;
    }

    try {
      const appointment: Omit<Appointment, 'id' | 'status'> = {
        doctorId: this.selectedDoctor,
        patientId: 'current-user-id', // TODO: Get from auth service
        date: slot
      };

      const bookedAppointment = await this.appointmentService
        .bookAppointment(appointment)
        .toPromise();

      if (bookedAppointment) {
        // Send confirmation
        await this.appointmentService.sendAppointmentConfirmation(bookedAppointment.id, appointment.patientId).toPromise();

        // Show success message
        await this.showToast('Appointment booked successfully! Confirmation sent.');

        // Navigate to confirmation
        this.router.navigate(['/appointment-confirmation', bookedAppointment.id]);
      } else {
        await this.showToast('Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      await this.showToast('Error booking appointment. Please try again.');
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}
