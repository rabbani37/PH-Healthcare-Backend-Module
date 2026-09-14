import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";
import { DoctorVerificationStatus, Role } from "../../../generated/prisma/enums";
import { IApprovedDoctorPayload, IDoctorApplicationPayload, IVerifyDoctorEmailPayload } from "./doctor.interface";
import crypto from "crypto";
import { redisClient } from "../../lib/redisClient";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import config from "../../config";
import { RequestUser } from "../../middleware/checkAuth";
import { IQuery } from "../../interfaces";
import { DoctorWhereInput } from "../../../generated/prisma/models";

const applyAsDoctor = async (
    payload: IDoctorApplicationPayload,
    resume: Express.Multer.File | null,
    additionalFiles: Express.Multer.File[] | null
) => {

    const isExsistUser = await prisma.user.findUnique({
        where: {
            id: payload.user.email

        }
    });
    if (isExsistUser) {
        throw new Error("User already exsist with this email");
    }


    const resumeResult = await new Promise<UploadApiResponse>((resolve, reject) => {

        cloudinary.uploader.upload_stream(
            { resource_type: "auto" },
            async (error, result) => {
                if (error) {
                    return reject(error)
                }
                if (result) {

                    if (!result) {
                        return reject(new Error("No result return from cloudinary"))
                    }

                    return resolve(result)
                }


            }
        ).end(resume?.buffer)

    })


    const additionalFileUploadResult = await Promise.all((additionalFiles || []).map((file) => {
        return new Promise<UploadApiResponse>((resolve, reject) => {

            cloudinary.uploader.upload_stream(
                { resource_type: "auto" },
                async (error, result) => {
                    if (error) {
                        return reject(error)
                    }
                    if (result) {

                        if (!result) {
                            return reject(new Error("No result return from cloudinary"))
                        }

                        return resolve(result)
                    }

                }
            ).end(file?.buffer)
        })
    }))

    const randomPassword = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(randomPassword, 10)

    const doctorApplication = await prisma.user.create({
        data: {
            ...payload.user,
            password: hash,
            role: Role.DOCTOR,
            needPasswordChange: true,
            doctor: {
                create: {
                    ...payload.doctor,
                    resume: resumeResult.secure_url,
                    resumePublicId: resumeResult.public_id,
                    additionalFiles: additionalFileUploadResult.map((file) => ({
                        url: file.secure_url,
                        public_id: file.public_id
                    }))
                }
            }
        },
        include: { doctor: true }
    });


    // Doctor application OTP set in redist
    const experationSeconds = 60 * 60
    const otpKey = `doctor-application-otp:${doctorApplication.email}`
    const otpValue = crypto.randomInt(100000, 999999).toString();
    await redisClient.set(otpKey, otpValue, {
        expiration: {
            type: "EX",
            value: experationSeconds
        }
    });

    // Send OTP to doctor email
    const templatePath = path.join(process.cwd(), "src/app/templates/registration-otp.ejs");
    const templateData = { OTP: otpValue, name: doctorApplication.name, email: doctorApplication.email, expirationMinutes: experationSeconds / 60 };
    const templateHtml = await ejs.renderFile(templatePath, templateData);
    await transporter.sendMail({
        from: config.smtp_sender,
        to: doctorApplication.email,
        subject: "Doctor Application - Email Verification OTP",
        html: templateHtml
    });


    return doctorApplication

}



const verifyDoctorEmail = async (payload: IVerifyDoctorEmailPayload) => {

    const otp = payload.otp.trim()
    const email = payload.email.trim().toLowerCase()
    if (!otp) {
        throw new Error("Invalid OTP")
    }

    const isExsistUser = await prisma.user.findUnique({
        where: {
            email: email, role: Role.DOCTOR
        }
    })
    if (!isExsistUser) {
        throw new Error("Doctor Application Not Found! please apply the again");
    }
    if (isExsistUser.emailVerified) {
        throw new Error("Already Email verified")
    }
    const otpKey = `doctor-application-otp:${email}`

    const redistOtp = await redisClient.get(otpKey);
    if (!redistOtp) {
        throw new Error("OTP Expired!")
    }
    if (redistOtp !== payload.otp) {
        throw new Error("OTP Dose Not Mathced")
    }

    const verifiedUser = await prisma.user.update({
        where: { id: isExsistUser.id },
        data: { emailVerified: true },
        include: { doctor: true },
        omit: { password: true }
    })
    await redisClient.del(otpKey);

    // Send Under Review to doctor email
    const templatePath = path.join(process.cwd(), "src/app/templates/welcome-email-under-review.ejs");

    const templateData = {
        name: isExsistUser.name,
        email: isExsistUser.email,
        specialization: verifiedUser.doctor?.specilization,
        license: verifiedUser.doctor?.licenseNumber,
        approval: verifiedUser.doctor?.verificationStatus, date: verifiedUser.doctor?.reviewedAt
    };

    const templateHtml = await ejs.renderFile(templatePath, templateData);
    await transporter.sendMail({
        from: config.smtp_sender,
        to: isExsistUser.email,
        subject: "Doctor Application Received – Under Review",
        html: templateHtml
    });




    return verifiedUser;
}


const approvedDoctor = async (payload: IApprovedDoctorPayload, reviewer: RequestUser) => {
    const { doctorId, verificationStatus, rejectionReason } = payload

    const isExsistDoctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        include: { user: true }
    });

    if (!isExsistDoctor) {
        throw new Error("Doctor Application Not Found!")
    }

    if (isExsistDoctor.isDeleted) {
        throw new Error("Doctor Application Has been Deleted")
    }
    if (!isExsistDoctor.user.emailVerified) {
        throw new Error("Doctor Has Not Verifed Yet.")

    }

    if (isExsistDoctor.verificationStatus !== DoctorVerificationStatus.PENDING) {
        throw new Error(`Doctor Application Has Already been
             ${isExsistDoctor.verificationStatus.toLowerCase()}`)
    }
    if (verificationStatus === DoctorVerificationStatus.REJECTED && !rejectionReason) {
        throw new Error("Rejection Reason is Required")
    }
    const updatedDoctor = await prisma.doctor.update({
        where: { id: doctorId },
        data: {
            verificationStatus,
            rejectionReason: verificationStatus === DoctorVerificationStatus.REJECTED ? rejectionReason : null,
            reviewedBy: reviewer.userId,
            reviewedAt: new Date
        },

    })

    const isApploved = updatedDoctor.verificationStatus === DoctorVerificationStatus.APPROVED
    // Send Approvel Message to doctor email

    if (isApploved) {

        const templatePath = path.join(process.cwd(), "src/app/templates/doctor-application-approved.ejs");
        const templateData = {
            name: updatedDoctor.name,
            specialization: updatedDoctor.specilization,
            licenseNumber: updatedDoctor.licenseNumber,
            approvalDate: updatedDoctor?.reviewedAt?.toLocaleDateString()
        }
        const templateHtml = await ejs.renderFile(templatePath, templateData);
        await transporter.sendMail({
            from: config.smtp_sender,
            to: isExsistDoctor.email,
            subject: "Doctor Application Approved – Welcome to Our Healthcare Platform",
            html: templateHtml
        });
    }

    // Send Rejection Message to doctor email
    else {

        const templatePathRejection = path.join(process.cwd(), "src/app/templates/doctor-application-rejection.ejs");
        const templateDataRejection = {
            name: updatedDoctor.name,
            rejectionReason: updatedDoctor.rejectionReason || "Your medical information could not be verified.",
            rejectedDate: updatedDoctor?.reviewedAt?.toLocaleDateString()
        }
        const templateHtmlRejection = await ejs.renderFile(templatePathRejection, templateDataRejection);
        await transporter.sendMail({
            from: config.smtp_sender,
            to: isExsistDoctor.email,
            subject: "Doctor Application Update – Application Rejeted",
            html: templateHtmlRejection
        });



        return updatedDoctor
    }
}



const getAllDoctors = async (query: IQuery) => {


    // search , filter, sorting, pagination 

    const limit = query.limit ? Number(query.limit) : 10;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ? query.sortBy : "createdAt"
    const sortOrder = query.sortOrder ? query.sortOrder : "desc"

    const andCondition: DoctorWhereInput[] = [];


    // find doctors by searchBox or searchTerm || searching
    if (query.searchTerm) {
        andCondition.push({
            OR: [
                { name: { contains: query.searchTerm, mode: "insensitive" } },
                { email: { contains: query.searchTerm, mode: "insensitive" } },
                { specilization: { contains: query.searchTerm, mode: "insensitive" } },
                { licenseNumber: { contains: query.searchTerm, mode: "insensitive" } },
            ]
        })
    }



    // filter by queary parameter || Filtering

    if (query.specilization) {
        andCondition.push({
            specilization: { contains: query.specilization, mode: "insensitive" }
        })
    }
    if (query.email) {
        andCondition.push({
            email: { contains: query.email, mode: "insensitive" }
        })
    }
    if (query.licenseNumber) {
        andCondition.push({
            licenseNumber: { equals: query.licenseNumber, mode: "insensitive" }
        })
    }
    if (query.verificationStatus) {
        andCondition.push({
            verificationStatus: query.verificationStatus as DoctorVerificationStatus
        })
    }

    andCondition.push({
        isDeleted: false
    });



    const allDoctors = await prisma.doctor.findMany({
        where: {
            AND: andCondition
        },

        // sorting, 
        orderBy: {
            [sortBy]: sortOrder
        },

        // pagination
        take: limit,
        skip: skip,
        include: {
            user:
            {
                omit: { password: true },
            },
            // appointment
            // Shedual,
            // prescription

        },

    })


    console.log(allDoctors);

    const totalDoctorCount = await prisma.doctor.count({
        where: {
            AND: andCondition
        }

    })


    return {
        data: allDoctors,
        meta: {
            page: page,
            limit: limit,
            skip: skip,
            total: totalDoctorCount,
            totalPages: Math.ceil(totalDoctorCount / limit)

        }
    };


}


















export const DoctorServices = {
    applyAsDoctor,
    verifyDoctorEmail,
    approvedDoctor,
    getAllDoctors
}