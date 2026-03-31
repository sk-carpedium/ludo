import { 
    GUPSHUP_API_KEY, 
    GUPSHUP_APP_NAME, 
    GUPSHUP_SOURCE,
    FACEBOOK_WA_TOKEN,
    FACEBOOK_WA_PHONE_NUMBER_ID 
} from '../shared/config';
import { createGupshupClient, GupshupWhatsApp } from './gupshup';
import { sendTextMessage as facebookSendText, sendTemplateMessage as facebookSendTemplate } from './whatsapp';

export enum WhatsAppProvider {
    FACEBOOK = 'facebook',
    GUPSHUP = 'gupshup'
}

export interface WhatsAppServiceConfig {
    defaultProvider?: WhatsAppProvider;
    fallbackProvider?: WhatsAppProvider;
}

export class WhatsAppService {
    private gupshupClient: GupshupWhatsApp | null = null;
    private config: WhatsAppServiceConfig;

    constructor(config: WhatsAppServiceConfig = {}) {
        this.config = {
            defaultProvider: config.defaultProvider || WhatsAppProvider.GUPSHUP,
            fallbackProvider: config.fallbackProvider || WhatsAppProvider.FACEBOOK,
        };

        // Initialize Gupshup client if credentials are available
        if (GUPSHUP_API_KEY && GUPSHUP_APP_NAME) {
            this.gupshupClient = createGupshupClient(
                GUPSHUP_API_KEY, 
                GUPSHUP_APP_NAME, 
                GUPSHUP_SOURCE || undefined
            );
        }
    }

    private isGupshupAvailable(): boolean {
        return this.gupshupClient !== null && Boolean(GUPSHUP_API_KEY && GUPSHUP_APP_NAME);
    }

    private isFacebookAvailable(): boolean {
        return Boolean(FACEBOOK_WA_TOKEN && FACEBOOK_WA_PHONE_NUMBER_ID);
    }

    async sendTextMessage(to: string, text: string, provider?: WhatsAppProvider): Promise<any> {
        const selectedProvider = provider || this.config.defaultProvider;

        try {
            if (selectedProvider === WhatsAppProvider.GUPSHUP && this.isGupshupAvailable()) {
                return await this.gupshupClient!.sendTextMessage(to, text);
            } else if (selectedProvider === WhatsAppProvider.FACEBOOK && this.isFacebookAvailable()) {
                return await facebookSendText(to, text);
            } else {
                throw new Error(`Provider ${selectedProvider} is not available or not configured`);
            }
        } catch (error) {
            console.error(`Failed to send text message via ${selectedProvider}:`, error);
            
            // Try fallback provider if configured and different from the one that failed
            if (this.config.fallbackProvider && this.config.fallbackProvider !== selectedProvider) {
                console.log(`Attempting fallback to ${this.config.fallbackProvider}`);
                try {
                    if (this.config.fallbackProvider === WhatsAppProvider.GUPSHUP && this.isGupshupAvailable()) {
                        return await this.gupshupClient!.sendTextMessage(to, text);
                    } else if (this.config.fallbackProvider === WhatsAppProvider.FACEBOOK && this.isFacebookAvailable()) {
                        return await facebookSendText(to, text);
                    }
                } catch (fallbackError) {
                    console.error(`Fallback provider ${this.config.fallbackProvider} also failed:`, fallbackError);
                }
            }
            
            throw error;
        }
    }

    async sendTemplateMessage(
        to: string, 
        templateName: string, 
        params?: string[], 
        language = 'en_US',
        provider?: WhatsAppProvider
    ): Promise<any> {
        const selectedProvider = provider || this.config.defaultProvider;

        try {
            if (selectedProvider === WhatsAppProvider.GUPSHUP && this.isGupshupAvailable()) {
                return await this.gupshupClient!.sendTemplateMessage(to, templateName, params);
            } else if (selectedProvider === WhatsAppProvider.FACEBOOK && this.isFacebookAvailable()) {
                return await facebookSendTemplate(to, templateName, language);
            } else {
                throw new Error(`Provider ${selectedProvider} is not available or not configured`);
            }
        } catch (error) {
            console.error(`Failed to send template message via ${selectedProvider}:`, error);
            
            // Try fallback provider if configured and different from the one that failed
            if (this.config.fallbackProvider && this.config.fallbackProvider !== selectedProvider) {
                console.log(`Attempting fallback to ${this.config.fallbackProvider}`);
                try {
                    if (this.config.fallbackProvider === WhatsAppProvider.GUPSHUP && this.isGupshupAvailable()) {
                        return await this.gupshupClient!.sendTemplateMessage(to, templateName, params);
                    } else if (this.config.fallbackProvider === WhatsAppProvider.FACEBOOK && this.isFacebookAvailable()) {
                        return await facebookSendTemplate(to, templateName, language);
                    }
                } catch (fallbackError) {
                    console.error(`Fallback provider ${this.config.fallbackProvider} also failed:`, fallbackError);
                }
            }
            
            throw error;
        }
    }

    async sendMediaMessage(
        to: string,
        mediaUrl: string,
        mediaType: 'image' | 'document' | 'audio' | 'video',
        caption?: string,
        filename?: string,
        provider?: WhatsAppProvider
    ): Promise<any> {
        const selectedProvider = provider || this.config.defaultProvider;

        if (selectedProvider === WhatsAppProvider.GUPSHUP && this.isGupshupAvailable()) {
            return await this.gupshupClient!.sendMediaMessage(to, mediaUrl, mediaType, caption, filename);
        } else {
            throw new Error('Media messages are currently only supported via Gupshup provider');
        }
    }

    async sendInteractiveMessage(to: string, interactiveMessage: any, provider?: WhatsAppProvider): Promise<any> {
        const selectedProvider = provider || this.config.defaultProvider;

        if (selectedProvider === WhatsAppProvider.GUPSHUP && this.isGupshupAvailable()) {
            return await this.gupshupClient!.sendInteractiveMessage(to, interactiveMessage);
        } else {
            throw new Error('Interactive messages are currently only supported via Gupshup provider');
        }
    }

    async optInUser(phoneNumber: string): Promise<any> {
        if (this.isGupshupAvailable()) {
            return await this.gupshupClient!.optIn(phoneNumber);
        } else {
            throw new Error('Opt-in functionality is only available via Gupshup provider');
        }
    }

    async optOutUser(phoneNumber: string): Promise<any> {
        if (this.isGupshupAvailable()) {
            return await this.gupshupClient!.optOut(phoneNumber);
        } else {
            throw new Error('Opt-out functionality is only available via Gupshup provider');
        }
    }

    async getMessageStatus(messageId: string): Promise<any> {
        if (this.isGupshupAvailable()) {
            return await this.gupshupClient!.getMessageStatus(messageId);
        } else {
            throw new Error('Message status tracking is only available via Gupshup provider');
        }
    }

    getAvailableProviders(): WhatsAppProvider[] {
        const providers: WhatsAppProvider[] = [];
        
        if (this.isGupshupAvailable()) {
            providers.push(WhatsAppProvider.GUPSHUP);
        }
        
        if (this.isFacebookAvailable()) {
            providers.push(WhatsAppProvider.FACEBOOK);
        }
        
        return providers;
    }

    getCurrentProvider(): WhatsAppProvider | null {
        return this.config.defaultProvider || null;
    }

    setDefaultProvider(provider: WhatsAppProvider): void {
        this.config.defaultProvider = provider;
    }
}

// Export a singleton instance
export const whatsappService = new WhatsAppService();