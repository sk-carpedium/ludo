import { config } from 'dotenv';
import querystring from "querystring";
import path from "path";
import {RoleNames, Roles} from "../database/entity/root/enums";
config();

export enum NODE_ENV {
    local = 'local',
    prod = 'prod',
    dev = 'dev',
    stg = 'stg',
}

export const DEV_BASE_URL = 'https://dev-api.cloudfitnest.com'
export const PROD_BASE_URL = 'https://api.cloudfitnest.com'
export const basePath = getBasePath();
export const adminPlatformUrl = process.env.ADMIN_PLATFORM_URL || 'https://app.cloudfitnest.com';
export const nodeEnv = process.env.NODE_ENV || NODE_ENV.local;
export const serviceName = process.env.SERVICE_NAME || 'vendors';
export const superAdmin = 'super admin';
export const brandAdmin = 'brand admin';
export const gymAdmin = 'gym admin';
export const disableAuthAccess = Boolean(process.env.DISABLE_AUTH_ACCESS) && process.env.DISABLE_AUTH_ACCESS === 'true' && false;
export const disableGraphqlIntrospection = process.env.DISABLE_INTROSPECTION === 'true';
export const authProfile = process.env.AUTH_PROFILE || 'super admin';
export const allowFilterPerRole = true;
export const TEMP_DIR_PATH = path.resolve(__dirname,'../../temp');
export const UPLOAD_DIR_PATH = path.resolve(__dirname,'../../uploads');
export const OTP_EXPIRY_IN_MINS = 5
export const APP_LOGO = 'https://cloudfitnest.s3.ap-south-1.amazonaws.com/cloudfitnest.PNG'
export const GUPSHUP_API_URL = process.env.GUPSHUP_API_URL || 'https://api.gupshup.io/wa/api/v1'
export const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY || ''
export const GUPSHUP_APP_NAME = process.env.GUPSHUP_APP_NAME || ''
export const GUPSHUP_SOURCE = process.env.GUPSHUP_SOURCE || ''
export const FACEBOOK_WA_API_BASE = process.env.FACEBOOK_WA_API_BASE || 'https://graph.facebook.com/v22.0'
export const FACEBOOK_WA_TOKEN = process.env.FACEBOOK_WA_TOKEN || ''
export const FACEBOOK_WA_PHONE_NUMBER_ID = process.env.FACEBOOK_WA_PHONE_NUMBER_ID || ''
export const FACEBOOK_WA_VERIFY_TOKEN = process.env.FACEBOOK_WA_VERIFY_TOKEN || ''
export const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || ''
export const WEBHOOK_TYPE = {
    SUBSCRIPTION: 'SUBSCRIPTION'
}
export const UPLOAD_DIR:any = {
    GYMS: '/gyms/',
    BRANDS: '/brands/',
    INSTRUCTORS: '/instructors/',
};

export const jwtConfig = {
    jwtSecretKey: process.env.JWT_SECRET_KEY || 'avQ3KLU76D4jM97Rea1Aokj61Kjs9N6OkqZxMnv41',
    accessTokenTTL: 3600*8, // 1 hour
    refreshTokenTTL: 3600 * 24 * 30, // 30days
    refreshTokenCookieExpiry: 3600000*24*30, // 30 days (In milliseconds)
}

export const redis = {
    enable: process.env.REDIS_ENABLE === 'true',
    defaultLongExpiryTimeInSec: 86400 * 2, // 86400 = a day
    defaultMediumExpiryTimeInSec: 3600, // 3600 = 1 hour
    defaultShortExpiryTimeInSec: 300, // 300 = 5 min
    connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
    },
}

export const cronConfig = {
    freezeFrequency: "* * * * *",
    generalFrequency: "* * * * *",
};

export const platformAdminConfig = {
    name: process.env.PLATFORM_ADMIN_NAME || 'CloudFitnest',
    email: process.env.PLATFORM_ADMIN_EMAIL || 'support@cloudfitnest.com',
    password: process.env.PLATFORM_ADMIN_PASSWORD || '123456',
}
export const passwordResetJwtSecret = process.env.JWTSECRETKEY;
export const frontendApplicationUrl = process.env.ADMIN_PLATFORM_URL;

export const orderConfig = {
    receiptUrl: 'www.cloudfitnest.app/receipt',
    errorUrl: 'www.cloudfitnest.app/error',
};

export function getFakeAuth() {
    const auth:any = {
        admin: true,
    }
    switch (authProfile) {
        case Roles.ADMIN:
            auth.id = SEED_USERS.ADMIN.ID
            auth.role = Roles.ADMIN;
            break
        case Roles.EMPLOYEE:
            auth.id = SEED_USERS.EMPLOYEE.ID
            auth.role = Roles.EMPLOYEE;
            break
        default:
            auth.role = {};
            auth.adminId = null;
    }
    return auth
}

export const buildAbsoluteUrl = (relativePath = '/', params = {}): string => {
    const _relativePath = relativePath.charAt(0) === '/' ? relativePath : `/${relativePath}`;
    let absoluteUrl = `${basePath}${_relativePath}`;
    if (Object.keys(params).length > 0) {
        absoluteUrl += `?${querystring.stringify(params)}`;
    }
    return absoluteUrl;
};

export const tapConfig = {
    callbackBaseUrl: buildAbsoluteUrl(`/orders/tap`),
    redirectUrl: adminPlatformUrl+'/payment-callback',
    apiUrl: process.env.TAP_PAYMENT_API_URL || '',
};

export const SEED_USERS = {
    ADMIN: { ID: 1, NAME: 'Admin User' },
    EMPLOYEE: { ID: 2, NAME: 'Employee User' },
}

export const ROLES = {
    ADMIN: { ID: 1, NAME: Roles.ADMIN, DISPLAY_NAME: RoleNames.ADMIN },
    EMPLOYEE: { ID: 2, NAME: Roles.EMPLOYEE, DISPLAY_NAME: RoleNames.EMPLOYEE },
}

export function getBasePath() {
    switch (process.env.NODE_ENV) {
        case NODE_ENV.prod:
            return PROD_BASE_URL
        case NODE_ENV.dev:
            return DEV_BASE_URL
        case NODE_ENV.local:
            return process.env.NODE_HOST
        default:
            return ''
    }
}