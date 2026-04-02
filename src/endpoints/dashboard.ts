import { NextFunction, Request, Response } from 'express'
import connection from "../ormconfig";
import schema from "../shared/directives/loadSchema";
import Context from '../schema/context';
import { Status } from '../database/entity/root/enums';
import { TableSessionStatus } from '../database/entity/TableSession';
import { TournamentStatus } from '../schema/tournament/types';
import { Not } from 'typeorm';
import { TableStatus } from '../schema/table/types';
import { fcmNotificationService } from '../services/fcmNotificationService';
import { TableSession } from '../database/entity/TableSession';

export const tableStats = async (req: Request, res: Response) => {
    try {
        const ctx = Context.getInstance(connection, schema, req, req.user);

        const totalActiveTables = await ctx.table.repository.count({
            where: { status: Not(TableStatus.INACTIVE) }
        });

        const occupiedTablesCount = await ctx.tableSession.repository
            .createQueryBuilder('ts')
            .select('COUNT(DISTINCT ts.tableId)', 'count')
            .where('ts.status IN (:...statuses)', {
                statuses: [TableSessionStatus.BOOKED, TableSessionStatus.ACTIVE]
            })
            .getRawOne();

        const occupiedTables = parseInt(occupiedTablesCount?.count || '0', 10);

        const activeTournaments = await ctx.tournament.repository.count({
            where: { status: TournamentStatus.UPCOMING }
        });

        // === Today’s Revenue ===
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todaysRevenueResult = await ctx.payment.repository
            .createQueryBuilder('p')
            .select('COALESCE(SUM(p.totalAmount), 0)', 'total')
            .where('p.createdAt BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
            .andWhere('p.status = :status', { status: Status.SUCCESS })
            .getRawOne();

        const todaysRevenue = parseFloat(todaysRevenueResult?.total || 0);

        const data = {
            availableTables: totalActiveTables - occupiedTables,
            occupiedTables,
            activeTournaments,
            todaysRevenue,
        };

        return res.status(200).json({ status: true, data, message: 'Retrieved successfully!' });

    } catch (error) {
        console.error('Error fetching table stats:', error);
        return res.status(500).json({ status: false, message: 'Internal server error' });
    }
};

/**
 * Book a table for a customer and send notification
 * Admin can use this endpoint to book a table for a customer
 * The customer will receive an FCM notification about the booking
 */
export const bookTableForCustomer = async (req: Request, res: Response) => {
    try {
         console.log('step 0')
        const ctx = Context.getInstance(connection, schema, req, req.user);
        console.log('step 1')

        const { customerId, tableId, duration, unit, freeMins, startTime, endTime, personCount } = req.body;

        // Validate required fields
        if (!customerId || !tableId || !duration || !unit) {
            return res.status(400).json({
                status: false,
                message: 'customerId, tableId, duration, and unit are required'
            });
        }

        const sessionPersonCount = personCount && Number.isInteger(personCount) && personCount > 0 ? personCount : 1;

        // Fetch customer 
        const customer = await ctx.customer.repository.findOne({
            where: { id: customerId }
        });

         console.log('step 2')

        if (!customer) {
            return res.status(404).json({
                status: false,
                message: 'Customer not found'
            });
        }

        // Fetch table
        const table = await ctx.table.repository.findOne({
            where: { id: tableId }
        });

        if (!table) {
            return res.status(404).json({
                status: false,
                message: 'Table not found'
            });
        }

         console.log('step 3')

        // Check if table is already booked or active
        const existingSession = await ctx.tableSession.repository.findOne({
            where: { tableId: tableId, status: TableSessionStatus.BOOKED }
        });

         console.log('step 4')

        const activeSession = await ctx.tableSession.repository.findOne({
            where: { tableId: tableId, status: TableSessionStatus.ACTIVE }
        });

         console.log('step 5')

        if (existingSession || activeSession) {
            return res.status(409).json({
                status: false,
                message: 'Table is already booked or in use'
            });
        }

        // Create table session using entity manager
        const sessionData = {
            customerId: customerId,
            tableId: tableId,
            duration: duration,
            unit: unit,
            freeMins: freeMins || null,
            startTime: startTime ? new Date(startTime) : null,
            endTime: endTime ? new Date(endTime) : null,
            personCount: sessionPersonCount,
            status: TableSessionStatus.BOOKED
        };

         console.log('step 6')

        const savedSession = await ctx.tableSession.repository.save(sessionData);

         console.log('step 7')

        // Fetch customer devices for FCM notification
        const customerDevices = await ctx.customerDevice.repository.find({
            where: { customerId: customerId }
        });

         console.log('step 8')

        console.log(`📱 Found ${customerDevices?.length || 0} device(s) for customer ${customer.uuid}`);

        // Send FCM notification to customer
        if (customerDevices && customerDevices.length > 0) {
            const fcmTokens = customerDevices
                .filter((device: any) => device.fcmToken)
                .map((device: any) => device.fcmToken);

            console.log(`📱 Devices with FCM tokens: ${fcmTokens.length}/${customerDevices.length}`);
            console.log(`📱 FCM Tokens:`, fcmTokens.map((token: string) => token.substring(0, 20) + '...'));
            console.log(fcmTokens)

            if (fcmTokens.length > 0) {
                const notificationTitle = '🎮 Table Booked!';
                const notificationBody = `Table ${table.name} has been booked for you! Duration: ${duration}${unit}`;

                const notificationData = {
                    tableId: tableId.toString(),
                    tableUuid: table.uuid,
                    tableName: table.name,
                    sessionUuid: savedSession.uuid,
                    duration: duration.toString(),
                    unit: unit
                };

                // Send to all customer devices with detailed logging
                await fcmNotificationService.sendToMultipleDevices(
                    fcmTokens,
                    notificationTitle,
                    notificationBody,
                    notificationData,
                    { customerId: customer.uuid, customerName: `${customer.firstName} ${customer.lastName}` }
                );
            } else {
                console.log(`⚠️  No devices with FCM tokens. Cannot send notification. Check database for customer_devices.fcm_token`);
            }
        } else {
            console.log(`⚠️  No registered devices for customer. Ask customer to register again and grant notification permission.`);
        }

        return res.status(201).json({
            status: true,
            message: 'Table booked successfully and notification sent to customer',
            data: {
                sessionUuid: savedSession.uuid,
                sessionId: savedSession.id,
                customerId: customer.id,
                customerName: `${customer.firstName} ${customer.lastName}`,
                tableId: table.id,
                tableName: table.name,
                duration: duration,
                unit: unit,
                personCount: sessionPersonCount,
                status: savedSession.status
            }
        });

    } catch (error: any) {
        console.error('Error booking table:', error);
        return res.status(500).json({
            status: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};