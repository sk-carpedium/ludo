export interface CustomerInput {
    uuid?: string
    firstName: string
    lastName: string
    phoneCode?: string
    phoneNumber?: string
    companyUuid: string
    dob?: string | null
    deviceToken?: string
    fcmToken?: string | null
    deviceType?: string
}

export interface CustomerFilter {
    searchText?: string
    companyUuid: string
}
