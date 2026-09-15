import { Router } from "express";
import { SheduleController } from "./shedule.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validationRequest } from "../../middleware/validationRequest";
import { createSheduleZodSchema, updateSheduleZodSchema } from "./shedule.validation";



const router = Router();


router.post("/create-shedule",
    auth(Role.DOCTOR),
    validationRequest(createSheduleZodSchema),
    SheduleController.createShedule);

router.get("/my-shedules",
    auth(Role.DOCTOR),
    SheduleController.getMyShedules)

router.get("/all-shedules",
    auth(Role.DOCTOR),
    SheduleController.getAllShedule);

router.get("/all-shedules/:sheduleId",
    auth(Role.DOCTOR),
    SheduleController.getSeduleById);

router.get("/today-shedules",
    auth(Role.PATIENT),
    SheduleController.getToDaysShedule);

router.patch("/update-shedule/:sheduleId",
    auth(Role.DOCTOR),
    validationRequest(updateSheduleZodSchema),
    SheduleController.updateShedule);

router.patch("/publish-shedule/:sheduleId",
    auth(Role.DOCTOR),
    SheduleController.updateShedule);

router.delete("/delete-shedules/:sheduleId",
    auth(Role.DOCTOR),
    SheduleController.deleteShedule);







export const SheduleRouter = router;