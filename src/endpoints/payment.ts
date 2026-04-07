import { Response } from 'express';
import Context from '../schema/context';
import { TableSessionBillingInput } from '../schema/payment/types';
import connection from '../database/connection';
import schema from "../shared/directives/loadSchema";
import { accessRulesByRoleHierarchyUuid } from '../shared/lib/DataRoleUtils';

export const tableSessionBilling = async (req: any, res: Response) => {
    try {
        const ctx = Context.getInstance(connection,schema,req,req.user);
        const input:TableSessionBillingInput = req.query;
        if (!input.tableUuid || !input.companyUuid || !input.categoryPriceUuid) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: tableUuid, hours, companyUuid',
                errors: ['INVALID_INPUT']
            });
        }

        if(!await accessRulesByRoleHierarchyUuid(ctx, { companyUuid: input.companyUuid })) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden',
                errors: ['FORBIDDEN']
            });
        }

        // Normalize person count from query parameter
        if (input.personCount) {
            input.personCount = Number(input.personCount);
        }

        // Process table session billing
        const result = await ctx.payment.tableSessionBilling(input);

        if (!result.status) {
            return res.status(400).json({
                status: false,
                message: (result as any).errorMessage || 'Billing processing failed',
                errors: (result as any).errors || ['UNKNOWN_ERROR']
            });
        }

        return res.status(200).json(result);

    } catch (error: any) {
        console.error('Table session billing error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            errors: ['INTERNAL_SERVER_ERROR']
        });
    }
};

export const publicReceipt = async (req: any, res: Response) => {
    try {
        const { sessionUuid } = req.params;
        if (!sessionUuid) {
            return res.status(400).json({ success: false, message: 'Session UUID is required' });
        }

        const session = await connection.getRepository(Context.getInstance(connection, schema).tableSession.repository.target).findOne({
            where: { uuid: sessionUuid },
            relations: ['table', 'table.category', 'customer']
        }) as any;

        if (!session) {
            return res.status(404).json({ success: false, message: 'Receipt not found' });
        }

        const payment = await connection.getRepository(Context.getInstance(connection, schema).payment.repository.target).findOne({
            where: { tableSessionId: session.id },
            order: { createdAt: 'DESC' }
        }) as any;

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment details not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                sessionUuid: session.uuid,
                startTime: session.startTime,
                endTime: session.endTime,
                duration: session.duration,
                unit: session.unit,
                freeMins: session.freeMins || 0,
                personCount: session.personCount,
                table: {
                    name: session.table?.name,
                    category: {
                        name: session.table?.category?.name
                    }
                },
                customer: {
                    firstName: session.customer?.firstName,
                    lastName: session.customer?.lastName,
                    phone: session.customer?.phone || `${session.customer?.phoneCode || ''}${session.customer?.phoneNumber || ''}`
                },
                payment: {
                    amount: payment.amount,
                    taxRate: payment.taxRate,
                    taxAmount: payment.taxAmount,
                    totalAmount: payment.totalAmount,
                    method: payment.method,
                    status: payment.status,
                    createdAt: (() => {
                        const d = new Date(payment.createdAt);
                        // Convert node-postgres' incorrectly parsed local time back to the true UTC time
                        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
                    })()
                }
            }
        });
    } catch (error: any) {
        console.error('Public receipt error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            errors: ['INTERNAL_SERVER_ERROR']
        });
    }
};

export const publicTournamentReceipt = async (req: any, res: Response) => {
    try {
        const { tournamentUuid, customerUuid } = req.params;
        if (!tournamentUuid || !customerUuid) {
            return res.status(400).json({ success: false, message: 'Tournament UUID and Customer UUID are required' });
        }

        const tournament = await connection.getRepository(Context.getInstance(connection, schema).tournament.repository.target).findOne({
            where: { uuid: tournamentUuid },
            relations: ['category']
        }) as any;

        if (!tournament) {
            return res.status(404).json({ success: false, message: 'Tournament not found' });
        }

        const customer = await connection.getRepository(Context.getInstance(connection, schema).customer.repository.target).findOne({
            where: { uuid: customerUuid }
        }) as any;

        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const payment = await connection.getRepository(Context.getInstance(connection, schema).payment.repository.target).findOne({
            where: { tournamentId: tournament.id, customerId: customer.id },
            order: { createdAt: 'DESC' }
        }) as any;

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment details not found' });
        }

        return res.status(200).json({
            success: true,
            data: {
                tournamentUuid: tournament.uuid,
                customerUuid: customer.uuid,
                tournament: {
                    name: tournament.name,
                    entryFee: tournament.entryFee,
                    currencyName: tournament.currencyName,
                    category: {
                        name: tournament.category?.name
                    }
                },
                customer: {
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    phone: customer.phone || `${customer.phoneCode || ''}${customer.phoneNumber || ''}`
                },
                payment: {
                    amount: payment.amount,
                    taxRate: payment.taxRate,
                    taxAmount: payment.taxAmount,
                    totalAmount: payment.totalAmount,
                    method: payment.method,
                    status: payment.status,
                    createdAt: (() => {
                        const d = new Date(payment.createdAt);
                        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
                    })()
                }
            }
        });
    } catch (error: any) {
        console.error('Public tournament receipt error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            errors: ['INTERNAL_SERVER_ERROR']
        });
    }
};
