import { Router } from 'express';
import {
    sendGupshupText,
    sendGupshupTemplate,
    sendGupshupMedia,
    sendGupshupInteractive,
    optInUser,
    optOutUser,
    getMessageStatus,
    getProviderInfo,
    gupshupWebhook
} from '../endpoints/gupshup';

const router = Router();

// Gupshup-specific endpoints
router.post('/send-text', sendGupshupText);
router.post('/send-template', sendGupshupTemplate);
router.post('/send-media', sendGupshupMedia);
router.post('/send-interactive', sendGupshupInteractive);
router.post('/opt-in', optInUser);
router.post('/opt-out', optOutUser);
router.get('/message-status/:messageId', getMessageStatus);
router.get('/provider-info', getProviderInfo);

// Webhook endpoint
router.post('/webhook', gupshupWebhook);

export default router;