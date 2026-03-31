import { Request, Response } from 'express'
import crypto from 'crypto';
import { FACEBOOK_WA_VERIFY_TOKEN, FACEBOOK_APP_SECRET } from '../shared/config';
import { whatsappService, WhatsAppProvider } from '../lib/whatsappService';
import whatsappQueue from '../lib/whatsappQueue';

export const sendTemplate = async (req: Request, res: Response) => {
    try {
        const { to, templateName, language, provider } = req.body;
        if (!to || !templateName) {
            return res.status(400).json({ message: 'Missing `to` or `templateName` in request body' });
        }
        
        const selectedProvider = provider === 'gupshup' ? WhatsAppProvider.GUPSHUP : WhatsAppProvider.FACEBOOK;
        const result = await whatsappService.sendTemplateMessage(to, templateName, undefined, language, selectedProvider);
        return res.json(result);
    } catch (e: any) {
        console.error('WhatsApp sendTemplate error:', e?.response?.data || e?.message || e);
        return res.status(500).json({ message: e?.message || 'Failed to send template message' });
    }
}

export const sendText = async (req: Request, res: Response) => {
    try {
        const { to, text, provider } = req.body;
        if (!to || !text) return res.status(400).json({ message: 'Missing to or text' });
        
        const selectedProvider = provider === 'gupshup' ? WhatsAppProvider.GUPSHUP : undefined;
        
        // enqueue for delivery (try enqueue, fallback to direct send on failure)
        try {
            const job = await whatsappQueue.add({ to, text, provider: selectedProvider });
            return res.json({ queued: true, jobId: job.id });
        } catch (enqueueErr: any) {
            console.error('Failed to enqueue sendText', enqueueErr?.message || enqueueErr);
            // fallback: attempt to send immediately (helps when Redis is down)
            try {
                const resp = await whatsappService.sendTextMessage(to, text, selectedProvider);
                return res.json({ queued: false, sent: true, resp });
            } catch (sendErr: any) {
                console.error('Fallback send failed', sendErr?.response?.data || sendErr?.message || sendErr);
                return res.status(500).json({ message: 'Failed to enqueue message', details: sendErr?.message || String(sendErr) });
            }
        }
    } catch (e: any) {
        console.error('sendText error', e);
        return res.status(500).json({ message: e?.message || 'Failed' });
    }
}

export const webhookVerify = (req: Request, res: Response) => {
    const mode = req.query['hub.mode'] || req.query['mode'];
    const token = req.query['hub.verify_token'] || req.query['verify_token'];
    const challenge = req.query['hub.challenge'] || req.query['challenge'];

    console.log('Webhook verify request:', { mode, token, challenge, configToken: FACEBOOK_WA_VERIFY_TOKEN });

    if (mode && token) {
        if (mode === 'subscribe' && token === FACEBOOK_WA_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        } else {
            console.log('Token or mode mismatch: mode=' + mode + ', token=' + token);
            return res.status(403).send('Forbidden');
        }
    }
    console.log('Missing mode or token in query params');
    return res.status(400).send('Bad Request');
}

export const webhookReceiver = (req: Request, res: Response) => {
    try {
        // If raw body was provided (route uses bodyParser.raw), use it for signature verification and parsing
        const rawBody: Buffer | undefined = (req as any).rawBody;

        // Verify signature if app secret is configured
        if (FACEBOOK_APP_SECRET) {
            const signature = (req.headers['x-hub-signature-256'] || req.headers['X-Hub-Signature-256']) as string | undefined;
            if (!signature) {
                console.warn('Missing x-hub-signature-256 header');
                return res.sendStatus(403);
            }
            const expected = 'sha256=' + crypto.createHmac('sha256', FACEBOOK_APP_SECRET).update(rawBody || JSON.stringify(req.body)).digest('hex');
            if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
                console.warn('Webhook signature mismatch', { expected, signature });
                return res.sendStatus(403);
            }
        }

        const body = rawBody ? JSON.parse(rawBody.toString('utf8')) : req.body;
        console.log('WhatsApp webhook received:', JSON.stringify(body));

        // Basic handler: if this contains an incoming message, enqueue a reply.
        const entry = Array.isArray(body.entry) ? body.entry[0] : null;
        const changes = entry && Array.isArray(entry.changes) ? entry.changes[0] : null;
        const value = (changes && changes.value) || entry?.value || body;
        const messages = value?.messages;

        if (Array.isArray(messages) && messages.length > 0) {
            const message = messages[0];
            const from = message.from; // phone number of the sender
            const incomingText = message?.text?.body || message?.interactive?.button_reply?.title || '';
            console.log('Incoming message from', from, ':', incomingText);

            const reply = incomingText ? `Thanks — I received: "${incomingText}"` : 'Thanks for your message!';
            // Enqueue reply so it will be retried / processed reliably
            whatsappQueue.add({ to: from, text: reply }).then((job: any) => {
                console.log('Enqueued reply job id', job.id);
            }).catch((err: any) => console.error('Failed to enqueue reply', err));
        }

        // Acknowledge receipt to Facebook immediately
        res.status(200).send('EVENT_RECEIVED');
    } catch (e) {
        console.error('WhatsApp webhook handling error:', e);
        res.sendStatus(500);
    }
}

