import BaseModel from '../baseModel';
import { CustomerDevice as CustomerDeviceEntity } from '../../database/entity/CustomerDevice';
import Context from '../context';

export default class CustomerDeviceModel extends BaseModel {
    constructor(connection: any, context: Context) {
        super(connection, connection.getRepository(CustomerDeviceEntity), context);
    }

    /**
     * Save or update customer device
     * @param input - Contains customerUuid, deviceToken, deviceType, fcmToken
     * 
     * Logic:
     * 1. First, check if this customer already has the same device (by customerId + deviceToken)
     *    - If yes, update the fcmToken (which can change)
     * 2. If not found for this customer, check if another customer has the same physical device
     *    - This handles device switching between customers (reassign device to new customer)
     * 3. If not found anywhere, create a new device record
     */
    async save(input: any) {
        const customer = await this.context.customer.repository.findOne({
            where: { uuid: input.customerUuid }
        });

        if (!customer) {
            throw new Error('Customer not found');
        }

        // STEP 1: Check if THIS customer already has THIS device
        let device = await this.repository.findOne({
            where: { 
                customerId: customer.id,
                deviceToken: input.deviceToken 
            }
        });

        // STEP 2: If not found for this customer, check if device exists for another customer
        if (!device) {
            device = await this.repository.findOne({
                where: { deviceToken: input.deviceToken }
            });
        }

        if (device) {
            // UPDATE existing device with latest info
            device.customerId = customer.id;
            device.deviceType = input.deviceType;
            if (input.fcmToken) {
                device.fcmToken = input.fcmToken;
            } else {
                // If no new fcmToken provided but device already has one, keep it
                // Only clear if explicitly set to null by client
            }
            console.log(`✅ Device updated for customer ${customer.uuid}: ${input.deviceToken}`);
        } else {
            // STEP 3: CREATE new device record
            device = this.repository.create({
                deviceToken: input.deviceToken,
                deviceType: input.deviceType,
                fcmToken: input.fcmToken || null,
                customerId: customer.id
            });
            console.log(`✅ New device created for customer ${customer.uuid}: ${input.deviceToken}`);
        }

        const savedDevice = await this.repository.save(device);
        
        // Log device info for debugging
        console.log(`📱 Device saved - Token: ${input.deviceToken?.substring(0, 8)}..., Type: ${input.deviceType}, FCM: ${input.fcmToken ? '✓' : '✗'}`);
        
        return savedDevice;
    }

    /**
     * Return devices (with FCM tokens) for a given customer.
     */
    async findByCustomerId(customerId: number) {
        return this.repository.find({
            where: { customerId }
        });
    }
}
