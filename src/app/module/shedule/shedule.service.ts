import status from "http-status";
import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/AppError";
import { IRequestUser } from "../auth/auth.interface"
import { IShedule } from "./shedule.interface"
import { addDays, differenceInMinutes, startOfDay } from "date-fns";





const createShedule = async (payload: IShedule, user: IRequestUser) => {

    const doctor = await prisma.doctor.findUnique({
        where: {
            userId: user.userId
        }
    });

    if (!doctor) {
        throw new AppError(status.NOT_FOUND, "Doctor Not Found")
    }


    const startOfTheDay = startOfDay(payload.startDateTime)
    const startOfNextDay = addDays(startOfTheDay, 1);

    const isExsistSheduleOnThisData = await prisma.shedule.findFirst({
        where: {
            doctorId: doctor.id,
            isDeleted: false,
            startDateTime: {
                gte: startOfTheDay,
                lte: startOfNextDay
            }
        }
    })

    if (isExsistSheduleOnThisData) {
        throw new AppError(status.CONFLICT, "You Already Have A Shedul For This Date")
    }


    const durationInMinutes = differenceInMinutes(payload.startDateTime, payload.endDateTime)

    const MINUTES_ALOCATED_PER_SLOT = 20
    const totalSlots = Math.floor(durationInMinutes / MINUTES_ALOCATED_PER_SLOT)


    const shedule = await prisma.shedule.create({
        data: {
            startDateTime: payload.startDateTime,
            endDateTime: payload.endDateTime,
            meetingLink: payload.meetingLink,
            totalSlots,
            availableSlots: totalSlots,
            doctorId: doctor.id
        },
        include: {
            doctor: {
                select: { name: true, email: true, contactNumber: true }
            }
        }
    })

    return shedule;
}











export const SheduleService = {
    createShedule,

}