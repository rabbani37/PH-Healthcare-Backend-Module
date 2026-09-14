import cron from "node-cron"
import { prisma } from "./prisma";
import { DoctorVerificationStatus, Role } from "../../generated/prisma/enums";




export const deleteUnverifiedDoctors = async () => {

    const timeExpression = '*/10 * * * * '

    cron.schedule(timeExpression, async () => {

        try {


            const onHourAgo = new Date(Date.now() - 60 * 60  * 1000)

            const deleteDoctor = await prisma.user.deleteMany({
                where: {
                    role: Role.DOCTOR,
                    emailVerified: false,
                    createdAt: { lt: onHourAgo },
                    doctor: {
                        verificationStatus: DoctorVerificationStatus.PENDING
                    }
                }

            })


            if (deleteDoctor.count > 0) {
                console.log("DELETED : ", deleteDoctor.count);
            }


        } catch (error) {
            console.log(`Cron: Faild to delete unverified doctor application -> `, error);
        }
        console.log("Unverified Doctor delete  schedule (every 10 minutes)");
    })



};