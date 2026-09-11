import { AppointmentStatus, PaymentStatus } from "../../../generated/prisma/enums"
import config from "../../config"
import { getBkashIdToken } from "../../lib/bKash"
import { prisma } from "../../lib/prisma"
import { RequestUser } from "../../middleware/checkAuth"




const bookAppoinment = async (payload: any, user: RequestUser) => {

    const transactionResult = await prisma.$transaction(async (tx) => {




        // create a new appoinment in the database
        const appointment = await tx.apppointment.create({
            data: {
                status: "PENDING",
            }
        })

        // Bkash Payment Integration...
        const bkashIdToken = await getBkashIdToken()
        const bkashUrlResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                authorization: bkashIdToken,
                "x-app-key": config.bkash_app_key
            },
            body: JSON.stringify({
                mode: "0011",
                // payerReference: "01723888888",
                payerReference: user.email,
                callbackURL: `${config.bKash_callback_url}/appoinment/book-appoinment/payment/callback`,
                amount: "120",
                currency: "BDT",
                intent: "sale",
                // merchantInvoiceNumber: "Inv0001"
                merchantInvoiceNumber: appointment.id || "abc11"
            })
        });

        const bkashUrlResult = await bkashUrlResponse.json()

        // create payment
        await tx.payment.create({
            data: {
                merchantInvoiceNumber: bkashUrlResult.merchantInvoiceNumber,
                appointmentId: appointment.id,
                amount: "1200",
                gatewayResponse: bkashUrlResult,
                bkashPaymentId: bkashUrlResult.paymentID,
                payerReference: user.email


            }
        })


        return {
            paymentURL: bkashUrlResult.bkashURL
        }
    })
    return transactionResult
}

const payAppoinment = async (payload: any, user: RequestUser) => {

    const appoinmentId = payload.appoinmentId;

    const ExsistAppoinment = await prisma.apppointment.findUnique({
        where: {
            id: appoinmentId
        }
    });

    console.log(ExsistAppoinment);


    if (!ExsistAppoinment) {
        throw new Error("Appoinment Dose Not Exist")
    }
    if (ExsistAppoinment.status !== "PENDING") {
        throw new Error("Appoinment Is Not Pending")
    }



    // Bkash Payment Integration...
    const bkashIdToken = await getBkashIdToken()
    const bkashUrlResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            authorization: bkashIdToken,
            "x-app-key": config.bkash_app_key
        },
        body: JSON.stringify({
            mode: "0011",
            // payerReference: "01723888888",
            payerReference: user.email,
            callbackURL: `${config.bKash_callback_url}/appoinment/book-appoinment/payment/callback`,
            amount: "120",
            currency: "BDT",
            intent: "sale",
            // merchantInvoiceNumber: "Inv0001"
            merchantInvoiceNumber: ExsistAppoinment.id || "abc11"
        })
    });

    const bkashUrlResult = await bkashUrlResponse.json()


    // Update payment
    await prisma.payment.update({
        where: {
            appointmentId: ExsistAppoinment.id
        },
        data: {
            merchantInvoiceNumber: bkashUrlResult.merchantInvoiceNumber,
            appointmentId: ExsistAppoinment.id,
            gatewayResponse: bkashUrlResult,
            bkashPaymentId: bkashUrlResult.paymentID,
            payerReference: user.email


        }
    })
    return {
        paymentURL: bkashUrlResult.bkashURL
    }


}


const bookAppoinmentCallback = async (query: Record<string, any>) => {

    const transactionResult = await prisma.$transaction(async (tx) => {


        const bkashIdToken = await getBkashIdToken()
        const paymentID = query.paymentID
        const status = query.status

        if (!bkashIdToken) {
            throw new Error("No Bkash Access Token Found!")
        }
        if (!paymentID) {
            throw new Error("Payment ID Missing")
        }
        if (!status) {
            throw new Error("Payment Status Missing")
        }



        const executePaymenResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                authorization: bkashIdToken,
                "x-app-key": config.bkash_app_key
            },
            body: JSON.stringify({ paymentID })
        });

        const executePaymentResult = await executePaymenResponse.json()

        if (status === 'success') {

            await tx.apppointment.update({
                where: {
                    id: executePaymentResult.merchantInvoiceNumber
                },
                data: {
                    status: AppointmentStatus.CONFIRMED
                }
            })

            await tx.payment.update({
                where: {
                    bkashPaymentId: paymentID
                },
                data: {
                    status: PaymentStatus.PAID,
                    bkashTrxId: executePaymentResult.trxID,
                    paidAt: executePaymentResult.paymentExecuteTime,
                    gatewayResponse: executePaymentResult
                }
            })

            return {
                redirectUrl: `${config.frontend_url}/dashboard/my-appoinments?status=success`
            }
        }
        else if (status === 'failure') {


            await tx.payment.update({
                where: {
                    appointmentId: executePaymentResult.merchantInvoiceNumber,
                    bkashPaymentId: paymentID
                },
                data: {
                    status: PaymentStatus.FAILED,
                    gatewayResponse: executePaymentResult
                }
            })


            return {
                redirectUrl: `${config.frontend_url}/dashboard/my-appoinments?status=failure`
            }
        }
        else if (status === 'cancel') {


            await tx.payment.update({
                where: {
                    appointmentId: executePaymentResult.merchantInvoiceNumber,
                    bkashPaymentId: paymentID
                },
                data: {
                    status: PaymentStatus.CANCELLED,
                    gatewayResponse: executePaymentResult
                }
            })

            return {
                redirectUrl: `${config.frontend_url}/dashboard/my-appoinments?status=cancel`
            }
        }
        else {

            return {
                redirectUrl: `${config.frontend_url}/dashboard/my-appoinments?status=error`
            }
        }




    })

    return transactionResult;


}












export const AppoinmentService = {
    bookAppoinment,
    bookAppoinmentCallback,
    payAppoinment
}