import { Router } from "express";
import { AppoinmentController } from "./appoinment.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";




const router = Router();


router.post("/book-appoinment", auth(Role.PATIENT), AppoinmentController.bookAppoinment)
router.post("/pay-appoinment", auth(Role.PATIENT), AppoinmentController.payAppoinment)

router.get("/book-appoinment/payment/callback", AppoinmentController.bookAppoinmentCallback)





export const AppoinmentRoutes = router