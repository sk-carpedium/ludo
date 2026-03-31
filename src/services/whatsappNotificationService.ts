import { whatsappService, WhatsAppProvider } from '../lib/whatsappService';
import whatsappQueue from '../lib/whatsappQueue';
import moment from 'moment';

export interface NotificationData {
    phoneCode?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    [key: string]: any;
}

export class WhatsAppNotificationService {
    private formatPhoneNumber(phoneCode?: string, phoneNumber?: string): string | null {
        if (!phoneNumber) return null;
        
        const cleanPhoneCode = phoneCode?.replace(/\D/g, '') || '';
        const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
        
        if (!cleanPhoneNumber) return null;
        
        // If phone code is provided, use it
        if (cleanPhoneCode) {
            return `${cleanPhoneCode}${cleanPhoneNumber}`;
        }
        
        // If no phone code and number is 10 digits, assume Pakistan (+92)
        if (cleanPhoneNumber.length === 10) {
            return `92${cleanPhoneNumber}`;
        }
        
        // If number already has country code
        if (cleanPhoneNumber.length > 10) {
            return cleanPhoneNumber;
        }
        
        return null;
    }

    private getCustomerName(customer: NotificationData): string {
        const firstName = customer.firstName || '';
        const lastName = customer.lastName || '';
        return `${firstName} ${lastName}`.trim() || 'Player';
    }

    /**
     * Send welcome message when a new customer registers
     */
    async sendPlayerRegistrationWelcome(customer: NotificationData): Promise<boolean> {
        try {
            const phoneNumber = this.formatPhoneNumber(customer.phoneCode, customer.phoneNumber);
            if (!phoneNumber) {
                console.log('Invalid phone number for customer registration notification');
                return false;
            }

            const customerName = this.getCustomerName(customer);
            const message = `🎮 Welcome to LUDO ROYAL CLUB, ${customerName}!\n\n` +
                          `Your account has been created successfully.\n` +
                          `You can now book tables and join tournaments.\n\n` +
                          `🎯 Ready to play? Let's get started!\n` +
                          `📞 Need help? Contact our support team.`;

            // Queue the message for reliable delivery
            await whatsappQueue.add({
                to: phoneNumber,
                text: message,
                provider: WhatsAppProvider.GUPSHUP
            });

            console.log(`Registration welcome message queued for ${phoneNumber}`);
            return true;
        } catch (error) {
            console.error('Failed to send registration welcome message:', error);
            return false;
        }
    }

    /**
     * Send table booking confirmation
     */
    async sendTableBookingConfirmation(bookingData: {
        customer: NotificationData;
        table: { name: string; uuid: string };
        categoryPrice: { duration: number; unit: string; price: number };
        sessionId?: string;
    }): Promise<boolean> {
        try {
            const phoneNumber = this.formatPhoneNumber(
                bookingData.customer.phoneCode, 
                bookingData.customer.phoneNumber
            );
            if (!phoneNumber) {
                console.log('Invalid phone number for table booking notification');
                return false;
            }

            const customerName = this.getCustomerName(bookingData.customer);
            const { table, categoryPrice } = bookingData;
            
            const message = `🎮 TABLE BOOKING CONFIRMED!\n\n` +
                          `👋 Hi ${customerName},\n` +
                          `📍 Table: ${table.name}\n` +
                          `⏱️ Duration: ${categoryPrice.duration} ${categoryPrice.unit}\n` +
                          `💰 Amount: PKR ${categoryPrice.price}\n\n` +
                          `🎯 Your table is ready for gaming!\n` +
                          `Please proceed to start your session.\n\n` +
                          `📞 Need assistance? Contact our staff.`;

            await whatsappQueue.add({
                to: phoneNumber,
                text: message,
                provider: WhatsAppProvider.GUPSHUP
            });

            console.log(`Table booking confirmation sent to ${phoneNumber} for table ${table.name}`);
            return true;
        } catch (error) {
            console.error('Failed to send table booking confirmation:', error);
            return false;
        }
    }

    /**
     * Send table session started notification
     */
    async sendTableSessionStarted(sessionData: {
        customer: NotificationData;
        table: { name: string };
        duration: number;
        unit: string;
        freeMins?: number;
    }): Promise<boolean> {
        try {
            const phoneNumber = this.formatPhoneNumber(
                sessionData.customer.phoneCode, 
                sessionData.customer.phoneNumber
            );
            if (!phoneNumber) return false;

            const customerName = this.getCustomerName(sessionData.customer);
            const { table, duration, unit, freeMins } = sessionData;
            
            let durationText = `${duration} ${unit}`;
            if (freeMins) {
                durationText += ` + ${freeMins} free minutes`;
            }

            const message = `🎮 GAME SESSION STARTED!\n\n` +
                          `👋 Hi ${customerName},\n` +
                          `📍 Table: ${table.name}\n` +
                          `⏱️ Duration: ${durationText}\n\n` +
                          `🎯 Your gaming session has begun!\n` +
                          `Enjoy your game and play responsibly.\n\n` +
                          `⏰ Session will end automatically when time expires.`;

            await whatsappQueue.add({
                to: phoneNumber,
                text: message,
                provider: WhatsAppProvider.GUPSHUP
            });

            console.log(`Session started notification sent to ${phoneNumber}`);
            return true;
        } catch (error) {
            console.error('Failed to send session started notification:', error);
            return false;
        }
    }

    /**
     * Send tournament registration confirmation
     */
    async sendTournamentRegistration(registrationData: {
        customer: NotificationData;
        tournament: {
            name: string;
            date: string;
            startTime: string;
            entryFee: number;
            prizePool: number;
        };
    }): Promise<boolean> {
        try {
            const phoneNumber = this.formatPhoneNumber(
                registrationData.customer.phoneCode, 
                registrationData.customer.phoneNumber
            );
            if (!phoneNumber) return false;

            const customerName = this.getCustomerName(registrationData.customer);
            const { tournament } = registrationData;
            
            const tournamentDate = moment(tournament.date).format('DD MMM YYYY');
            const tournamentTime = moment(tournament.startTime, 'HH:mm').format('hh:mm A');

            const message = `🏆 TOURNAMENT REGISTRATION CONFIRMED!\n\n` +
                          `👋 Hi ${customerName},\n` +
                          `🎮 Tournament: ${tournament.name}\n` +
                          `📅 Date: ${tournamentDate}\n` +
                          `⏰ Time: ${tournamentTime}\n` +
                          `💰 Entry Fee: PKR ${tournament.entryFee}\n` +
                          `🏆 Prize Pool: PKR ${tournament.prizePool}\n\n` +
                          `🎯 You're registered! Good luck!\n` +
                          `Be present 15 minutes before start time.\n\n` +
                          `📞 Questions? Contact our support team.`;

            await whatsappQueue.add({
                to: phoneNumber,
                text: message,
                provider: WhatsAppProvider.GUPSHUP
            });

            console.log(`Tournament registration confirmation sent to ${phoneNumber}`);
            return true;
        } catch (error) {
            console.error('Failed to send tournament registration confirmation:', error);
            return false;
        }
    }

    /**
     * Send tournament start notification to all participants
     */
    async sendTournamentStartNotification(tournamentData: {
        tournament: {
            name: string;
            date: string;
            startTime: string;
            prizePool: number;
        };
        participants: NotificationData[];
    }): Promise<number> {
        let successCount = 0;
        const { tournament, participants } = tournamentData;
        
        const tournamentDate = moment(tournament.date).format('DD MMM YYYY');
        const tournamentTime = moment(tournament.startTime, 'HH:mm').format('hh:mm A');

        const message = `🏆 TOURNAMENT STARTING NOW!\n\n` +
                      `🎮 ${tournament.name}\n` +
                      `📅 ${tournamentDate} at ${tournamentTime}\n` +
                      `🏆 Prize Pool: PKR ${tournament.prizePool}\n\n` +
                      `🎯 The tournament is about to begin!\n` +
                      `Please report to the tournament area immediately.\n\n` +
                      `🔥 May the best player win!\n` +
                      `Good luck to all participants!`;

        // Send notifications to all participants
        for (const participant of participants) {
            try {
                const phoneNumber = this.formatPhoneNumber(
                    participant.phoneCode, 
                    participant.phoneNumber
                );
                
                if (phoneNumber) {
                    await whatsappQueue.add({
                        to: phoneNumber,
                        text: message,
                        provider: WhatsAppProvider.GUPSHUP
                    });
                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to queue tournament start notification for participant:`, error);
            }
        }

        console.log(`Tournament start notifications queued for ${successCount}/${participants.length} participants`);
        return successCount;
    }

    /**
     * Send tournament reminder (30 minutes before start)
     */
    async sendTournamentReminder(tournamentData: {
        tournament: {
            name: string;
            date: string;
            startTime: string;
        };
        participants: NotificationData[];
    }): Promise<number> {
        let successCount = 0;
        const { tournament, participants } = tournamentData;
        
        const tournamentDate = moment(tournament.date).format('DD MMM YYYY');
        const tournamentTime = moment(tournament.startTime, 'HH:mm').format('hh:mm A');

        const message = `⏰ TOURNAMENT REMINDER\n\n` +
                      `🎮 ${tournament.name}\n` +
                      `📅 ${tournamentDate} at ${tournamentTime}\n\n` +
                      `🚨 Tournament starts in 30 minutes!\n` +
                      `Please arrive at the venue soon.\n\n` +
                      `🎯 Get ready to compete!\n` +
                      `See you at the tournament area.`;

        for (const participant of participants) {
            try {
                const phoneNumber = this.formatPhoneNumber(
                    participant.phoneCode, 
                    participant.phoneNumber
                );
                
                if (phoneNumber) {
                    await whatsappQueue.add({
                        to: phoneNumber,
                        text: message,
                        provider: WhatsAppProvider.GUPSHUP
                    });
                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to queue tournament reminder for participant:`, error);
            }
        }

        console.log(`Tournament reminder notifications queued for ${successCount}/${participants.length} participants`);
        return successCount;
    }

    /**
     * Send session expiry warning (5 minutes before end)
     */
    async sendSessionExpiryWarning(sessionData: {
        customer: NotificationData;
        table: { name: string };
        remainingMinutes: number;
    }): Promise<boolean> {
        try {
            const phoneNumber = this.formatPhoneNumber(
                sessionData.customer.phoneCode, 
                sessionData.customer.phoneNumber
            );
            if (!phoneNumber) return false;

            const customerName = this.getCustomerName(sessionData.customer);
            const { table, remainingMinutes } = sessionData;

            const message = `⏰ SESSION EXPIRY WARNING\n\n` +
                          `👋 Hi ${customerName},\n` +
                          `📍 Table: ${table.name}\n\n` +
                          `🚨 Your session expires in ${remainingMinutes} minutes!\n` +
                          `Please wrap up your game or extend your session.\n\n` +
                          `💰 Want to continue? Ask staff for recharge options.\n` +
                          `Thank you for playing with us!`;

            await whatsappQueue.add({
                to: phoneNumber,
                text: message,
                provider: WhatsAppProvider.GUPSHUP
            });

            console.log(`Session expiry warning sent to ${phoneNumber}`);
            return true;
        } catch (error) {
            console.error('Failed to send session expiry warning:', error);
            return false;
        }
    }

    /**
     * Send session completed notification
     */
    async sendSessionCompleted(sessionData: {
        customer: NotificationData;
        table: { name: string };
        totalDuration: string;
        totalAmount: number;
    }): Promise<boolean> {
        try {
            const phoneNumber = this.formatPhoneNumber(
                sessionData.customer.phoneCode, 
                sessionData.customer.phoneNumber
            );
            if (!phoneNumber) return false;

            const customerName = this.getCustomerName(sessionData.customer);
            const { table, totalDuration, totalAmount } = sessionData;

            const message = `✅ SESSION COMPLETED\n\n` +
                          `👋 Thank you, ${customerName}!\n` +
                          `📍 Table: ${table.name}\n` +
                          `⏱️ Duration: ${totalDuration}\n` +
                          `💰 Total: PKR ${totalAmount}\n\n` +
                          `🎮 Hope you enjoyed your game!\n` +
                          `Come back soon for more gaming fun.\n\n` +
                          `⭐ Rate your experience and share feedback!`;

            await whatsappQueue.add({
                to: phoneNumber,
                text: message,
                provider: WhatsAppProvider.GUPSHUP
            });

            console.log(`Session completed notification sent to ${phoneNumber}`);
            return true;
        } catch (error) {
            console.error('Failed to send session completed notification:', error);
            return false;
        }
    }

    /**
     * Send promotional message
     */
    async sendPromotionalMessage(customers: NotificationData[], message: string): Promise<number> {
        let successCount = 0;

        for (const customer of customers) {
            try {
                const phoneNumber = this.formatPhoneNumber(
                    customer.phoneCode, 
                    customer.phoneNumber
                );
                
                if (phoneNumber) {
                    const customerName = this.getCustomerName(customer);
                    const personalizedMessage = message.replace('{name}', customerName);
                    
                    await whatsappQueue.add({
                        to: phoneNumber,
                        text: personalizedMessage,
                        provider: WhatsAppProvider.GUPSHUP
                    });
                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to queue promotional message for customer:`, error);
            }
        }

        console.log(`Promotional messages queued for ${successCount}/${customers.length} customers`);
        return successCount;
    }
}

// Export singleton instance
export const whatsappNotificationService = new WhatsAppNotificationService();