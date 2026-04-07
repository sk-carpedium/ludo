import { fcmNotificationService } from './fcmNotificationService';
import connection from '../database/connection';
import { CustomerDevice } from '../database/entity/CustomerDevice';

/**
 * Notification hooks to be called from your models
 * These functions handle the business logic for when to send notifications
 */

export class NotificationHooks {
    /**
     * Helper to dynamically fetch FCM tokens for a customer and send notifications
     */
    private static async sendFCMToCustomer(customerId: number, title: string, body: string, data: Record<string, string>, customerUuid?: string): Promise<void> {
        try {
            let customerDevices: any[] = [];
            try {
                customerDevices = await connection.getRepository(CustomerDevice).find({ where: { customerId: customerId } });
            } catch (innerErr: any) {
                console.warn('⚠️ NotificationHooks: cannot read customer devices due to connection state:', innerErr?.message || innerErr);
                return;
            }

            if (customerDevices && customerDevices.length > 0) {
                const fcmTokens = Array.from(new Set(customerDevices
                    .map((device: any) => device.fcmToken)
                    .filter((token: any) => token)));
                
                if (fcmTokens.length > 0) {
                    await fcmNotificationService.sendToMultipleDevices(
                        fcmTokens,
                        title,
                        body,
                        data,
                        customerUuid ? { customerId: customerUuid } : undefined
                    );
                }
            }
        } catch (fcmError) {
            console.warn('Failed to send FCM notification:', fcmError);
        }
    }

    /**
     * Hook for customer registration
     * Call this after successfully creating a new customer
     */
    static async onCustomerRegistered(customer: any): Promise<void> {
        try {
            console.log(`Triggering registration notification for customer: ${customer.uuid}`);
            const title = '🎉 Welcome to Ludo Royal Club!';
            const body = `Hi ${customer.firstName}, thanks for registering. Let's play!`;
            await this.sendFCMToCustomer(customer.id, title, body, { type: 'CUSTOMER_REGISTERED' }, customer.uuid);
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
            const title = '🎉 Table Booked!';
            const categoryName = bookingData.table.category?.name ? `(${bookingData.table.category.name})` : '';
            const body = `Your booking for ${bookingData.table.name} ${categoryName} is confirmed!`;
            const data = {
                tableUuid: bookingData.table.uuid,
                sessionId: bookingData.session.uuid,
                tableName: bookingData.table.name,
                type: 'TABLE_BOOKED',
                link: `/receipt/${bookingData.session.uuid}`
            };
            await this.sendFCMToCustomer(bookingData.customer.id, title, body, data, bookingData.customer.uuid);
        } catch (error) {
            console.error('Error in onTableBooked hook:', error);
        }
    }

    /**
     * Hook for table session start
     */
    static async onTableSessionStarted(sessionData: {
        customer: any;
        table: any;
        session: any;
    }): Promise<void> {
        try {
            // console.log(`Triggering session started notification for customer: ${sessionData.customer.uuid}`);
            // const title = '⏳ Session Started';
            // const body = `Your session at ${sessionData.table.name} has started. Have fun!`;
            // const data = { tableUuid: sessionData.table.uuid, type: 'SESSION_STARTED' };
            // await this.sendFCMToCustomer(sessionData.customer.id, title, body, data, sessionData.customer.uuid);
        } catch (error) {
            console.error('Error in onTableSessionStarted hook:', error);
        }
    }

    /**
     * Hook for tournament registration
     */
    static async onTournamentRegistration(registrationData: {
        customer: any;
        tournament: any;
    }): Promise<void> {
        try {
            console.log(`Triggering tournament registration notification for customer: ${registrationData.customer.uuid}`);
            const title = '🏆 Tournament Registration Confirmed!';
            const body = `You are registered for ${registrationData.tournament.name}. Good luck!`;
            const data = { 
                tournamentUuid: registrationData.tournament.uuid, 
                type: 'TOURNAMENT_REGISTERED',
                link: `/receipt/tournament/${registrationData.tournament.uuid}/${registrationData.customer.uuid}`
            };
            await this.sendFCMToCustomer(registrationData.customer.id, title, body, data, registrationData.customer.uuid);
        } catch (error) {
            console.error('Error in onTournamentRegistration hook:', error);
        }
    }

    /**
     * Hook for tournament start
     */
    static async onTournamentStart(tournamentData: {
        tournament: any;
        participants: any[];
    }): Promise<void> {
        try {
            console.log(`Triggering tournament start notifications for tournament: ${tournamentData.tournament.uuid}`);
            const title = '🔥 Tournament Starting!';
            const body = `${tournamentData.tournament.name} is starting now! Hurry up!`;
            const data = { tournamentUuid: tournamentData.tournament.uuid, type: 'TOURNAMENT_START' };
            
            for (const participant of tournamentData.participants) {
                if (participant.customer && participant.customer.id) {
                    await this.sendFCMToCustomer(participant.customer.id, title, body, data, participant.customer.uuid);
                }
            }
        } catch (error) {
            console.error('Error in onTournamentStart hook:', error);
        }
    }

    /**
     * Hook for tournament reminder
     */
    static async onTournamentReminder(tournamentData: {
        tournament: any;
        participants: any[];
    }): Promise<void> {
        try {
            console.log(`Triggering tournament reminder notifications for tournament: ${tournamentData.tournament.uuid}`);
            const title = '⏰ Tournament Reminder';
            const body = `${tournamentData.tournament.name} will begin soon. Assemble at your tables!`;
            const data = { tournamentUuid: tournamentData.tournament.uuid, type: 'TOURNAMENT_REMINDER' };
            
            for (const participant of tournamentData.participants) {
                if (participant.customer && participant.customer.id) {
                    await this.sendFCMToCustomer(participant.customer.id, title, body, data, participant.customer.uuid);
                }
            }
        } catch (error) {
            console.error('Error in onTournamentReminder hook:', error);
        }
    }

    /**
     * Hook for session expiry warning
     */
    static async onSessionExpiryWarning(sessionData: {
        customer: any;
        table: any;
        remainingMinutes: number;
    }): Promise<void> {
        try {
            console.log(`Triggering session expiry warning for customer: ${sessionData.customer.uuid}`);
            const title = '⚠️ Session Ending Soon';
            const body = `Your session at ${sessionData.table.name} ends in ${sessionData.remainingMinutes} minutes!`;
            const data = { tableUuid: sessionData.table.uuid, remainingMinutes: sessionData.remainingMinutes.toString(), type: 'SESSION_EXPIRY_WARNING' };
            await this.sendFCMToCustomer(sessionData.customer.id, title, body, data, sessionData.customer.uuid);
        } catch (error) {
            console.error('Error in onSessionExpiryWarning hook:', error);
        }
    }

    /**
     * Hook for session completion
     */
    static async onSessionCompleted(sessionData: {
        customer: any;
        table: any;
        totalDuration: string;
        totalAmount: number;
    }): Promise<void> {
        try {
            console.log(`Triggering session completed notification for customer: ${sessionData.customer.uuid}`);
            const title = '🏁 Session Completed';
            const body = `Session at ${sessionData.table.name} finished. Total Cost: ${sessionData.totalAmount}`;
            const data = { tableUuid: sessionData.table.uuid, type: 'SESSION_COMPLETED' };
            await this.sendFCMToCustomer(sessionData.customer.id, title, body, data, sessionData.customer.uuid);
        } catch (error) {
            console.error('Error in onSessionCompleted hook:', error);
        }
    }
}