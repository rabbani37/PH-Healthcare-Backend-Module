import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status"
import { AppoinmentService } from "./appoinment.service";



const bookAppoinment = catchAsync(async (req: Request, res: Response) => {

    const payload = req.body;
    const user = req.user!
    const result = await AppoinmentService.bookAppoinment(payload, user)

    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Create an appoinment successfully",
        data: result
    });
});



const bookAppoinmentCallback = catchAsync(async (req: Request, res: Response) => {

    const query = req.query;

    const { redirectUrl } = await AppoinmentService.bookAppoinmentCallback(query)
    res.redirect(redirectUrl)
});





export const AppoinmentController = {
    bookAppoinment,
    bookAppoinmentCallback
}