import { whatsappNotificationService } from './whatsappNotificationService';
import { fcmNotificationService } from './fcmNotificationService';
import { getConnection, getConnectionManager } from 'typeorm';
import { CustomerDevice } from '../database/entity/CustomerDevice';

/**
 * Notification hooks to be called from your models
 * These functions handle the business logic for when to send notifications
 */

export class NotificationHooks {
    /**
     * Hook for customer registration
     * Call this after successfully creating a new customer
     */
    static async onCustomerRegistered(customer: any): Promise<void> {
        try {
            console.log(`Triggering registration notification for customer: ${customer.uuid}`);
            
            await whatsappNotificationService.sendPlayerRegistrationWelcome({
                phoneCode: customer.phoneCode,
                phoneNumber: customer.phoneNumber,
                firstName: customer.firstName,
                lastName: customer.lastName
            });
        } catch (error) {
            console.error('Error in onCustomerRegistered hook:', error);
        }
    }

    /**
     * Hook for table booking
     * Call this after successfully booking a table
     */
    static async onTableBooked(bookingData: {
        customer: any;
        table: any;
        categoryPrice: any;
        session: any;
    }): Promise<void> {
        try {
            console.log(`Triggering table booking notification for customer: ${bookingData.customer.uuid}`);
            
            // Send WhatsApp notification
            await whatsappNotificationService.sendTableBookingConfirmation({
                customer: {
                    phoneCode: bookingData.customer.phoneCode,
                    phoneNumber: bookingData.customer.phoneNumber,
                    firstName: bookingData.customer.firstName,
                    lastName: bookingData.customer.lastName
                },
                table: {
                    name: bookingData.table.name,
                    uuid: bookingData.table.uuid
                },
                categoryPrice: {
                    duration: bookingData.categoryPrice.duration,
                    unit: bookingData.categoryPrice.unit,
                    price: bookingData.categoryPrice.price
                },
                sessionId: bookingData.session.uuid
            });

            // Send FCM push notification
            try {
                // Use the context model to fetch customer devices (including FCM tokens)
                let customerDevices: any[] = [];
                try {
                    const connection = getConnectionManager().has('default') && getConnectionManager().get('default');
                    if (connection && connection.isConnected) {
                        customerDevices = await connection.getRepository(CustomerDevice).find({ where: { customerId: bookingData.customer.id } });
                    } else if (getConnectionManager().has('default')) {
                        const conn = getConnection();
                        customerDevices = await conn.getRepository(CustomerDevice).find({ where: { customerId: bookingData.customer.id } });
                    }
                } catch (innerErr: any) {
                    console.warn('⚠️ NotificationHooks: cannot read customer devices due to connection state:', innerErr?.message || innerErr);
                }

                if (customerDevices && customerDevices.length > 0) {
                    const fcmTokens = customerDevices
                        .map((device: any) => device.fcmToken)
                        .filter((token: any) => token);

                    if (fcmTokens.length > 0) {
                        const title = '🎉 Table Booked!';
                        const body = `Your booking for ${bookingData.table.name} is confirmed!`;
                        const data = {
                            tableUuid: bookingData.table.uuid,
                            sessionId: bookingData.session.uuid,
                            tableName: bookingData.table.name,
                            type: 'TABLE_BOOKED'
                        };

                        await fcmNotificationService.sendToMultipleDevices(
                            fcmTokens,
                            title,
                            body,
                            data
                        );
                    }
                }
            } catch (fcmError) {
                console.warn('Failed to send FCM notification:', fcmError);
                // Don't fail the booking - just log and continue
            }
        } catch (error) {
            console.error('Error in onTableBooked hook:', error);
        }
    }

    /**
     * Hook for table session start
     * Call this when a table session is started
     */
    static async onTableSessionStarted(sessionData: {
        customer: any;
        table: any;
        session: any;
    }): Promise<void> {
        try {
            console.log(`Triggering session started notification for customer: ${sessionData.customer.uuid}`);
            
            await whatsappNotificationService.sendTableSessionStarted({
                customer: {
                    phoneCode: sessionData.customer.phoneCode,
                    phoneNumber: sessionData.customer.phoneNumber,
                    firstName: sessionData.customer.firstName,
                    lastName: sessionData.customer.lastName
                },
                table: {
                    name: sessionData.table.name
                },
                duration: sessionData.session.duration,
                unit: sessionData.session.unit,
                freeMins: sessionData.session.freeMins
            });
        } catch (error) {
            console.error('Error in onTableSessionStarted hook:', error);
        }
    }

    /**
     * Hook for tournament registration
     * Call this when a player registers for a tournament
     */
    static async onTournamentRegistration(registrationData: {
        customer: any;
        tournament: any;
    }): Promise<void> {
        try {
            console.log(`Triggering tournament registration notification for customer: ${registrationData.customer.uuid}`);
            
            await whatsappNotificationService.sendTournamentRegistration({
                customer: {
                    phoneCode: registrationData.customer.phoneCode,
                    phoneNumber: registrationData.customer.phoneNumber,
                    firstName: registrationData.customer.firstName,
                    lastName: registrationData.customer.lastName
                },
                tournament: {
                    name: registrationData.tournament.name,
                    date: registrationData.tournament.date,
                    startTime: registrationData.tournament.startTime,
                    entryFee: registrationData.tournament.entryFee,
                    prizePool: registrationData.tournament.prizePool
                }
            });
        } catch (error) {
            console.error('Error in onTournamentRegistration hook:', error);
        }
    }

    /**
     * Hook for tournament start
     * Call this when a tournament is about to start
     */
    static async onTournamentStart(tournamentData: {
        tournament: any;
        participants: any[];
    }): Promise<void> {
        try {
            console.log(`Triggering tournament start notifications for tournament: ${tournamentData.tournament.uuid}`);
            
            const participantData = tournamentData.participants.map(participant => ({
                phoneCode: participant.phoneCode,
                phoneNumber: participant.phoneNumber,
                firstName: participant.firstName,
                lastName: participant.lastName
            }));

            await whatsappNotificationService.sendTournamentStartNotification({
                tournament: {
                    name: tournamentData.tournament.name,
                    date: tournamentData.tournament.date,
                    startTime: tournamentData.tournament.startTime,
                    prizePool: tournamentData.tournament.prizePool
                },
                participants: participantData
            });
        } catch (error) {
            console.error('Error in onTournamentStart hook:', error);
        }
    }

    /**
     * Hook for tournament reminder
     * Call this 30 minutes before tournament start
     */
    static async onTournamentReminder(tournamentData: {
        tournament: any;
        participants: any[];
    }): Promise<void> {
        try {
            console.log(`Triggering tournament reminder notifications for tournament: ${tournamentData.tournament.uuid}`);
            
            const participantData = tournamentData.participants.map(participant => ({
                phoneCode: participant.phoneCode,
                phoneNumber: participant.phoneNumber,
                firstName: participant.firstName,
                lastName: participant.lastName
            }));

            await whatsappNotificationService.sendTournamentReminder({
                tournament: {
                    name: tournamentData.tournament.name,
                    date: tournamentData.tournament.date,
                    startTime: tournamentData.tournament.startTime
                },
                participants: participantData
            });
        } catch (error) {
            console.error('Error in onTournamentReminder hook:', error);
        }
    }

    /**
     * Hook for session expiry warning
     * Call this 5 minutes before session expires
     */
    static async onSessionExpiryWarning(sessionData: {
        customer: any;
        table: any;
        remainingMinutes: number;
    }): Promise<void> {
        try {
            console.log(`Triggering session expiry warning for customer: ${sessionData.customer.uuid}`);
            
            await whatsappNotificationService.sendSessionExpiryWarning({
                customer: {
                    phoneCode: sessionData.customer.phoneCode,
                    phoneNumber: sessionData.customer.phoneNumber,
                    firstName: sessionData.customer.firstName,
                    lastName: sessionData.customer.lastName
                },
                table: {
                    name: sessionData.table.name
                },
                remainingMinutes: sessionData.remainingMinutes
            });
        } catch (error) {
            console.error('Error in onSessionExpiryWarning hook:', error);
        }
    }

    /**
     * Hook for session completion
     * Call this when a session is completed
     */
    static async onSessionCompleted(sessionData: {
        customer: any;
        table: any;
        totalDuration: string;
        totalAmount: number;
    }): Promise<void> {
        try {
            console.log(`Triggering session completed notification for customer: ${sessionData.customer.uuid}`);
            
            await whatsappNotificationService.sendSessionCompleted({
                customer: {
                    phoneCode: sessionData.customer.phoneCode,
                    phoneNumber: sessionData.customer.phoneNumber,
                    firstName: sessionData.customer.firstName,
                    lastName: sessionData.customer.lastName
                },
                table: {
                    name: sessionData.table.name
                },
                totalDuration: sessionData.totalDuration,
                totalAmount: sessionData.totalAmount
            });
        } catch (error) {
            console.error('Error in onSessionCompleted hook:', error);
        }
    }
}