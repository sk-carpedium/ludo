import BaseModel from '../baseModel';
import { TournamentPlayer as TournamentPlayerEntity } from '../../database/entity/TournamentPlayer';
import { Customer as CustomerEntity } from '../../database/entity/Customer';
import Context from '../context';
import { GlobalError, PaymentStatus } from '../root/enum';
import { accessRulesByRoleHierarchy } from '../../shared/lib/DataRoleUtils';
import { Status } from '../../database/entity/root/enums';
import { PaymentMethodInput } from '../payment/types';
import { Brackets } from 'typeorm';
import { PagingInterface } from '../../interfaces';
import whatsappQueue from '../../lib/whatsappQueue';

export default class TournamentPlayer extends BaseModel {
    repository: any;
    connection: any;
    loaders: any;
    customerRepository: any;

    constructor(connection: any, context: Context) {
        super(connection, connection.getRepository(TournamentPlayerEntity), context);
        this.customerRepository = connection.getRepository(CustomerEntity);
    }

    async index(params: { tournamentUuid: string }) {
        try {
            const tournament = await this.context.tournament.repository.findOne({
                where: { uuid: params.tournamentUuid },
                relations: ['company'],
            });

            if (!tournament) {
                return this.formatErrors([GlobalError.RECORD_NOT_FOUND], 'Tournament not found');
            }

            if (!(await accessRulesByRoleHierarchy(this.context, { companyId: tournament.companyId }))) {
                return this.formatErrors([GlobalError.NOT_ALLOWED], 'Permission denied');
            }

            const tournamentPlayers = await this.repository.find({
                where: { tournamentId: tournament.id },
                relations: ['customer'],
            });

            return {
                status: true,
                list: tournamentPlayers,
                errors: null,
                errorMessage: null,
            };
        } catch (error: any) {
            return this.formatErrors([GlobalError.INTERNAL_SERVER_ERROR], error.message);
        }
    }


    async playerRegistrationBill(params: { customerUuid: string, tournamentUuid: string }) {
        const { customerUuid, tournamentUuid } = params;

        try {
            const customer = await this.context.customer.repository.findOne({
                where: { uuid: customerUuid },
            });

            if (!customer) {
                return this.formatErrors([GlobalError.RECORD_NOT_FOUND], 'Customer not found');
            }

            const tournament = await this.context.tournament.repository.findOne({
                where: { uuid: tournamentUuid },
                relations: ['company'],
            });

            if (!tournament) {
                return this.formatErrors([GlobalError.RECORD_NOT_FOUND], 'Tournament not found');
            }
            
            if (!(await accessRulesByRoleHierarchy(this.context, { companyId: tournament.companyId }))) {
                return this.formatErrors([GlobalError.NOT_ALLOWED], 'Permission denied');
            }

            const existingRegistration = await this.repository.findOne({
                where: {
                    tournamentId: tournament.id,
                    customerId: customer.id,
                },
            });

            if(existingRegistration) {
                return this.formatErrors([GlobalError.ALREADY_EXISTS], 'Player already registered.');
            }

            const to = `${customer.phoneCode || ''}${customer.phoneNumber || ''}`.replace(/\D/g, '');
            const text = `Registration confirmed for ${tournament.name} on ${tournament.date} at ${tournament.startTime}. See you there!`;
            console.log('WhatsApp message:', text);
            if (to) {
                try { await whatsappQueue.add({ to, text }); } catch (_) {}
            }
            return this.successResponse(tournament);
        } catch (error: any) {
            return this.formatErrors([GlobalError.INTERNAL_SERVER_ERROR], error.message);
        }
    }

    async playerRegistration(input: { customerUuid: string, tournamentUuid: string, paymentMethod: PaymentMethodInput }) {
        const { customerUuid, tournamentUuid, paymentMethod } = input;
        try {
            // Validate customer exists
            const customer = await this.context.customer.repository.findOne({
                where: { uuid: customerUuid },
            });

            if (!customer) {
                return this.formatErrors([GlobalError.RECORD_NOT_FOUND], 'Customer not found');
            }

            // Validate tournament exists
            const tournament = await this.context.tournament.repository.findOne({
                where: { uuid: tournamentUuid },
                relations: ['company'],
            });

            if (!tournament) {
                return this.formatErrors([GlobalError.RECORD_NOT_FOUND], 'Tournament not found');
            }

            // Check access permissions
            if (!(await accessRulesByRoleHierarchy(this.context, { companyId: tournament.companyId }))) {
                return this.formatErrors([GlobalError.NOT_ALLOWED], 'Permission denied');
            }

            // Check if customer is already registered
            const existingRegistration = await this.repository.findOne({
                where: {
                    tournamentId: tournament.id,
                    customerId: customer.id,
                },
            });

            if (existingRegistration) {
                return this.formatErrors([GlobalError.ALREADY_EXISTS], 'Player already registered');
            }

            // Check if tournament has reached player limit
            if (tournament.playerCount >= tournament.playerLimit) {
                return this.formatErrors([GlobalError.VALIDATION_ERROR], 'Tournament has reached maximum player limit');
            }

            // Use transaction to ensure atomicity
            const result = await this.connection.manager.transaction(async (transactionalEntityManager: any) => {
                // Create TournamentPlayer record
                const tournamentPlayer = transactionalEntityManager.create(TournamentPlayerEntity, {
                    tournamentId: tournament.id,
                    customerId: customer.id
                });

                const savedTournamentPlayer = await transactionalEntityManager.save(tournamentPlayer);

                // Create payment record for tournament entry fee
                // Convert PaymentScheme to PaymentMethod (they have same enum values)
                const paymentMethodEnum = paymentMethod.paymentScheme as any;
                const paymentResult = await this.context.payment.createPayment(transactionalEntityManager, {
                    customerId: customer.id,
                    tournamentId: tournament.id,
                    amount: tournament.entryFee,
                    method: paymentMethodEnum,
                    status: PaymentStatus.SUCCESS,
                    calculateTax: true, 
                } as any);

                if (!paymentResult || !paymentResult.status) {
                    throw new Error('Payment processing failed');
                }

                // Increment tournament playerCount
                tournament.playerCount = (tournament.playerCount || 0) + 1;
                tournament.lastUpdatedById = this.context.auth.id;
                await transactionalEntityManager.save(tournament);

                return savedTournamentPlayer;
            });

            return this.successResponse(tournament);
        } catch (error: any) {
            console.error('Player registration error:', error);
            return this.formatErrors([GlobalError.INTERNAL_SERVER_ERROR], error.message);
        }
    }

    async unregisteredCustomers(params: { tournamentUuid: string; searchText?: string; paging?: PagingInterface }) {
        const { tournamentUuid, searchText, paging } = params;

        try {
            const tournament = await this.context.tournament.repository.findOne({
                where: { uuid: tournamentUuid },
                relations: ['company'],
            });

            if (!tournament) {
                return this.formatErrors([GlobalError.RECORD_NOT_FOUND], 'Tournament not found');
            }

            if (!(await accessRulesByRoleHierarchy(this.context, { companyId: tournament.companyId }))) {
                return this.formatErrors([GlobalError.NOT_ALLOWED], 'Permission denied');
            }

            const query = this.customerRepository
                .createQueryBuilder('c')
                .leftJoin(
                    TournamentPlayerEntity,
                    'tp',
                    'tp.customer_id = c.id AND tp.tournament_id = :tournamentId',
                    { tournamentId: tournament.id },
                )
                .where('tp.id IS NULL')
                .andWhere('c.company_id = :companyId', { companyId: tournament.companyId });

            if (searchText && searchText.trim()) {
                const sanitizedSearch = searchText.replace(/^0+/, '');
                query.andWhere(
                    new Brackets((qb) => {
                        qb.where("concat(c.phone_code, c.phone_number) ILIKE :searchText").orWhere(
                            "(concat(c.first_name, ' ', c.last_name) ILIKE :searchText)",
                        );
                    }),
                    { searchText: `%${sanitizedSearch}%` },
                );
            }

            const pagingInput: PagingInterface = paging
                ? { ...paging }
                : { page: 1, limit: 10 };

            const { list, paging: pagination } = await this.paginator(query, pagingInput);

            return {
                status: true,
                list,
                paging: pagination,
                errors: null,
                errorMessage: null,
            };
        } catch (error: any) {
            return this.formatErrors([GlobalError.INTERNAL_SERVER_ERROR], error.message);
        }
    }
}
