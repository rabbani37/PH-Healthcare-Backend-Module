import { Request, Response } from "express"
import { catchAsync } from "../../utils/catchAsync"
import { SheduleService } from "./shedule.service"
import { sendResponse } from "../../utils/sendResponse"
import httpStatus from "http-status"
import { da } from "zod/locales"


const createShedule = catchAsync(async (req: Request, res: Response) => {

    const user = req.user!
    const payload = req.body
    const result = await SheduleService.createShedule(payload, user)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Shedules created successfully",
        data: result,
    })
})


const getMyShedules = catchAsync(async (req: Request, res: Response) => {
    const user = req.user!
    const query = req.query
    const result = await SheduleService.getMyShedules(query, user)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "My shedules retrieved successfully",
        data: result,

    })
})
const getAllShedule = catchAsync(async (req: Request, res: Response) => {

    const query = req.query!
    
    const {meta,data} = await SheduleService.getAllShedule(query)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "All shedules retrieved successfully",
        data: data,
        meta: meta

    })
})
const getSeduleById = catchAsync(async (req: Request, res: Response) => {

    const sheduleId = req.body.sheduleId!

    const result = await SheduleService.getSeduleById(sheduleId)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Shedule retrieved successfully",
        data: result,

    })
})
const updateShedule = catchAsync(async (req: Request, res: Response) => {

    const user = req.user!
    const sheduleId = req.body.sheduleId!
    const payload = req.body
    const result = await SheduleService.updateShedule(sheduleId, payload, user)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Shedule updated successfully",
        data: result,

    })
})
const publishShedule = catchAsync(async (req: Request, res: Response) => {

    const  sheduleId = req.body.sheduleId!
    const user = req.user!
    const result = await SheduleService.publishShedule(sheduleId, user)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Shedule published successfully",
        data: result,

    })
})
const deleteShedule = catchAsync(async (req: Request, res: Response) => {

   const  sheduleId = req.body.sheduleId!
    const user = req.user!
    const result = await SheduleService.deleteShedule(sheduleId, user)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Shedule deleted successfully",
        data: result,

    })
})
const getToDaysShedule = catchAsync(async (req: Request, res: Response) => {

    const query = req.query!
    const {data, meta} = await SheduleService.getToDaysShedule(query)

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Today's shedules retrieved successfully",
        data:data,
        meta: meta

    })
})


export const SheduleController = {
    createShedule,
    getMyShedules,
    getAllShedule,
    getSeduleById,
    updateShedule,
    publishShedule,
    deleteShedule,
    getToDaysShedule
}