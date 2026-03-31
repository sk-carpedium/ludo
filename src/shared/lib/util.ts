import crypto from 'crypto';
import moment from 'moment';
import bcrypt from 'bcrypt';
import { mapKeys, keys, snakeCase, isArray, map, camelCase } from 'lodash';
import assert from "assert";
import querystring from "querystring";
import {APP_LOGO, basePath, TEMP_DIR_PATH, UPLOAD_DIR_PATH} from "../config";
import {unlink,rename} from "fs";
import path from "path";
import connection from "../../ormconfig";
import Context from "../../schema/context";
import schema from "../directives/loadSchema";
import {SentMessageInfo} from "nodemailer";
import {SendEmailInput} from "../../interfaces";
import {renderFile} from 'ejs';

const saltSound = 15;

export const cryptoRandomString = (length: any) => {
    if (!Number.isFinite(length)) {
        throw new TypeError('Expected a finite number');
    }

    return crypto
        .randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);
};

export const createPasswordFromString = (string: string) => {
    return bcrypt.hashSync(string, saltSound);
};

function isOverlapping(format: string, start1: string, end1: string, start2: string, end2: string) {
    return moment(start1, format).isBefore(moment(end2, format)) && moment(start2, format).isBefore(moment(end1, format));
}

export const cloneObject = (object: any): any => JSON.parse(JSON.stringify(object));

export const isValidPassword = (password:string): boolean => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
    return regex.test(password);
}

export const transformToSnakeCase = (data: any) => {
    const snakeCaseObj = (obj: any) => {
        const dataWithSnakeCase = mapKeys(obj, (value: any, key: any) => snakeCase(key));
        keys(obj).forEach((key: string | number) => {
            delete obj[key];
        });

        keys(dataWithSnakeCase).forEach((key: string | number) => {
            obj[key] = dataWithSnakeCase[key];
        });

        return obj;
    };
    return isArray(data) ? map(data, snakeCaseObj) : snakeCaseObj(data);
};

export const transformToCamelCase = (data: {}[]): any[] => {
    assert(isArray(data), 'Must be an array of objects');
    data.forEach((obj: any): void => {
        const objWithCamelCase = mapKeys(obj, (value: any, key: string): {} => camelCase(key));

        Object.keys(obj).forEach((key: string): void => {
            delete obj[key];
        });

        Object.keys(objWithCamelCase).forEach((key: string): void => {
            obj[key] = objWithCamelCase[key];
        });
    });
    return data;
};

export const buildAbsoluteUrl = (relativePath = '/', params = {}): string => {
    const _relativePath = relativePath.charAt(0) === '/' ? relativePath : `/${relativePath}`;
    let absoluteUrl = `${basePath}${_relativePath}`;
    if (Object.keys(params).length > 0) {
        absoluteUrl += `?${querystring.stringify(params)}`;
    }
    return absoluteUrl;
};

export const cryptoKnownString = (str: any) => {
    return crypto.createHash('md5').update(str).digest('hex');
}

export const _deleteFile = (filepath:string):Promise<{status:boolean, message:string}> => {
    return new Promise((resolve) => {
        unlink(path.resolve(filepath),(err) => {
            if (err) {
                resolve({ status: false, message: err.code === 'ENOENT' ? 'File does not exist.' : err.message })
            } else {
                resolve({ status: true, message: 'File deleted successfully!' })
            }
        });
    })
}

export const moveTempFileToUploads = (filename:string,destination:string):Promise<{status:boolean, message:string}> => {
    return new Promise((resolve) => {
        rename(path.resolve(TEMP_DIR_PATH+'/'+filename),path.resolve(UPLOAD_DIR_PATH+'/'+destination),(err) => {
            if (err) {
                resolve({ status: false, message: err.code === 'ENOENT' ? 'File does not exist.' : err.message })
            } else {
                resolve({ status: true, message: 'File moved successfully!' })
            }
        });
    })
}

const renderEmail = async (input:SendEmailInput):Promise<string> => {
    const {subject, template, logo, data} = input
    const rootPath = path.join(__dirname, '..', '..'); // from shared/lib to src
    const body = await renderFile(
        path.join(rootPath, 'templates', 'emails', template+'.ejs'),
        data
    )
    return renderFile(
        path.join(rootPath, 'templates', 'layouts', 'main.ejs'),
        { ...data, subject, logo, body, appLogo: APP_LOGO }
    )
}

export const sendEmail = async (input:SendEmailInput):Promise<SentMessageInfo> => {
    const ctx = Context.getInstance(connection,schema)
    const {to, subject} = input
    const html = await renderEmail(input);
    return ctx.transporter.sendMail({
        from: process.env.APP_NAME+' <'+process.env.EMAIL_USER+'>',
        to, subject, html
    })
}