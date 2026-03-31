import { Request, Response } from 'express';
import { whatsappService, WhatsAppProvider } from '../lib/whatsappService';
import whatsappQueue from '../lib/whatsappQueue';

export const sendGupshupText = async (req: Request, res: Response) => {
    try {
        const { to, text } = req.body;
        if (!to || !text) {
            return res.status(400).json({ message: 'Missing to or text' });
        }

        const result = await whatsappService.sendTextMessage(to, text, WhatsAppProvider.GUPSHUP);
        return res.json(result);
    } catch (error: any) {
        console.error('Gupshup sendText error:', error?.message || error);
        return res.status(500).json({ 
            message: error?.message || 'Failed to send text message via Gupshup' 
        });
    }
};

export const sendGupshupTemplate = async (req: Request, res: Response) => {
    try {
        const { to, templateId, params } = req.body;
        if (!to || !templateId) {
            return res.status(400).json({ message: 'Missing to or templateId' });
        }

        const result = await whatsappService.sendTemplateMessage(
            to, 
            templateId, 
            params, 
            undefined, 
            WhatsAppProvider.GUPSHUP
        );
        return res.json(result);
    } catch (error: any) {
        console.error('Gupshup sendTemplate error:', error?.message || error);
        return res.status(500).json({ 
            message: error?.message || 'Failed to send template message via Gupshup' 
        });
    }
};

export const sendGupshupMedia = async (req: Request, res: Response) => {
    try {
        const { to, mediaUrl, mediaType, caption, filename } = req.body;
        if (!to || !mediaUrl || !mediaType) {
            return res.status(400).json({ message: 'Missing to, mediaUrl, or mediaType' });
        }

        if (!['image', 'document', 'audio', 'video'].includes(mediaType)) {
            return res.status(400).json({ message: 'Invalid mediaType. Must be image, document, audio, or video' });
        }

        const result = await whatsappService.sendMediaMessage(
            to, 
            mediaUrl, 
            mediaType, 
            caption, 
            filename,
            WhatsAppProvider.GUPSHUP
        );
        return res.json(result);
    } catch (error: any) {
        console.error('Gupshup sendMedia error:', error?.message || error);
        return res.status(500).json({ 
            message: error?.message || 'Failed to send media message via Gupshup' 
        });
    }
};

export const sendGupshupInteractive = async (req: Request, res: Response) => {
    try {
        const { to, interactiveMessage } = req.body;
        if (!to || !interactiveMessage) {
            return res.status(400).json({ message: 'Missing to or interactiveMessage' });
        }

        const result = await whatsappService.sendInteractiveMessage(
            to, 
            interactiveMessage,
            WhatsAppProvider.GUPSHUP
        );
        return res.json(result);
    } catch (error: any) {
        console.error('Gupshup sendInteractive error:', error?.message || error);
        return res.status(500).json({ 
            message: error?.message || 'Failed to send interactive message via Gupshup' 
        });
    }
};

export const optInUser = async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ message: 'Missing phoneNumber' });
        }

        const result = await whatsappService.optInUser(phoneNumber);
        return res.json(result);
    } catch (error: any) {
        console.error('Gupshup optIn error:', error?.message || error);
        return res.status(500).json({ 
            message: error?.message || 'Failed to opt in user' 
        });
    }
};

export const optOutUser = async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ message: 'Missing phoneNumber' });
        }

        const result = await whatsappService.optOutUser(phoneNumber);
        return res.json(result);
    } catch (error: any) {
        console.error('Gupshup optOut error:', error?.message || error);
        return res.status(500).json({ 
            message: error?.message || 'Failed to opt out user' 
        });
    }
};

export const getMessageStatus = async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;
        if (!messageId) {
            return res.status(400).json({ message: 'Missing messageId' });
        }

        const result = await whatsappService.getMessageStatus(messageId);
        return res.json(result);
    } catch (error: any) {
        console.error('Gupshup getMessageStatus error:', error?.message || error);
        return res.status(500).json({ 
            message: error?.message || 'Failed to get message status' 
        });
    }
};

export const getProviderInfo = async (req: Request, res: Response) => {
    try {
        const availableProviders = whatsappService.getAvailableProviders();
        const currentProvider = whatsappService.getCurrentProvider();
        
        return res.json({
            availableProviders,
            currentProvider,
            providerDetails: {
                gupshup: {
                    available: availableProviders.includes(WhatsAppProvider.GUPSHUP),
                    features: ['text', 'template', 'media', 'interactive', 'opt-in/out', 'status-tracking']
                },
                facebook: {
                    available: availableProviders.includes(WhatsAppProvider.FACEBOOK),
                    features: ['text', 'template']
                }
            }
        });
    } catch (error: any) {
        console.error('Get provider info error:', error?.message || error);
        return res.status(500).json({ 
            message: error?.message || 'Failed to get provider information' 
        });
    }
};

// Gupshup webhook handler
export const gupshupWebhook = async (req: Request, res: Response) => {
    try {
        console.log('Gupshup webhook received:', JSON.stringify(req.body, null, 2));
        
        const { type, payload } = req.body;
        
        switch (type) {
            case 'message':
                await handleIncomingMessage(payload);
                break;
            case 'message-event':
                await handleMessageEvent(payload);
                break;
            case 'user-event':
                await handleUserEvent(payload);
                break;
            default:
                console.log('Unknown webhook type:', type);
        }
        
        res.status(200).json({ status: 'success' });
    } catch (error: any) {
        console.error('Gupshup webhook error:', error?.message || error);
        res.status(500).json({ message: 'Webhook processing failed' });
    }
};

async function handleIncomingMessage(payload: any) {
    const { source, destination, message } = payload;
    
    if (message?.type === 'text') {
        const incomingText = message.text;
        console.log(`Incoming message from ${source}: ${incomingText}`);
        
        // Auto-reply logic
        const reply = `Thanks for your message: "${incomingText}"`;
        
        try {
            await whatsappQueue.add({ 
                to: source, 
                text: reply, 
                provider: WhatsAppProvider.GUPSHUP 
            });
        } catch (error) {
            console.error('Failed to queue reply:', error);
        }
    }
}

async function handleMessageEvent(payload: any) {
    const { eventType, messageId, timestamp } = payload;
    console.log(`Message event: ${eventType} for message ${messageId} at ${timestamp}`);
    
    // Handle delivery receipts, read receipts, etc.
    // You can store these events in your database for tracking
}

async function handleUserEvent(payload: any) {
    const { eventType, phone, timestamp } = payload;
    console.log(`User event: ${eventType} for ${phone} at ${timestamp}`);
    
    // Handle opt-in/opt-out events
    // You can update user preferences in your database
}