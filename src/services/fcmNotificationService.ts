/**
 * Enhanced Firebase Cloud Messaging Service with Detailed Debugging
 * Sends push notifications to customers' devices using FCM
 * 
 * SETUP REQUIRED:
 * 1. Go to: https://console.firebase.google.com/
 * 2. Select "ludo-c1bc3" project
 * 3. Go to Project Settings → Service Accounts
 * 4. Generate private key JSON
 * 5. Save to: src/config/firebase-service-account.json
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// ============ STATE TRACKING ============
let firebaseAdminInitialized = false;
let firebaseAvailable = false;
let initializationError: string | null = null;

// ============ INITIALIZATION ============

const initializeFirebaseAdmin = () => {
    if (firebaseAdminInitialized) {
        if (!firebaseAvailable) {
            console.log('⚠️  Firebase not available (see earlier startup messages)');
        }
        return;
    }

    firebaseAdminInitialized = true;

    try {
        // Try multiple possible paths for service account
        const possiblePaths = [
            path.join(__dirname, '../../config/firebase-service-account.json'),
            path.join(__dirname, '../config/firebase-service-account.json'),
            path.join(__dirname, 'firebase-service-account.json'),
            'config/firebase-service-account.json'
        ];

        let serviceAccountPath: string | null = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                serviceAccountPath = p;
                console.log(`✅ Firebase service account found at: ${p}`);
                break;
            }
        }

        if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
            const errorMsg = 'Firebase service account JSON file NOT FOUND';
            initializationError = errorMsg;
            console.log('\n');
            console.log('╔════════════════════════════════════════════════════════════════╗');
            console.log('║ ❌ FIREBASE SERVICE ACCOUNT NOT FOUND - NOTIFICATIONS DISABLED  ║');
            console.log('╚════════════════════════════════════════════════════════════════╝');
            console.log('');
            console.log('Expected location: ludo/src/config/firebase-service-account.json');
            console.log('');
            console.log('Searched paths:');
            possiblePaths.forEach(p => console.log(`  • ${p}`));
            console.log('');
            console.log('TO FIX THIS:');
            console.log('1. Go to: https://console.firebase.google.com/');
            console.log('2. Select project: "ludo-c1bc3"');
            console.log('3. Go to: Project Settings → Service Accounts tab');
            console.log('4. Click "Generate New Private Key"');
            console.log('5. Save JSON file to: d:\\salman\\ludo-project\\ludo\\src\\config\\');
            console.log('6. Rename to: firebase-service-account.json');
            console.log('7. Restart backend server');
            console.log('');
            firebaseAvailable = false;
            return;
        }

        // Load and validate service account
        const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);

        // Validate required fields
        const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
        const missingFields = requiredFields.filter(field => !serviceAccount[field]);

        if (missingFields.length > 0) {
            initializationError = `Missing required fields: ${missingFields.join(', ')}`;
            console.log(`❌ Invalid service account JSON. Missing: ${missingFields.join(', ')}`);
            firebaseAvailable = false;
            return;
        }

        // Initialize Firebase Admin SDK
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        firebaseAvailable = true;
        console.log('\n');
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║  ✅ Firebase Admin SDK Initialized Successfully                 ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log(`Project: ${serviceAccount.project_id}`);
        console.log(`Service Account: ${serviceAccount.client_email}`);
        console.log(`Status: Ready to send FCM notifications`);
        console.log('');

    } catch (error: any) {
        initializationError = error.message;
        console.log(`❌ Failed to initialize Firebase Admin SDK:`);
        console.log(`   Error: ${error.message}`);
        if (error.code) {
            console.log(`   Code: ${error.code}`);
        }
        firebaseAvailable = false;
    }
};

// ============ NOTIFICATION SERVICE ============

export const fcmNotificationService = {

    /**
     * Get initialization status (useful for debugging)
     */
    getStatus(): { isInitialized: boolean; isAvailable: boolean; error: string | null } {
        initializeFirebaseAdmin();
        return {
            isInitialized: firebaseAdminInitialized,
            isAvailable: firebaseAvailable,
            error: initializationError
        };
    },

    /**
     * Send notification to single device with detailed logging
     */
    async sendToDevice(
        fcmToken: string,
        title: string,
        body: string,
        data?: Record<string, string>,
        debugInfo?: { customerId?: string; deviceIndex?: number; totalDevices?: number }
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        
        const debug = debugInfo || {};
        const deviceDesc = debug.deviceIndex !== undefined 
        ? `Device ${debug.deviceIndex + 1}/${debug.totalDevices}` 
        : 'Device';
        
        // Validation
        if (!fcmToken || fcmToken.trim() === '') {
            console.log(`   ❌ ${deviceDesc}: No FCM token provided. Cannot send notification.`);
            return { success: false, error: 'No FCM token' };
        }
        
        if (!firebaseAvailable) {
            console.log(`   ⚠️  ${deviceDesc}: Firebase not available. Notification NOT sent.`);
            console.log(`       Reason: ${initializationError || 'Unknown'}`);
            console.log(`       Setup: Check server startup logs for Firebase initialization status`);
            return { success: false, error: initializationError || 'Firebase not available' };
        }
        
        initializeFirebaseAdmin();
        try {
            // Build message
            const message = {
                notification: {
                    title,
                    body
                },
                data: data || {},
                webpush: {
                    headers: {
                        Urgency: 'high'
                    },
                    fcmOptions: {
                        link: '/thank-you'
                    },
                    notification: {
                        title,
                        body,
                        icon: '/ludo-icon.png',
                        badge: '/ludo-icon.png',
                        tag: 'booking-notification',
                        requireInteraction: true,
                        click_action: '/thank-you'
                    }
                },
                android: {
                    priority: "high" as const,
                    notification: {
                        title,
                        body,
                        icon: 'ic_notification',
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title,
                                body
                            },
                            sound: 'default',
                            badge: 1,
                            'mutable-content': 1
                        }
                    }
                }
            };

            console.log(`   🔄 ${deviceDesc}: Sending notification...`);
            console.log(`      Token: ${fcmToken.substring(0, 20)}...`);
            console.log(`      Title: ${title}`);

            // Send via FCM
            const response = await admin.messaging().send({
                ...message,
                token: fcmToken
            });

            console.log(`   ✅ ${deviceDesc}: Notification sent successfully`);
            console.log(`      Message ID: ${response}`);

            return { success: true, messageId: response };

        } catch (error: any) {
            console.log(`   ❌ ${deviceDesc}: Failed to send notification`);
            console.log(`      Error: ${error.message}`);

            // Provide helpful guidance based on error type
            if (error.code === 'messaging/invalid-registration-token') {
                console.log(`      Issue: Invalid or expired FCM token`);
                console.log(`      Fix: Customer device might have unregistered. Ask customer to re-register.`);
            } else if (error.code === 'messaging/third-party-auth-error') {
                console.log(`      Issue: Firebase authentication failed`);
                console.log(`      Fix: Check that service account JSON is valid and not expired`);
            } else if (error.code === 'messaging/mismatched-credential') {
                console.log(`      Issue: Service account doesn't match Firebase project`);
                console.log(`      Fix: Regenerate service account from correct Firebase project`);
            }

            return { success: false, error: error.message };
        }
    },

    /**
     * Send notification to multiple devices with detailed logging
     */
    async sendToMultipleDevices(
        fcmTokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>,
        debugInfo?: { customerId?: string; customerName?: string }
    ): Promise<{ successCount: number; failureCount: number; details: any[] }> {
        initializeFirebaseAdmin();
        console.log('step 5')

        const debug = debugInfo || {};
        const customerDesc = debug.customerName 
            ? `${debug.customerName} (${debug.customerId})`
            : debug.customerId 
                ? `Customer ${debug.customerId}`
                : 'Customer';

        console.log(`\n📢 SENDING NOTIFICATIONS`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`To: ${customerDesc}`);
        console.log(`Devices: ${fcmTokens.length}`);
        console.log(`Title: ${title}`);
        console.log(`Body: ${body}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        if (!firebaseAdminInitialized) {
            console.log(`❌ Firebase Admin SDK not initialized. Skipping notifications.`);
            console.log(`   Check server startup logs for initialization status.`);
            return { successCount: 0, failureCount: fcmTokens.length, details: [] };
        }

        if (fcmTokens.length === 0) {
            console.log(`⚠️  No FCM tokens provided. Nothing to send.`);
            return { successCount: 0, failureCount: 0, details: [] };
        }

        const results = [];
        let successCount = 0;
        let failureCount = 0;

        // Send to each device
        for (let i = 0; i < fcmTokens.length; i++) {
            const result = await this.sendToDevice(
                fcmTokens[i],
                title,
                body,
                data,
                { customerId: debug.customerId, deviceIndex: i, totalDevices: fcmTokens.length }
            );

            results.push(result);
            if (result.success) {
                successCount++;
            } else {
                failureCount++;
            }
        }

        // Summary
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ Sent: ${successCount}/${fcmTokens.length}`);
        if (failureCount > 0) {
            console.log(`❌ Failed: ${failureCount}/${fcmTokens.length}`);
        }
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        return { successCount, failureCount, details: results };
    },

    /**
     * Test Firebase connectivity
     */
    async testConnection(): Promise<boolean> {
        initializeFirebaseAdmin();

        if (!firebaseAvailable) {
            console.log('❌ Firebase not available for testing');
            return false;
        }

        try {
            // This will fail with invalid token, but proves Firebase is responding
            await admin.messaging().send({
                token: 'invalid_token_for_testing',
                notification: { title: 'Test', body: 'Test' }
            });
            return true;
        } catch (error: any) {
            // If we get here, Firebase responded (even if with error)
            // Invalid token errors are fine - means Firebase is reachable
            if (error.code === 'messaging/invalid-registration-token') {
                console.log('✅ Firebase Admin SDK is connected and responding');
                return true;
            }
            console.log('❌ Firebase connection failed:', error.message);
            return false;
        }
    }
};

// Initialize on import
initializeFirebaseAdmin();
