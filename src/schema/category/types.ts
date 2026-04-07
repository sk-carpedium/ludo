export interface CategoryPriceInput {
    price: number
    unit: CategoryPriceUnit
    freeMins?: number
    duration: number
    currencyName?: string
}

export interface CategoryInput {
    uuid?: string
    companyUuid: string
    name: string
    hourlyRate?: number
    currencyName?: string
    enablePersonCount?: boolean
    categoryPrices?: CategoryPriceInput[]
}

export interface CategoryFilter {
    companyUuid: string
    searchText?: string
}

export enum CategoryPriceUnit {
    MINUTES = 'minutes',
    HOURS = 'hours',
}