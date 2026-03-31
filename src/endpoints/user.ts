import {NextFunction, Request, Response} from 'express'
import connection from "../ormconfig";
import { User as UserEntity } from "../database/entity/User";
import { compare } from "bcrypt";
import { sign, verify, decode } from "jsonwebtoken";
import {jwtConfig, ROLES, TEMP_DIR_PATH} from "../shared/config";
import ShortUniqueId from "short-unique-id";
import RedisClient from "../database/redis";
import {AuthenticationError} from "apollo-server-express";
import {MulterError} from "multer";
import {_deleteFile} from "../shared/lib/util";
import {Roles, Status} from "../database/entity/root/enums";
import schema from "../shared/directives/loadSchema";
import Context from '../schema/context';

export const userLogin = async (req:Request, res:Response) => {
    try{
        const { email, password } = req.body;
        if(!email || !password ) {
            return res.send({ status: false, message: 'Credentials required.' })
        }

        /**
         * Fetch users along with its associations.
         * */
        const user:UserEntity | null = await connection.getRepository(UserEntity).findOne({
            relations: ['role'],
            where: { email }
        })
        if(!user){
            return res.send({ status: false, message: 'User does not exist.' })
        }
        if(user.status !== Status.ACTIVE){
            return res.send({ status: false, message: 'Account deactivated.' })
        }

        /**
         * Match password with hashed password
         * */
        const match = await compare(password, user.password);
        if(!match){
            return res.send({ status: false, message: 'Incorrect email or password.' })
        }

        /**
         * Prepare payload and sign jwt for 10hrs lifetime.
         * */
        const key = (new ShortUniqueId({ length: 8 })).rnd()
        const payload = {
            uuid:user.uuid,
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName,
            companyUuid: user.role.name === ROLES.ADMIN.NAME ? '' : user.companyUuid,  
            role: { uuid: user.role.uuid, name: user.role.name },
            key, // country
        }
        const token = sign({uuid: user.uuid, key}, jwtConfig.jwtSecretKey ,{ expiresIn: jwtConfig.accessTokenTTL })
        const refreshToken = sign({id: user.id, key}, jwtConfig.jwtSecretKey ,{ expiresIn: jwtConfig.refreshTokenTTL })
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: jwtConfig.refreshTokenCookieExpiry });
        res.send({ token, status: true, message: 'Logged in successfully!', user: payload })
    }catch (e) {
        console.log(e)
        return res.status(500).send({ status: false, message: 'Internal server error' })
    }
}

export const refreshToken = async (req:Request, res:Response) => {
    const authorization = req.header('Authorization');
    let user:any
    if(authorization){
        try{
            const token = authorization.replace('Bearer ', '')
            user = decode(token)
            if(user.key){
                const value = await RedisClient.get('token:'+user.key)
                if(value === token){
                    throw new AuthenticationError('Token blacklisted.');
                }
            }
        }catch (e:any) {
            return res.status(401).send({ status: false, message: e.message });
        }
    }else{
        return res.status(401).send({ status: false, message: 'Token is required' });
    }

    user = await connection.getRepository(UserEntity).findOne({
        where: { id:user.id }
    })

    if(user.status !== Status.ACTIVE) {
        return res.status(401).send({ status: false, message: 'Account deactivated.' });
    }

    try {
        const decoded:any = verify(req.cookies.refreshToken, jwtConfig.jwtSecretKey);
        delete decoded.iat
        delete decoded.exp
        const token = sign(decoded, jwtConfig.jwtSecretKey ,{ expiresIn: jwtConfig.accessTokenTTL })
        return res.send({ token, status: true, message: 'Token refreshed successfully!' })
    } catch (error) {
        console.log(error)
        return res.status(401).send({ status: false, message: 'Invalid token' });
    }
}

export const userLogout = async (req:Request, res:Response) => {
    try {
        const authorization:any = req.header('Authorization');
        if(authorization){
            const token = authorization.replace('Bearer ', '')
            const decoded:any = decode(token)
            if(decoded.id){
                await RedisClient.set('token:'+decoded.key,token,{ex: jwtConfig.refreshTokenTTL})
            }
        }
        res.clearCookie("refreshToken");
        res.send({ status: true, message: 'Logged out successfully!' })
    } catch (error) {
        console.log(error)
        return res.status(401).send({ status: false, message: 'Invalid token' });
    }
}

export const uploadImageHandler = async (req:any, res:Response) => {
    res.send({
        status: true,
        file_uploaded: req.file_uploaded || null,
        message: "Uploaded Successfully!",
    });
}

export const handleFileUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof MulterError) {
        let message = err.message || "Multer error occurred."
        if(err.code === 'LIMIT_FILE_SIZE'){
            message = 'File size must not exceed 1MB'
        }else if(err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Only .png, .jpg allowed.'
        }
        return res.status(200).json({
            status: false,
            message,
        });
    } else if (err) {
        return res.status(200).json({
            status: false,
            message: err.message || "An error occurred during file upload.",
        });
    }
    next();
};

export const deleteFile = async (req:Request, res:Response) => {
    if(!req.body.filename){
        return res.status(200).json({
            status: false,
            message: 'Filename is required.',
        });
    }
    const response = await _deleteFile(TEMP_DIR_PATH+'/'+req.body.filename)
    return res.status(200).json(response)
}

export const userPermissions = async (req:Request, res:Response) => {
    const role:any = req.user.role
    if(role.name === Roles.ADMIN){
        res.send({ status: true, message: 'Data fetched successfully!', data: ['*'] })
        return
    }

    const ctx = Context.getInstance(connection,schema,req,req.user)
    const permissions = await ctx.user.userPermissions(ctx.auth.role)

    res.send({ status: true, message: 'Data fetched successfully!', data: permissions })
}
