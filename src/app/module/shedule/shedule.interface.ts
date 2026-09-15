import { SheduleStatus } from "../../../generated/prisma/enums";


// export interface IShedule {
//     startDateTime: Date;
//     endDateTime: Date;

//     totalSlots: number;
//     availableSlots: number;

//     meetingLink: string;
//     status: SheduleStatus;

//     isDeleted: boolean;
//     deletedAt?: Date;

//     doctorId: string;
// }
export interface IShedule {
    startDateTime: Date;
    endDateTime: Date;
    meetingLink: string;
}
export interface ISheduleUpdatePayload {
    startDateTime?: Date;
    endDateTime?: Date;
    meetingLink?: string;
}

