import status from "http-status";
import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/AppError";
import { IRequestUser } from "../auth/auth.interface"
import { IShedule, ISheduleUpdatePayload } from "./shedule.interface"
import { addDays, differenceInMinutes, isAfter, isSameDay, startOfDay } from "date-fns";
import { IQuery } from "../../interfaces";
import { SheduleWhereInput } from "../../../generated/prisma/models";
import { SheduleStatus } from "../../../generated/prisma/enums";
import { AwsClient } from "google-auth-library";
import { no, tr } from "zod/locales";





const createShedule = async (payload: IShedule, user: IRequestUser) => {

    const doctor = await prisma.doctor.findUnique({
        where: {
            userId: user.userId
        }
    });

    if (!doctor) {
        throw new AppError(status.NOT_FOUND, "Doctor Not Found")
    }


    if (!isSameDay(payload.startDateTime, payload.endDateTime)) {
        throw new AppError(status.CONFLICT, "Start-Date And End-Date Time Must Be On The Same Day")
    }
    if (isAfter(payload.startDateTime, payload.endDateTime)) {
        throw new AppError(status.CONFLICT, "Start Date Time Can't Be End Date Time")
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
        throw new AppError(status.CONFLICT, "You Already Have A Shedule For This Date")
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




const getMyShedules = async (query: IQuery, user: IRequestUser) => {
    // searching, filtering, sorting, and pagination

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt"
    const sortOrder = query.sortOrder ? query.sortOrder : "desc"



    const doctor = await prisma.doctor.findUnique({
        where: {
            id: user.userId,
        }
    })
    if (!doctor) {
        throw new AppError(status.NOT_FOUND, "Doctor Not Found")
    }

    const andCondition: SheduleWhereInput[] = [{ doctorId: doctor.id }, { isDeleted: false }]


    // Searching
    if (query.searchTerm) {
        andCondition.push({
            OR: [
                { startDateTime: query.searchTerm },
                { endDateTime: query.endDateTime },
                { doctor: query.doctorName },
                { status: query.status }
            ]
        })
    }


    // Filtering
    if (query.status) {
        andCondition.push({ status: query.status })
    }

    const allShedule = await prisma.shedule.findMany({
        where: { AND: andCondition },
        // sorting, 
        orderBy: { [sortBy]: sortOrder },

        // pagination
        take: limit,
        skip: skip,
        include: {
            appoinment: {
                include: { patient: true }
            }
        }

    })

    const totalShedule = await prisma.shedule.count({
        where: { AND: andCondition }
    })

    return {
        data: allShedule,
        meta: {
            page: page,
            limit: limit,
            skip: skip,
            total: totalShedule,
            totalPages: Math.ceil(totalShedule / limit)

        }
    }

}


const getAllShedule = async (query: IQuery) => {
    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt"
    const sortOrder = query.sortOrder ? query.sortOrder : "desc"

    const andCondition: SheduleWhereInput[] = [];


    // Searching
    if (query.searchTerm) {
        andCondition.push({
            doctor: {
                OR: [
                    { name: { contains: query.name, mode: "insensitive" } },
                    { email: { contains: query.email, mode: "insensitive" } },
                    { specilization: { contains: query.searchTerm, mode: "insensitive" } },
                    { licenseNumber: { contains: query.searchTerm, mode: "insensitive" } },
                ]
            }
        })
    }







    // Filtering
    if (query.doctorId) {
        andCondition.push({ doctorId: query.doctorId })
    }
    if (query.email) {
        andCondition.push({
            doctor: {
                email: query.email
            }
        })
    }
    if (query.status) {
        andCondition.push({ status: query.status })
    }





    const allShedule = await prisma.shedule.findMany({
        where: { AND: andCondition },
        // sorting, 
        orderBy: { [sortBy]: sortOrder },
        // pagination
        take: limit,
        skip: skip,
        include: {
            doctor: true,
            appoinment: {
                include: { patient: true }
            }
        }

    })


    const totalShedule = await prisma.shedule.count({
        where: { AND: andCondition }
    })


    return {
        data: allShedule,
        meta: {
            page: page,
            limit: limit,
            skip: skip,
            total: totalShedule,
            totalPages: Math.ceil(totalShedule / limit)

        }
    }
}




const getSeduleById = async (sheduleId: string) => {

    const shedule = await prisma.shedule.findUnique({
        where: { id: sheduleId },
        include: {
            doctor: { select: { id: true, name: true, email: true, specilization: true } },
            appoinment: {
                include: {
                    patient: true
                }
            }
        }
    })


    if (!shedule || shedule.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Shedule Not Found!")
    }


    return shedule;

}

const updateShedule = async (sheduleId: string, payload: ISheduleUpdatePayload, user: IRequestUser) => {

    const doctor = await prisma.doctor.findUnique({
        where: { email: user.email, }
    })
    if (!doctor) {
        throw new AppError(status.NOT_FOUND, "Doctor Not Found!")
    }

    const shedule = await prisma.shedule.findUnique({
        where: { id: sheduleId, doctorId: doctor.id }
    });
    if (!shedule || shedule.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Shedule Not Found!")
    }

    if (shedule.status === SheduleStatus.PUBLISHED && shedule.totalSlots !== shedule.availableSlots) {
        throw new AppError(status.CONFLICT, "Shedule Already Published Can Be Edit")
    }
    // if (shedule.id !== user.userId) {
    //     throw new AppError(status.FORBIDDEN, "You Are Not Allow To Update This Shedule")
    // }

    payload.startDateTime = payload.startDateTime || shedule.startDateTime
    payload.endDateTime = payload.endDateTime || shedule.endDateTime
    payload.meetingLink = payload.meetingLink || shedule.meetingLink

    if (!isSameDay(payload.startDateTime, payload.endDateTime)) {
        throw new AppError(status.CONFLICT, "Start-Date And End-Date Time Must Be On The Same Day")
    }
    if (isAfter(payload.startDateTime, payload.endDateTime)) {
        throw new AppError(status.CONFLICT, "Start Date Time Can't Be End Date Time")
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
        throw new AppError(status.CONFLICT, "You Already Have A Shedule For This Date")
    }



    const durationInMinutes = differenceInMinutes(payload.startDateTime, payload.endDateTime)

    const MINUTES_ALOCATED_PER_SLOT = 20
    const totalSlots = Math.floor(durationInMinutes / MINUTES_ALOCATED_PER_SLOT)


    const updatedShedule = await prisma.shedule.update({
        where: { id: shedule.id },
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

    return updatedShedule;


}


const publishShedule = async (sheduleId: string, user: IRequestUser) => {

    const doctor = await prisma.doctor.findUnique({
        where: { email: user.email, }
    })
    if (!doctor) {
        throw new AppError(status.NOT_FOUND, "Doctor Not Found!")
    }

    const shedule = await prisma.shedule.findUnique({
        where: { id: sheduleId, doctorId: doctor.id }
    });
    if (!shedule || shedule.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Shedule Not Found!")
    }

    if (shedule.status === SheduleStatus.PUBLISHED) {
        throw new AppError(status.CONFLICT, "Shedule Already Published ")
    }


    const publishShedule = await prisma.shedule.update({
        where: { id: sheduleId },
        data: {
            status: SheduleStatus.PUBLISHED
        }
    })


    return publishShedule;

}



const deleteShedule = async (sheduleId: string, user: IRequestUser) => {
    const doctor = await prisma.doctor.findUnique({
        where: { email: user.email, }
    })
    if (!doctor) {
        throw new AppError(status.NOT_FOUND, "Doctor Not Found!")
    }

    const shedule = await prisma.shedule.findUnique({
        where: { id: sheduleId, doctorId: doctor.id }
    });
    if (!shedule || shedule.isDeleted) {
        throw new AppError(status.NOT_FOUND, "Shedule Not Found!")
    }

    if (shedule.isDeleted) {
        throw new AppError(status.CONFLICT, "Shedule Already Deleted")
    }
    if (shedule.status === SheduleStatus.PUBLISHED && shedule.totalSlots !== shedule.availableSlots) {
        throw new AppError(status.CONFLICT, "Shedule Already Published Can't Be Delete")
    }

    const deleteShedule = await prisma.shedule.update({
        where: { id: sheduleId },
        data: {
            deletedAt: new Date(),
            isDeleted: true
        }
    });



    return deleteShedule
}



const getToDaysShedule = async (query: IQuery) => {

    if (!query.doctorId) {
        throw new AppError(status.NOT_FOUND, "Doctor Id must be provide in query ")
    }
    const doctor = await prisma.doctor.findUnique({
        where: { id: query.doctorId, }
    })
    if (!doctor) {
        throw new AppError(status.NOT_FOUND, "Doctor Not Found!")
    }




    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt"
    const sortOrder = query.sortOrder ? query.sortOrder : "desc"


    const nowDate = new Date();
    const startOfToDay = startOfDay(nowDate);
    const startOfTomorrow = addDays(startOfToDay, 1)


    const andCondition: SheduleWhereInput[] =
        [
            { doctorId: query.doctorId },
            { isDeleted: false },
            { status: SheduleStatus.PUBLISHED },
            { startDateTime: { gte: startOfToDay, lt: startOfTomorrow, gt: nowDate } },
            { availableSlots: { gt: 0 } }
        ];



    const allShedule = await prisma.shedule.findMany({
        where: { AND: andCondition },
        // sorting, 
        orderBy: { [sortBy]: sortOrder },
        // pagination
        take: limit,
        skip: skip

    })


    const totalShedule = await prisma.shedule.count({
        where: { AND: andCondition }
    })


    return {
        data: allShedule,
        meta: {
            page: page,
            limit: limit,
            skip: skip,
            total: totalShedule,
            totalPages: Math.ceil(totalShedule / limit)

        }
    }


}








export const SheduleService = {
    createShedule,
    getMyShedules,
    getAllShedule,
    getSeduleById,
    updateShedule,
    publishShedule,
    deleteShedule,
    getToDaysShedule

}