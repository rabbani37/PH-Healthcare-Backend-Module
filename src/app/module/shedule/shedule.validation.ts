import z from "zod";


export const createSheduleZodSchema = z.object({
    startDateTime: z.coerce.string("Invalid Start Date Time"),
    endDateTime: z.coerce.string("Invalid Start Date Time"),
    meetingLink: z.url("Invalid Meeting link").trim()
})
export const updateSheduleZodSchema = z.object({
    startDateTime: z.coerce.string("Invalid Start Date Time").optional(),
    endDateTime: z.coerce.string("Invalid Start Date Time").optional(),
    meetingLink: z.url("Invalid Meeting link").trim().optional()
})