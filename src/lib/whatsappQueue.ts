import Queue from 'bull'
import { redis } from '../shared/config'
import { whatsappService } from './whatsappService'

// If redis is not enabled in config, provide an in-process fallback queue
let whatsappQueue: any = null;

if (redis && (redis as any).enable) {
    const connection = {
        host: redis.connection.host,
        port: redis.connection.port,
    }
    whatsappQueue = new (Queue as any)('whatsapp-outgoing', { redis: connection });

    whatsappQueue.process(async (job: any) => {
        const { to, text, provider } = job.data;
        return whatsappService.sendTextMessage(to, text, provider);
    });

    whatsappQueue.on('failed', (job: any, err: any) => {
        console.error('Whatsapp queue job failed', job?.id, err?.message || err);
    });
} else {
    // Fallback: simple in-memory ad-hoc queue with immediate send
    whatsappQueue = {
        add: async (data: any) => {
            // mimic Bull job object
            try {
                const resp = await whatsappService.sendTextMessage(data.to, data.text, data.provider);
                return { id: null, resp };
            } catch (e) {
                // rethrow so callers can fallback or report
                throw e;
            }
        }
    }
}

export default whatsappQueue;
