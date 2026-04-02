import { fcmNotificationService } from './services/fcmNotificationService';

async function test() {
    const fcmToken = 'fulQ6Djrp9WfBQ8bEOGHiW:APA91bHrw3uA1Lwa3bwqBZtuLljlkIdF1RNywRabfM8Tdg9XJH-M5V4UyBKHN34zoyxguZA_pL2sXlODEEzhHLv7KMlC4R9VVFYUBA-CyLRvrqcsO54BzSU';
    
    console.log("Testing FCM notification to:", fcmToken);
    
    const result = await fcmNotificationService.sendToDevice(
        fcmToken,
        'Test Manual Message',
        'Testing from Antigravity!',
        { test: 'true' }
    );
    
    console.log("Result:", result);
}

test();
