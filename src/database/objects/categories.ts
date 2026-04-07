import {Status} from "../entity/root/enums";

interface CategoryInput {
    regularCategoryId:number
    specialCategoryId:number
    premiumCategoryId:number
    companyId:number
}
export const categories = (input:CategoryInput) => [
        {
            id: input.regularCategoryId,
            name: 'Regular',
            hourlyRate: 500,
            currencyName: 'PKR',
            enablePersonCount: false,
            companyId: input.companyId
        },
        {
            id: input.specialCategoryId,
            name: 'Special',
            hourlyRate: 1000,
            currencyName: 'PKR',
            enablePersonCount: false,
            companyId: input.companyId
        },
        {
            id: input.premiumCategoryId,
            name: 'Premium',
            hourlyRate: 2000,
            currencyName: 'PKR',
            enablePersonCount: false,
            companyId: input.companyId
        },
]
