import { Router } from 'express';
import {
    sendTournamentStartNotification,
    sendTournamentReminder,
    sendPromotionalMessage,
    sendSessionExpiryWarning,
    testNotification,
    testFCMNotification,
    getNotificationStats
} from '../endpoints/notifications';

const router = Router();

// Tournament notifications
router.post('/tournament/start', sendTournamentStartNotification);
router.post('/tournament/reminder', sendTournamentReminder);

// Session notifications
router.post('/session/expiry-warning', sendSessionExpiryWarning);

// Promotional messages
router.post('/promotional', sendPromotionalMessage);

// Testing and utilities
router.post('/test', testNotification);
router.post('/test-fcm', testFCMNotification);
router.get('/stats', getNotificationStats);

export default router;