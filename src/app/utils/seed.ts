import { Role } from "../../generated/prisma/enums"
import config from "../config";
import { prisma } from "../lib/prisma"
import bcrypt from "bcryptjs";



export const seedSupperAdmin = async () => {


    try {
        const isExsistSupperAdmin = await prisma.user.findFirst({
            where: {
                role: Role.SUPER_ADMIN
            }
        });

        if (isExsistSupperAdmin) {
            console.log("Already exsist supper admin");
            return

        }
        const name = config.supper_admin_name
        const email = config.supper_admin_email
        const password = config.supper_admin_password

        if (!email || !name || !password) {
            throw new Error("Supper admin name, password, email is missing .env file")
        }

        const hashPass = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds as string))

        const supperAdmin = await prisma.user.create({
            data: {
                name,
                email,
                password: hashPass,
                role: Role.SUPER_ADMIN,
                emailVerified: true,
            }
        });

        console.log("suppper admin created: ", supperAdmin);
    } catch (error) {
        console.log("Error Seeding Supper Admin : ", error);
        prisma.user.delete({
            where: {
                email: config.supper_admin_email
            }
        })
    }

}




export const seedTestAdmin = async () => {


    try {
        const isExsistTestAdmin = await prisma.user.findFirst({
            where: {
                role: Role.ADMIN
            }
        });

        if (isExsistTestAdmin) {
            console.log("Already exsist Test admin");
            return
        }
        const name = config.test_admin_name
        const email = config.test_admin_email
        const password = config.test_admin_password

        if (!email || !name || !password) {
            throw new Error("Test admin name, password, email is missing .env file")
        }

        const hashPass = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds as string))

        const testAdmin = await prisma.user.create({
            data: {
                name,
                email,
                password: hashPass,
                role: Role.ADMIN,
                emailVerified: true,
            }
        });

        console.log(" Test admin created: ", testAdmin);
    } catch (error) {
        console.log("Error Seeding  Admin : ", error);
        prisma.user.delete({
            where: {
                email: config.test_admin_email
            }
        })
    }

}
export const seedTestDoctor = async () => {


    try {
        const isExsistTestDoctor = await prisma.user.findFirst({
            where: {
                role: Role.DOCTOR
            }
        });

        if (isExsistTestDoctor) {
            return console.log("Already exsist a Doctor");


        }
        const name = config.test_doctor_name
        const email = config.test_doctor_email
        const password = config.test_doctor_password

        if (!email || !name || !password) {
            throw new Error("Test Doctor name, password, email is missing .env file")
        }

        const hashPass = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds as string))

        const doctor = await prisma.user.create({
            data: {
                name,
                email,
                password: hashPass,
                role: Role.DOCTOR,
                emailVerified: true,
                doctor:{
                    create:{
                        name,
                        email,
                        experinceYears: 5,
                        licenseNumber: "1234567890",
                        qualifications: "MBBS, FCPS",
                        specilization: "General Physician",
                    }
                }
            }
        });

        console.log(" Doctor created: ", doctor);
    } catch (error) {
        console.log("Error Seeding  doctor : ", error);
        prisma.user.delete({
            where: {
                email: config.test_doctor_email
            }
        })
    }

}
