import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { fi, ne } from "zod/locales";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { Role } from "../../../generated/prisma/enums";
import { IDoctorApplicationPayload, IVerifyDoctorEmailPayload } from "./doctor.interface";
import crypto from "crypto";
import { redisClient } from "../../lib/redisClient";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import config from "../../config";

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


    // Send OTP to doctor email
    const templatePath = path.join(process.cwd(), "src/app/templates/welcome-email.ejs");
    const templateData = { name: verifiedUser.name, email: verifiedUser.email };
    const templateHtml = await ejs.renderFile(templatePath, templateData);
    await transporter.sendMail({
        from: config.smtp_sender,
        to: verifiedUser.email,
        subject: "Welcome to Our Platform – Your Account Is Ready",
        html: templateHtml
    });



    return verifiedUser;


}






export const DoctorServices = {
    applyAsDoctor,
    verifyDoctorEmail
}