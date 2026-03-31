import axios from 'axios';
import { GUPSHUP_API_URL } from '../shared/config';

export interface GupshupConfig {
    apiKey: string;
    appName: string;
    source?: string;
}

export interface GupshupTextMessage {
    channel: 'whatsapp';
    source: string;
    destination: string;
    message: {
        type: 'text';
        text: string;
    };
}

export interface GupshupTemplateMessage {
    channel: 'whatsapp';
    source: string;
    destination: string;
    message: {
        type: 'template';
        template: {
            id: string;
            params?: string[];
        };
    };
}

export interface GupshupMediaMessage {
    channel: 'whatsapp';
    source: string;
    destination: string;
    message: {
        type: 'image' | 'document' | 'audio' | 'video';
        originalUrl: string;
        caption?: string;
        filename?: string;
    };
}

export class GupshupWhatsApp {
    private config: GupshupConfig;

    constructor(config: GupshupConfig) {
        this.config = config;
        if (!config.source) {
            this.config.source = config.appName;
        }
    }

    private getHeaders() {
        return {
            'Content-Type': 'application/x-www-form-urlencoded',
            'apikey': this.config.apiKey,
        };
    }

    private formatPhoneNumber(phoneNumber: string): string {
        // Remove any non-digit characters and ensure it starts with country code
        const cleaned = phoneNumber.replace(/\D/g, '');
        // If it doesn't start with a country code, assume it's missing
        if (cleaned.length === 10) {
            // Assuming default country code, you might want to make this configurable
            return `91${cleaned}`; // Default to India (+91)
        }
        return cleaned;
    }

    async sendTextMessage(to: string, text: string): Promise<any> {
        const url = `${GUPSHUP_API_URL}/msg`;
        
        const payload = new URLSearchParams({
            channel: 'whatsapp',
            source: this.config.source!,
            destination: this.formatPhoneNumber(to),
            message: JSON.stringify({
                type: 'text',
                text: text
            }),
            'src.name': this.config.appName,
        });

        try {
            const response = await axios.post(url, payload, {
                headers: this.getHeaders(),
            });
            return response.data;
        } catch (error: any) {
            console.error('Gupshup sendTextMessage error:', error?.response?.data || error?.message);
            throw new Error(`Failed to send text message: ${error?.response?.data?.message || error?.message}`);
        }
    }

    async sendTemplateMessage(to: string, templateId: string, params?: string[]): Promise<any> {
        const url = `${GUPSHUP_API_URL}/msg`;
        
        const templateMessage: any = {
            type: 'template',
            template: {
                id: templateId
            }
        };

        if (params && params.length > 0) {
            templateMessage.template.params = params;
        }

        const payload = new URLSearchParams({
            channel: 'whatsapp',
            source: this.config.source!,
            destination: this.formatPhoneNumber(to),
            message: JSON.stringify(templateMessage),
            'src.name': this.config.appName,
        });

        try {
            const response = await axios.post(url, payload, {
                headers: this.getHeaders(),
            });
            return response.data;
        } catch (error: any) {
            console.error('Gupshup sendTemplateMessage error:', error?.response?.data || error?.message);
            throw new Error(`Failed to send template message: ${error?.response?.data?.message || error?.message}`);
        }
    }

    async sendMediaMessage(
        to: string, 
        mediaUrl: string, 
        mediaType: 'image' | 'document' | 'audio' | 'video',
        caption?: string,
        filename?: string
    ): Promise<any> {
        const url = `${GUPSHUP_API_URL}/msg`;
        
        const mediaMessage: any = {
            type: mediaType,
            originalUrl: mediaUrl
        };

        if (caption) {
            mediaMessage.caption = caption;
        }

        if (filename && mediaType === 'document') {
            mediaMessage.filename = filename;
        }

        const payload = new URLSearchParams({
            channel: 'whatsapp',
            source: this.config.source!,
            destination: this.formatPhoneNumber(to),
            message: JSON.stringify(mediaMessage),
            'src.name': this.config.appName,
        });

        try {
            const response = await axios.post(url, payload, {
                headers: this.getHeaders(),
            });
            return response.data;
        } catch (error: any) {
            console.error('Gupshup sendMediaMessage error:', error?.response?.data || error?.message);
            throw new Error(`Failed to send media message: ${error?.response?.data?.message || error?.message}`);
        }
    }

    async sendInteractiveMessage(to: string, interactiveMessage: any): Promise<any> {
        const url = `${GUPSHUP_API_URL}/msg`;
        
        const payload = new URLSearchParams({
            channel: 'whatsapp',
            source: this.config.source!,
            destination: this.formatPhoneNumber(to),
            message: JSON.stringify({
                type: 'interactive',
                interactive: interactiveMessage
            }),
            'src.name': this.config.appName,
        });

        try {
            const response = await axios.post(url, payload, {
                headers: this.getHeaders(),
            });
            return response.data;
        } catch (error: any) {
            console.error('Gupshup sendInteractiveMessage error:', error?.response?.data || error?.message);
            throw new Error(`Failed to send interactive message: ${error?.response?.data?.message || error?.message}`);
        }
    }

    async getMessageStatus(messageId: string): Promise<any> {
        const url = `${GUPSHUP_API_URL}/msg/${messageId}`;
        
        try {
            const response = await axios.get(url, {
                headers: {
                    'apikey': this.config.apiKey,
                },
            });
            return response.data;
        } catch (error: any) {
            console.error('Gupshup getMessageStatus error:', error?.response?.data || error?.message);
            throw new Error(`Failed to get message status: ${error?.response?.data?.message || error?.message}`);
        }
    }

    async optIn(phoneNumber: string): Promise<any> {
        const url = `${GUPSHUP_API_URL}/app/opt/in`;
        
        const payload = new URLSearchParams({
            user: this.formatPhoneNumber(phoneNumber),
        });

        try {
            const response = await axios.post(url, payload, {
                headers: this.getHeaders(),
            });
            return response.data;
        } catch (error: any) {
            console.error('Gupshup optIn error:', error?.response?.data || error?.message);
            throw new Error(`Failed to opt in user: ${error?.response?.data?.message || error?.message}`);
        }
    }

    async optOut(phoneNumber: string): Promise<any> {
        const url = `${GUPSHUP_API_URL}/app/opt/out`;
        
        const payload = new URLSearchParams({
            user: this.formatPhoneNumber(phoneNumber),
        });

        try {
            const response = await axios.post(url, payload, {
                headers: this.getHeaders(),
            });
            return response.data;
        } catch (error: any) {
            console.error('Gupshup optOut error:', error?.response?.data || error?.message);
            throw new Error(`Failed to opt out user: ${error?.response?.data?.message || error?.message}`);
        }
    }
}

// Factory function to create Gupshup instance
export function createGupshupClient(apiKey: string, appName: string, source?: string): GupshupWhatsApp {
    return new GupshupWhatsApp({ apiKey, appName, source });
}