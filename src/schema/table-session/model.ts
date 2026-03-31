import BaseModel from '../baseModel';
import { TableSession as TableSessionEntity, TableSessionStatus } from '../../database/entity/TableSession';
import { InvoiceStatus } from '../../database/entity/Invoice';
import { StartTableSessionInput, MarkCompletedInput, TableSessionFilter, RechargeTableSessionInput, StopTableSessionInput } from './types';
import Context from "../context";
import { GlobalError } from "../root/enum";
import { BookTableSessionInput } from './types';
import { isEmpty, result } from "lodash";
import { PagingInterface } from "../../interfaces";
import { In } from 'typeorm';
import { PaymentStatus } from '../payment/types';
import { accessRulesByRoleHierarchyUuid, accessRulesByRoleHierarchy } from '../../shared/lib/DataRoleUtils';
import moment from 'moment';
import { TableStatus } from '../table/types';
import whatsappQueue from '../../lib/whatsappQueue';
import { NotificationHooks } from '../../services/notificationHooks';

export default class TableSession extends BaseModel {
    repository: any;
    connection: any;
    loaders: any;

    constructor(connection: any, context: Context) {
        super(connection, connection.getRepository(TableSessionEntity), context);
    }

    async index(paging: PagingInterface, params: TableSessionFilter) {
        const _query = this.repository.createQueryBuilder('ts')
            .leftJoinAndSelect('ts.customer', 'customer')
            .leftJoinAndSelect('ts.table', 'table');

        if (!isEmpty(params.searchText)) {
            _query.andWhere('(customer.firstName ILIKE :searchText OR customer.lastName ILIKE :searchText)', {
                searchText: `%${params.searchText}%`
            });
        }
        if (!isEmpty(params.customerId)) {
            _query.andWhere('ts.customerId = :customerId', { customerId: params.customerId });
        }
        if (!isEmpty(params.tableId)) {
            _query.andWhere('ts.tableId = :tableId', { tableId: params.tableId });
        }
        if (!isEmpty(params.status)) {
            _query.andWhere('ts.status = :status', { status: params.status });
        }
        if (!isEmpty(params.dateFrom)) {
            _query.andWhere('ts.startTime >= :dateFrom', { dateFrom: params.dateFrom });
        }
        if (!isEmpty(params.dateTo)) {
            _query.andWhere('ts.startTime <= :dateTo', { dateTo: params.dateTo });
        }

        _query.orderBy('ts.startTime', 'DESC');

        return await this.paginator(_query, paging);
    }

    async show(id: string) {
        try {
            const data = await this.repository.findOne({
                where: { id },
                relations: ['customer', 'table']
            });
            return {
                data,
                status: true,
                errors: null,
                errorMessage: null
            };
        } catch (error: any) {
            return {
                data: null,
                status: false,
                errors: [GlobalError.INTERNAL_SERVER_ERROR],
                errorMessage: error.message
            };
        }
    }

    async getActiveSessions() {
        try {
            const data = await this.repository.find({
                where: { status: TableSessionStatus.ACTIVE },
                relations: ['customer', 'table']
            });
            return {
                list: data,
                paging: null
            };
        } catch (error: any) {
            return {
                list: [],
                paging: null
            };
        }
    }

    async bookSessionValidate(input: BookTableSessionInput) {
        let errors: any = [], errorMessage:any = null, data: any = {};

        if(!(await accessRulesByRoleHierarchyUuid(this.context, { companyUuid: input.companyUuid }))) {
            return this.formatErrors([GlobalError.NOT_ALLOWED], "Permission denied");
        }

        data.customer = await this.context.customer.repository.findOne({
            where: { uuid: input.customerUuid }
        });
        if (!data.customer) {
            return this.formatErrors([GlobalError.RECORD_NOT_FOUND], "Customer not found");
        }

        data.table = await this.context.table.repository.findOne({
            relations: ['category'],
            where: { uuid: input.tableUuid }
        });
        if (!data.table) {
            return this.formatErrors([GlobalError.RECORD_NOT_FOUND], "Table not found");
        }

        if(data.table.status !== TableStatus.ACTIVE) {

            return this.formatErrors([GlobalError.INVALID_INPUT], "Table is booked or in use");
        }

        data.categoryPrice = await this.context.categoryPrice.repository.findOne({
            where: { uuid: input.categoryPriceUuid }
        });
        if (!data.categoryPrice) {
            return this.formatErrors([GlobalError.RECORD_NOT_FOUND], "Category price not found");
        }

        const existingSession = await this.repository.findOne({
            where: { tableId: data.table.id, status: In([TableSessionStatus.ACTIVE, TableSessionStatus.BOOKED]) }
        });
        if (existingSession) {
            return this.formatErrors([GlobalError.ALREADY_EXISTS], "Table already has a booked session");
        }

        if (input.personCount && (!Number.isInteger(input.personCount) || input.personCount < 1)) {
            return this.formatErrors([GlobalError.INVALID_INPUT], "personCount must be an integer greater than 0");
        }

        return { data, errors, errorMessage };
    }

    async bookSession(input: BookTableSessionInput) {
        const { errors, data, errorMessage } = await this.bookSessionValidate(input);
        if (errors.length > 0) {
            return this.formatErrors(errors, errorMessage);
        }

        const { categoryPrice } = data;

        try {
            const transaction = await this.connection.manager.transaction(async (transactionalEntityManager: any) => {
                const personCount = input.personCount && Number.isInteger(input.personCount) && input.personCount > 0 ? input.personCount : 1;
                const session = transactionalEntityManager.create(this.repository.target, {
                    customerId: data.customer.id,
                    tableId: data.table.id,
                    status: TableSessionStatus.BOOKED,
                    unit: categoryPrice.unit,
                    duration: categoryPrice.duration,
                    freeMins: categoryPrice.freeMins,
                    personCount,
                });

                await transactionalEntityManager.save(session);

                const computedAmount = Number(categoryPrice.price) * personCount;
                const payment = await this.context.payment.createPayment(transactionalEntityManager, {
                    customerId: data.customer.id,
                    tableSessionId: session.id,
                    amount: computedAmount,
                    method: input.paymentMethod.paymentScheme,
                    status: PaymentStatus.SUCCESS,
                    calculateTax: true,
                    personCount,
                });

                if (!payment || !payment.status) {
                    throw new Error('Payment processing failed');
                }

                data.table.status = TableStatus.BOOKED;
                await transactionalEntityManager.save(data.table);

                return session;
            });

            if (transaction && transaction.error && transaction.error.length > 0) {
                console.log('transaction.error: ', transaction.error);
                return this.formatErrors([GlobalError.EXCEPTION], transaction.error);
            }

            // Send WhatsApp notification using the new notification service
            try {
                await NotificationHooks.onTableBooked({
                    customer: data.customer,
                    table: data.table,
                    categoryPrice: categoryPrice,
                    session: transaction
                });
            } catch (notificationError) {
                console.error('Failed to send table booking notification:', notificationError);
                // Don't fail the booking if notification fails
            }

            // Keep the old notification for backward compatibility (can be removed later)
            const to = `${data.customer.phoneCode || ''}${data.customer.phoneNumber || ''}`.replace(/\D/g, '');
            const text = `Table booking confirmed: ${data.table.name}. Duration ${categoryPrice.duration} ${categoryPrice.unit}.`;
            if (to) {
                try { await whatsappQueue.add({ to, text }); } catch (_) {}
            }

            return this.successResponse(transaction);
        } catch (error: any) {
            console.log('error: ', error);
            return this.formatErrors([GlobalError.INTERNAL_SERVER_ERROR], error.message);
        }
    }

    async startSessionValidate(input: StartTableSessionInput) {
        let errors: any = [], errorMessage:any = null, data: any = {};

        if(!(await accessRulesByRoleHierarchyUuid(this.context, { companyUuid: input.companyUuid }))) {
            return this.formatErrors([GlobalError.NOT_ALLOWED], "Permission denied");
        }

        data.tableSession = await this.repository.findOne({
            where: { uuid: input.tableSessionUuid, status: TableSessionStatus.BOOKED }
        });
        if (!data.tableSession) {
            return this.formatErrors([GlobalError.RECORD_NOT_FOUND], "Table session not found");
        }

        return { data, errors, errorMessage }
    }

    async startSession(input: StartTableSessionInput) {
        const validation = await this.startSessionValidate(input);
        if (validation.errors.length > 0) {
            return this.formatErrors(validation.errors, validation.errorMessage);
        }

        try {
            const { data } = validation;
            const session = data.tableSession
            let startTime = moment().add(session.duration, session.unit)
            if(session.freeMins) {
                startTime.add(session.freeMins, 'minutes')
            }
            data.tableSession.startTime = startTime.toDate(),
            data.tableSession.status = TableSessionStatus.ACTIVE;

            const savedSession = await this.repository.save(data.tableSession);
            startTime = moment().add(session.duration, session.unit)
            if(session.freeMins) {
                startTime.add(session.freeMins, 'minutes')
            }
            savedSession.startTime = startTime.toISOString()

            // Send session started notification
            try {
                // Get customer and table data for notification
                const sessionWithRelations = await this.repository.findOne({
                    where: { id: savedSession.id },
                    relations: ['customer', 'table']
                });

                if (sessionWithRelations) {
                    await NotificationHooks.onTableSessionStarted({
                        customer: sessionWithRelations.customer,
                        table: sessionWithRelations.table,
                        session: savedSession
                    });
                }
            } catch (notificationError) {
                console.error('Failed to send session started notification:', notificationError);
                // Don't fail the session start if notification fails
            }
    
            return this.successResponse(savedSession);
        } catch (error: any) {
            return this.formatErrors([GlobalError.INTERNAL_SERVER_ERROR], error.message);
        }
    }

    async rechargeSessionValidate(input: RechargeTableSessionInput) {
        let errors: any = [], errorMessage:any = null, data: any = {};
        
        if(!(await accessRulesByRoleHierarchyUuid(this.context, { companyUuid: input.companyUuid }))) {
            return this.formatErrors([GlobalError.NOT_ALLOWED], "Permission denied");
        }

        data.tableSession = await this.repository.findOne({
            where: { uuid: input.tableSessionUuid, status: TableSessionStatus.ACTIVE },
            relations: ['customer', 'table', 'table.category']
        });
        if (!data.tableSession) {
            return this.formatErrors([GlobalError.RECORD_NOT_FOUND], "Table session not found");
        }

        data.categoryPrice = await this.context.categoryPrice.repository.findOne({
            where: { uuid: input.categoryPriceUuid }
        });
        if (!data.categoryPrice) {
            return this.formatErrors([GlobalError.RECORD_NOT_FOUND], "Category price not found");
        }

        // Check if session has expired (startTime is more than 0 minutes ago and not negative)
        const currentTime = moment();
        const startTime = moment(data.tableSession.startTime);
        const durationSeconds = startTime.diff(currentTime, 'seconds');
        
        if (durationSeconds <= 0) {
            return this.formatErrors([GlobalError.INVALID_INPUT], "Session expired");
        }

        return { data, errors, errorMessage }
    }

    async rechargeSession(input: RechargeTableSessionInput) {
        const { data, errors, errorMessage }  = await this.rechargeSessionValidate(input);
        if (!isEmpty(errors)) {
            return this.formatErrors(errors, errorMessage);
        }

        const { categoryPrice } = data;

        try {
            const session = data.tableSession
            const duration = categoryPrice.duration
            let startTime:any = moment(session.startTime).add(duration, categoryPrice.unit)
            
            if(categoryPrice.freeMins) {
                startTime.add(categoryPrice.freeMins, 'minutes')
            }
            startTime = startTime.toDate();
            
            const transaction = await this.connection.manager.transaction(async (transactionalEntityManager: any) => {

                session.unit = categoryPrice.unit
                session.duration = categoryPrice.duration
                session.startTime = startTime
                
                await transactionalEntityManager.save(session);

                const rechargePersonCount = session.personCount || 1;
                const rechargeAmount = Number(categoryPrice.price) * rechargePersonCount;

                const payment = await this.context.payment.createPayment(transactionalEntityManager, {
                    customerId: data.tableSession.customer.id,
                    tableSessionId: session.id,
                    amount: rechargeAmount,
                    method: input.paymentMethod.paymentScheme,
                    status: PaymentStatus.SUCCESS,
                    calculateTax: true,
                    personCount: rechargePersonCount,
                });

                if (!payment || !payment.status) {
                    throw new Error('Payment processing failed');
                }

                return session;
            });   
    
            if (transaction && transaction.error && transaction.error.length > 0) {
                console.log('transaction.error: ', transaction.error);
                return this.formatErrors([GlobalError.EXCEPTION], transaction.error);
            }

            return this.successResponse(transaction);
        }catch (error: any) {
            console.log('error: ', error);
            return this.formatErrors([GlobalError.INTERNAL_SERVER_ERROR], error.message);
        }
    }

    async markCompleted(input: MarkCompletedInput) {
        try {
            // Find table session with customer and table relations
            const session = await this.repository.findOne({
                where: { uuid: input.tableSessionUuid },
                relations: ['customer', 'table']
            });

            if (!session) {
                return this.formatErrors([GlobalError.RECORD_NOT_FOUND], 'Table session not found');
            }

            // Verify company access using role hierarchy (using customer's companyId from the session)
            if (!(await accessRulesByRoleHierarchy(this.context, { companyId: session.customer.companyId }))) {
                return this.formatErrors([GlobalError.NOT_ALLOWED], 'Permission denied');
            }

            if (session.status !== TableSessionStatus.ACTIVE) {
                return this.formatErrors([GlobalError.INVALID_INPUT], 'Session is not active');
            }
            
            const result = await this.connection.manager.transaction(async (transactionalEntityManager: any) => {
                session.endTime = new Date();
                session.status = TableSessionStatus.COMPLETED;
                const updatedSession = await transactionalEntityManager.save(session);

                session.table.status = TableStatus.ACTIVE;
                await transactionalEntityManager.save(session.table);
                return updatedSession;
            });

            if (result && result.error && result.error.length > 0) {
                console.log('transaction.error: ', result.error);
                return this.formatErrors([GlobalError.EXCEPTION], result.error)
            }

            return this.successResponse(result);
        } catch (error: any) {
            return this.formatErrors([GlobalError.INTERNAL_SERVER_ERROR], error.message);
        }
    }

    async stopSession(input: StopTableSessionInput) {
        try {
            const session = await this.repository.findOne({
                where: { uuid: input.tableSessionUuid },
                relations: ['customer', 'table']
            });

            if (!session) {
                return this.formatErrors(GlobalError.RECORD_NOT_FOUND, 'Table session not found');
            }

            if (session.status !== TableSessionStatus.ACTIVE) {
                return this.formatErrors(GlobalError.INVALID_INPUT, 'Session is not active');
            }

            const transaction = await this.connection.manager.transaction(async (transactionalEntityManager: any) => {
                session.status = TableSessionStatus.CANCELLED;
                const updatedSession = await transactionalEntityManager.save(session);

                session.table.status = TableStatus.ACTIVE;
                await transactionalEntityManager.save(session.table);

                return updatedSession;
            });

            if (transaction && transaction.error && transaction.error.length > 0) {
                console.log('transaction.error: ', transaction.error);
                return this.formatErrors([GlobalError.EXCEPTION], transaction.error)
            }

            return this.successResponse(transaction);
        } catch (error: any) {
            return this.formatErrors(GlobalError.INTERNAL_SERVER_ERROR, error.message);
        }
    }
}
