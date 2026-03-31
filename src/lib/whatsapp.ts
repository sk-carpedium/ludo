import axios from 'axios';
import { FACEBOOK_WA_API_BASE, FACEBOOK_WA_TOKEN, FACEBOOK_WA_PHONE_NUMBER_ID } from '../shared/config';

export async function sendTemplateMessage(to: string, templateName: string, language = 'en_US') {
    if (!FACEBOOK_WA_TOKEN || !FACEBOOK_WA_PHONE_NUMBER_ID) {
        throw new Error('Missing WhatsApp configuration (FACEBOOK_WA_TOKEN or PHONE_NUMBER_ID)');
    }

    const url = `${FACEBOOK_WA_API_BASE}/${FACEBOOK_WA_PHONE_NUMBER_ID}/messages`;
    const body = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
            name: templateName,
            language: { code: language }
        }
    };

    const headers = {
        Authorization: `Bearer ${FACEBOOK_WA_TOKEN}`,
        'Content-Type': 'application/json'
    };

    const resp = await axios.post(url, body, { headers });
    return resp.data;
}

export async function sendTextMessage(to: string, messageText: string) {
    if (!FACEBOOK_WA_TOKEN || !FACEBOOK_WA_PHONE_NUMBER_ID) {
        throw new Error('Missing WhatsApp configuration (FACEBOOK_WA_TOKEN or PHONE_NUMBER_ID)');
    }

    const url = `${FACEBOOK_WA_API_BASE}/${FACEBOOK_WA_PHONE_NUMBER_ID}/messages`;
    const body = {
        messaging_product: 'whatsapp',
        to,
        text: { body: messageText }
    };

    const headers = {
        Authorization: `Bearer ${FACEBOOK_WA_TOKEN}`,
        'Content-Type': 'application/json'
    };

    const resp = await axios.post(url, body, { headers });
    return resp.data;
}
