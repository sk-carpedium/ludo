import { Router } from 'express';
import {
    sendTournamentStartNotification,
    sendTournamentReminder,
    testFCMNotification,
    getNotificationStats
} from '../endpoints/notifications';

const router = Router();

// Tournament notifications
router.post('/tournament/start', sendTournamentStartNotification);
router.post('/tournament/reminder', sendTournamentReminder);

// Testing and utilities
router.post('/test-fcm', testFCMNotification);
router.get('/stats', getNotificationStats);

export default router;