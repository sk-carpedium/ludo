import { Request, Response } from 'express';
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
            availableProviders: ['fcm'],
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