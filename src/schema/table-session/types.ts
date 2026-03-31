import { TableSessionStatus } from '../../database/entity/TableSession';
import { PaymentMethodInput } from "../payment/types";

export interface TableSessionInput {
    id?: string
    customerId: number
    tableId: number
    startTime?: string
    endTime?: string
    totalAmount?: number
    status?: TableSessionStatus
}

export interface StartTableSessionInput {
    companyUuid: string
    tableSessionUuid: string
}

export interface RechargeTableSessionInput {
    companyUuid: string
    tableSessionUuid: string
    categoryPriceUuid: string
    paymentMethod: PaymentMethodInput;
}

export interface MarkCompletedInput {
    tableSessionUuid: string
}

export interface StopTableSessionInput {
    tableSessionUuid: string
}

export interface TableSessionFilter {
    searchText?: string
    customerId?: number
    tableId?: number
    status?: TableSessionStatus
    dateFrom?: string
    dateTo?: string
}

export interface BookTableSessionInput {
    customerUuid: string;
    tableUuid: string;
    categoryPriceUuid: string;
    companyUuid: string;
    paymentMethod: PaymentMethodInput;
    personCount?: number;
}
