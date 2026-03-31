import { Request, Response } from 'express';
import { whatsappNotificationService } from '../services/whatsappNotificationService';
import { NotificationHooks } from '../services/notificationHooks';

// Extend Request interface to include context
interface RequestWithContext extends Request {
    context?: any;
}

/**
 * Manual notification endpoints for testing and admin use
 */

export const sendTournamentStartNotification = async (req: RequestWithContext, res: Response) => {
    try {
        const { tournamentUuid } = req.body;
        
        if (!tournamentUuid) {
            return res.status(400).json({ message: 'Tournament UUID is required' });
        }

        // For now, return a placeholder response
        // You'll need to implement the actual tournament and participant fetching
        // based on your existing context/repository pattern
        
        return res.json({
            message: 'Tournament start notification endpoint ready',
            note: 'Please implement tournament and participant fetching based on your context pattern',
            tournamentUuid
        });
    } catch (error: any) {
        console.error('Failed to send tournament start notifications:', error);
        return res.status(500).json({ 
            message: 'Failed to send notifications',
            error: error.message 
        });
    }
};

export const sendTournamentReminder = async (req: RequestWithContext, res: Response) => {
    try {
        const { tournamentUuid } = req.body;
        
        if (!tournamentUuid) {
            return res.status(400).json({ message: 'Tournament UUID is required' });
        }

        return res.json({
            message: 'Tournament reminder endpoint ready',
            note: 'Please implement tournament and participant fetching based on your context pattern',
            tournamentUuid
        });
    } catch (error: any) {
        console.error('Failed to send tournament reminders:', error);
        return res.status(500).json({ 
            message: 'Failed to send reminders',
            error: error.message 
        });
    }
};

export const sendPromotionalMessage = async (req: RequestWithContext, res: Response) => {
    try {
        const { message, phoneNumbers } = req.body;
        
        if (!message) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
            return res.status(400).json({ message: 'Phone numbers array is required' });
        }

        // Convert phone numbers to customer format
        const customers = phoneNumbers.map((phone: string, index: number) => ({
            phoneNumber: phone,
            firstName: 'Customer',
            lastName: `${index + 1}`
        }));

        const successCount = await whatsappNotificationService.sendPromotionalMessage(
            customers,
            message
        );

        return res.json({
            message: 'Promotional messages sent',
            customersNotified: successCount,
            totalCustomers: customers.length
        });
    } catch (error: any) {
        console.error('Failed to send promotional messages:', error);
        return res.status(500).json({ 
            message: 'Failed to send promotional messages',
            error: error.message 
        });
    }
};

export const sendSessionExpiryWarning = async (req: RequestWithContext, res: Response) => {
    try {
        const { phoneNumber, customerName, tableName, remainingMinutes } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        await whatsappNotificationService.sendSessionExpiryWarning({
            customer: {
                phoneNumber,
                firstName: customerName || 'Customer',
                lastName: ''
            },
            table: {
                name: tableName || 'Table'
            },
            remainingMinutes: remainingMinutes || 5
        });

        return res.json({
            message: 'Session expiry warning sent',
            phoneNumber,
            remainingMinutes: remainingMinutes || 5
        });
    } catch (error: any) {
        console.error('Failed to send session expiry warning:', error);
        return res.status(500).json({ 
            message: 'Failed to send warning',
            error: error.message 
        });
    }
};

export const testNotification = async (req: RequestWithContext, res: Response) => {
    try {
        const { phoneNumber, message, type = 'test' } = req.body;
        
        if (!phoneNumber || !message) {
            return res.status(400).json({ 
                message: 'Phone number and message are required' 
            });
        }

        // Format phone number
        const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
        
        const testMessage = `🧪 TEST NOTIFICATION\n\n${message}\n\n📱 This is a test message from LUDO ROYAL CLUB notification system.`;

        const success = await whatsappNotificationService.sendPromotionalMessage(
            [{ phoneNumber: cleanPhoneNumber, firstName: 'Test', lastName: 'User' }],
            testMessage
        );

        return res.json({
            message: 'Test notification sent',
            phoneNumber: cleanPhoneNumber,
            success: success > 0
        });
    } catch (error: any) {
        console.error('Failed to send test notification:', error);
        return res.status(500).json({ 
            message: 'Failed to send test notification',
            error: error.message 
        });
    }
};

export const testFCMNotification = async (req: RequestWithContext, res: Response) => {
    try {
        const { fcmToken, title = 'Test FCM Notification', body = 'This is a test FCM notification' } = req.body;
        
        if (!fcmToken) {
            return res.status(400).json({ 
                message: 'FCM token is required' 
            });
        }

        const { fcmNotificationService } = await import('../services/fcmNotificationService');

        console.log(`🧪 Testing FCM notification to token: ${fcmToken.substring(0, 20)}...`);

        const result = await fcmNotificationService.sendToDevice(
            fcmToken,
            title,
            body,
            { test: 'true', timestamp: new Date().toISOString() }
        );

        return res.json({
            message: 'Test FCM notification sent',
            fcmToken: fcmToken.substring(0, 20) + '...',
            success: result.success,
            error: result.error
        });
    } catch (error: any) {
        console.error('Failed to send test FCM notification:', error);
        return res.status(500).json({ 
            message: 'Failed to send test FCM notification',
            error: error.message 
        });
    }
};

export const getNotificationStats = async (req: RequestWithContext, res: Response) => {
    try {
        // This would typically come from a database or cache
        // For now, return mock stats
        const stats = {
            totalNotificationsSent: 0, // You can implement actual tracking
            notificationsToday: 0,
            notificationsThisWeek: 0,
            notificationTypes: {
                registration: 0,
                tableBooking: 0,
                sessionStart: 0,
                tournamentStart: 0,
                tournamentReminder: 0,
                sessionExpiry: 0,
                promotional: 0
            },
            lastNotificationSent: null,
            availableProviders: ['gupshup', 'facebook'],
            schedulerStatus: 'running'
        };

        return res.json(stats);
    } catch (error: any) {
        console.error('Failed to get notification stats:', error);
        return res.status(500).json({ 
            message: 'Failed to get notification stats',
            error: error.message 
        });
    }
};