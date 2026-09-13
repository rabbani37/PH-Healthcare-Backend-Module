import { NextFunction, Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { sendResponse } from "../../utils/sendResponse"
import httpStatus from "http-status"
import { DoctorServices } from "./doctor.service"
import { validationRequest } from "../../middleware/validationRequest"
import { ApplicationDoctorZodSchema } from "./doctor.validation"


const applyAsDoctor = catchAsync(async (req: Request, res: Response) => {



    const files = req.files as { [fieldname: string]: Express.Multer.File[] | undefined }
    const resume = files?.['resume']?.[0] || null
    const additionalFiles = files?.['additionalFiles'] || []



    const payload = JSON.parse(req.body.data)

    const zodValidationResult = ApplicationDoctorZodSchema.safeParse(payload)

    if (!zodValidationResult.success) {
        throw new Error(zodValidationResult.error.issues[0].message)
    }

    const payloadData = zodValidationResult
    const result = await DoctorServices.applyAsDoctor(payload, resume, additionalFiles)

    console.log(payloadData);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Applied as a doctor successfully",
        data: result
    })
})


const verifyDoctorEmail = catchAsync(async (req: Request, res: Response) => {

    const payload = req.body
    const result = await DoctorServices.verifyDoctorEmail(payload)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Doctor email verified successfully",
        data: result
    })
})



const approvedDoctor = catchAsync(async (req: Request, res: Response) => {

    const payload = req.body
    const reviewer = req.user!
    const result = await DoctorServices.approvedDoctor(payload, reviewer)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Doctor Approved successfully",
        data: result
    })
})
const getAllDoctors = catchAsync(async (req: Request, res: Response) => {

    const query = req.query

    const result = await DoctorServices.getAllDoctors(query)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Doctors Retrives successfully",
        data: result,

    })
})















export const DoctorController = {
    applyAsDoctor,
    verifyDoctorEmail,
    approvedDoctor,
    getAllDoctors
}