import cron from 'node-cron';
import moment from 'moment';
import { NotificationHooks } from './notificationHooks';
import { getConnection } from 'typeorm';

/**
 * Notification Scheduler Service
 * Handles automatic notifications based on time triggers
 */

export class NotificationScheduler {
    private static instance: NotificationScheduler;
    private isRunning = false;

    private constructor() {}

    public static getInstance(): NotificationScheduler {
        if (!NotificationScheduler.instance) {
            NotificationScheduler.instance = new NotificationScheduler();
        }
        return NotificationScheduler.instance;
    }

    /**
     * Start all scheduled notification jobs
     */
    public start(): void {
        if (this.isRunning) {
            console.log('Notification scheduler is already running');
            return;
        }

        console.log('🔔 Starting notification scheduler...');

        // Check for tournament reminders every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            this.checkTournamentReminders();
        });

        // Check for session expiry warnings every minute
        cron.schedule('* * * * *', () => {
            this.checkSessionExpiryWarnings();
        });

        // Check for tournament starts every minute
        cron.schedule('* * * * *', () => {
            this.checkTournamentStarts();
        });

        this.isRunning = true;
        console.log('✅ Notification scheduler started successfully');
    }

    /**
     * Stop all scheduled jobs
     */
    public stop(): void {
        if (!this.isRunning) {
            console.log('Notification scheduler is not running');
            return;
        }

        // Note: node-cron doesn't provide a direct way to stop all tasks
        // In a production environment, you might want to keep references to tasks
        this.isRunning = false;
        console.log('🛑 Notification scheduler stopped');
    }

    /**
     * Check for tournaments that need 30-minute reminders
     */
    private async checkTournamentReminders(): Promise<void> {
        try {
            // Skip if no database connection available
            let connection;
            try {
                connection = getConnection();
            } catch (error) {
                console.log('Database connection not available for tournament reminders');
                return;
            }

            const tournamentRepository = connection.getRepository('Tournament');
            const tournamentPlayerRepository = connection.getRepository('TournamentPlayer');

            // Find tournaments starting in 30 minutes
            const reminderTime = moment().add(30, 'minutes');
            const startTime = reminderTime.subtract(2, 'minutes'); // 2-minute window
            const endTime = reminderTime.add(4, 'minutes');

            const tournaments = await tournamentRepository
                .createQueryBuilder('tournament')
                .where('tournament.date = :date', { 
                    date: moment().format('YYYY-MM-DD') 
                })
                .andWhere('tournament.startTime BETWEEN :startTime AND :endTime', {
                    startTime: startTime.format('HH:mm:ss'),
                    endTime: endTime.format('HH:mm:ss')
                })
                .andWhere('tournament.status = :status', { status: 'ACTIVE' })
                .getMany();

            for (const tournament of tournaments) {
                try {
                    // Get participants for this tournament
                    const participants = await tournamentPlayerRepository
                        .createQueryBuilder('tp')
                        .leftJoinAndSelect('tp.customer', 'customer')
                        .where('tp.tournamentId = :tournamentId', { 
                            tournamentId: tournament.id 
                        })
                        .getMany();

                    if (participants.length > 0) {
                        const customerData = participants.map(p => p.customer);
                        await NotificationHooks.onTournamentReminder({
                            tournament,
                            participants: customerData
                        });

                        console.log(`📢 Tournament reminder sent for: ${tournament.name} (${participants.length} participants)`);
                    }
                } catch (error) {
                    console.error(`Failed to send reminder for tournament ${tournament.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error checking tournament reminders:', error);
        }
    }

    /**
     * Check for tournaments that are starting now
     */
    private async checkTournamentStarts(): Promise<void> {
        try {
            // Skip if no database connection available
            let connection;
            try {
                connection = getConnection();
            } catch (error) {
                console.log('Database connection not available for tournament starts');
                return;
            }

            const tournamentRepository = connection.getRepository('Tournament');
            const tournamentPlayerRepository = connection.getRepository('TournamentPlayer');

            // Find tournaments starting now (within 2-minute window)
            const now = moment();
            const startTime = now.clone().subtract(1, 'minute');
            const endTime = now.clone().add(1, 'minute');

            const tournaments = await tournamentRepository
                .createQueryBuilder('tournament')
                .where('tournament.date = :date', { 
                    date: moment().format('YYYY-MM-DD') 
                })
                .andWhere('tournament.startTime BETWEEN :startTime AND :endTime', {
                    startTime: startTime.format('HH:mm:ss'),
                    endTime: endTime.format('HH:mm:ss')
                })
                .andWhere('tournament.status = :status', { status: 'ACTIVE' })
                .getMany();

            for (const tournament of tournaments) {
                try {
                    // Get participants for this tournament
                    const participants = await tournamentPlayerRepository
                        .createQueryBuilder('tp')
                        .leftJoinAndSelect('tp.customer', 'customer')
                        .where('tp.tournamentId = :tournamentId', { 
                            tournamentId: tournament.id 
                        })
                        .getMany();

                    if (participants.length > 0) {
                        const customerData = participants.map(p => p.customer);
                        await NotificationHooks.onTournamentStart({
                            tournament,
                            participants: customerData
                        });

                        console.log(`🏆 Tournament start notification sent for: ${tournament.name} (${participants.length} participants)`);
                    }
                } catch (error) {
                    console.error(`Failed to send start notification for tournament ${tournament.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error checking tournament starts:', error);
        }
    }

    /**
     * Check for table sessions that need expiry warnings (5 minutes before end)
     */
    private async checkSessionExpiryWarnings(): Promise<void> {
        try {
            // Skip if no database connection available
            let connection;
            try {
                connection = getConnection();
            } catch (error) {
                console.log('Database connection not available for session expiry warnings');
                return;
            }

            const tableSessionRepository = connection.getRepository('TableSession');

            // Find active sessions that expire in 5 minutes
            const warningTime = moment().add(5, 'minutes');
            const startTime = warningTime.clone().subtract(30, 'seconds');
            const endTime = warningTime.clone().add(30, 'seconds');

            const sessions = await tableSessionRepository
                .createQueryBuilder('session')
                .leftJoinAndSelect('session.customer', 'customer')
                .leftJoinAndSelect('session.table', 'table')
                .where('session.status = :status', { status: 'ACTIVE' })
                .andWhere('session.startTime BETWEEN :startTime AND :endTime', {
                    startTime: startTime.toDate(),
                    endTime: endTime.toDate()
                })
                .getMany();

            for (const session of sessions) {
                try {
                    const remainingMinutes = moment(session.startTime).diff(moment(), 'minutes');
                    
                    if (remainingMinutes <= 5 && remainingMinutes > 0) {
                        await NotificationHooks.onSessionExpiryWarning({
                            customer: session.customer,
                            table: session.table,
                            remainingMinutes
                        });

                        console.log(`⏰ Session expiry warning sent for table ${session.table.name} (${remainingMinutes} min remaining)`);
                    }
                } catch (error) {
                    console.error(`Failed to send expiry warning for session ${session.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error checking session expiry warnings:', error);
        }
    }

    /**
     * Send a test notification to verify the scheduler is working
     */
    public async sendTestNotification(phoneNumber: string): Promise<boolean> {
        try {
            const message = `🧪 SCHEDULER TEST\n\nThis is a test notification from the LUDO ROYAL CLUB notification scheduler.\n\nTime: ${moment().format('DD MMM YYYY, hh:mm A')}\n\nScheduler is working correctly! ✅`;
            
            // You can use the notification service directly for testing
            const success = await require('./whatsappNotificationService')
                .whatsappNotificationService
                .sendPromotionalMessage(
                    [{ phoneNumber, firstName: 'Test', lastName: 'User' }],
                    message
                );

            return success > 0;
        } catch (error) {
            console.error('Failed to send test notification:', error);
            return false;
        }
    }

    /**
     * Get scheduler status
     */
    public getStatus(): { isRunning: boolean; startTime?: Date } {
        return {
            isRunning: this.isRunning,
            startTime: this.isRunning ? new Date() : undefined
        };
    }
}

// Export singleton instance
export const notificationScheduler = NotificationScheduler.getInstance();