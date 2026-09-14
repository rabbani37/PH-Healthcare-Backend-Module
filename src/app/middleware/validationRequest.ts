import z from "zod";
import { catchAsync } from "../utils/catchAsync";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";


export const validationRequest = (schemaZod: z.ZodObject) => {

    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const payload = req.body ?? {}

        const result = schemaZod.safeParse(payload);

        if (!result.success) {
        throw    new AppError(500, result.error.issues[0].message)
        }
        req.body = result.data
        next()
    })
}

