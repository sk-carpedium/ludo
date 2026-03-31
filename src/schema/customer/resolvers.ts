import Context from '../context';
import dayjs from 'dayjs';

export default {
    Query: {
        customer(root: any, { uuid }: any, context: Context) {
            return context.customer.show(uuid);
        },
        customers(root: any, { paging, params }: any, context: Context) {
            return context.customer.index(paging, params);
        }
    },

    Mutation: {
        saveCustomer(root: any, { input }: any, context: Context) {
            return context.customer.save(input);
        },
        registerCustomer(root: any, { input }: any, context: Context) {
            return context.customer.register(input);
        },
        deleteCustomer(root: any, { uuid }: any, context: Context) {
            return context.customer.delete(uuid);
        },
        saveCustomerDevice(root: any, { input }: any, context: Context) {
            return context.customerDevice.save(input);
        },
    },

    Customer: {
        fullName(customer: any) {
            return `${customer.firstName} ${customer.lastName}`.trim();
        },
        phone(customer: any) {
            if (customer.phoneCode && customer.phoneNumber) {
                return `${customer.phoneCode}${customer.phoneNumber}`;
            }
            return null;
        },
        dob(customer: any) {
            if (!customer.dob) return null;
            return dayjs(customer.dob).format('YYYY-MM-DD');
        }
    },
};