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
