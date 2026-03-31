import BaseModel from '../baseModel';
import { Customer as CustomerEntity } from '../../database/entity/Customer';
import { CustomerInput, CustomerFilter } from './types';
import Context from "../context";
import { GlobalError } from "../root/enum";
import { isEmpty } from "lodash";
import { PagingInterface } from "../../interfaces";
import { Brackets } from 'typeorm';
import { addQueryBuilderFiltersByUuid, accessRulesByRoleHierarchyUuid, addQueryBuilderFilters } from '../../shared/lib/DataRoleUtils';
import { NotificationHooks } from '../../services/notificationHooks';

export default class Customer extends BaseModel {
    repository: any;
    connection: any;
    loaders: any;

    constructor(connection: any, context: Context) {
        super(connection, connection.getRepository(CustomerEntity), context);
    }

    async index(paging: PagingInterface, params: CustomerFilter) {
        const _query = this.repository.createQueryBuilder('c');
        const { query }:any = addQueryBuilderFilters(this.context, _query, params);

        // Remove leading zeros from search text for phone number searches
        const searchText = params?.searchText?.replace(/^0+/, '');
        if (!isEmpty(params?.searchText)) {
            query.andWhere(new Brackets((qb:any) => {
                qb.where("(concat(c.phone_code, c.phone_number) ILIKE :searchText)")
                    .orWhere("(concat(c.first_name, ' ', c.last_name) ILIKE :searchText)");
            }), {
                searchText: `%${searchText}%`
            });
        }
        // .setParameters(params)
        query.orderBy('c.id', 'DESC');

        return await this.paginator(query, paging);
    }

    async show(uuid: string) {
        try {
            const data = await this.repository.findOne({
                where: { uuid }
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

    async saveValidate(input: CustomerInput) {
        let errors: any = [], errorMessage = null, data: any = {};

        if (this.context.auth) {
            if (!(await accessRulesByRoleHierarchyUuid(this.context, { companyUuid: input.companyUuid }))) {
                return this.formatErrors([GlobalError.NOT_ALLOWED], 'Permission denied');
            }
        }

        data.company = await this.context.company.repository.findOne({ where: { uuid: input.companyUuid } });
        if (!data.company) {
            return this.formatErrors([GlobalError.RECORD_NOT_FOUND], 'Company not found');
        }

        if (input.uuid) {
            data.existingEntity = await this.repository.findOne({ where: { uuid: input.uuid } });
            if (!data.existingEntity) {
                return this.formatErrors([GlobalError.RECORD_NOT_FOUND], 'Customer not found');
            }
        }

        if (errors.length > 0) {
            return {
                data: null,
                status: false,
                errors,
                errorMessage
            };
        }

        return { data, errors, errorMessage };
    }

    async save(input: CustomerInput) {
        const { data, errors, errorMessage } = await this.saveValidate(input);
        if (!isEmpty(errors)) {
            return this.formatErrors(errors, errorMessage);
        }

        try {
            const isNewCustomer = !data.existingEntity;
            const customer: CustomerEntity = data.existingEntity || new CustomerEntity();
            customer.firstName = input.firstName;
            customer.lastName = input.lastName;
            customer.phoneCode = input.phoneCode;
            customer.phoneNumber = input.phoneNumber;
            customer.companyId = data.company.id;
            customer.dob = input.dob ? new Date(`${input.dob}T00:00:00`) : null;

            const savedCustomer = await this.repository.save(customer);

            // Send welcome notification for new customers
            if (isNewCustomer && savedCustomer.phoneNumber) {
                try {
                    await NotificationHooks.onCustomerRegistered(savedCustomer);
                } catch (notificationError) {
                    console.error('Failed to send registration notification:', notificationError);
                    // Don't fail the registration if notification fails
                }
            }

            return this.successResponse(savedCustomer);
        } catch (error: any) {
            return this.formatErrors([GlobalError.INTERNAL_SERVER_ERROR], error.message);
        }
    }

    // Public (unauthenticated) registration. Does not require the caller to be authenticated,
    // but still ties the customer to an existing company.
    async register(input: CustomerInput) {
        try {
            const response: any = await this.save(input);

            if (
                response?.status &&
                response?.data?.uuid &&
                input.deviceToken &&
                input.deviceType
            ) {
                try {
                    await this.context.customerDevice.save({
                        customerUuid: response.data.uuid,
                        deviceToken: input.deviceToken,
                        deviceType: input.deviceType,
                        fcmToken: input.fcmToken || undefined
                    });
                } catch (deviceError) {
                    console.error('Failed to save customer device during registration:', deviceError);
                }
            }

            return response;
        } catch (error: any) {
            return this.formatErrors([GlobalError.INTERNAL_SERVER_ERROR], error.message);
        }
    }

    async delete(uuid: string) {
        try {
            const customer = await this.repository.findOne({ where: { uuid } });
            if (!customer) {
                return {
                    status: false,
                    errors: [GlobalError.RECORD_NOT_FOUND],
                    errorMessage: 'Customer not found'
                };
            }

            await this.repository.remove(customer);

            return {
                status: true,
                errors: null,
                errorMessage: null
            };
        } catch (error: any) {
            return {
                status: false,
                errors: [GlobalError.INTERNAL_SERVER_ERROR],
                errorMessage: error.message
            };
        }
    }
}
