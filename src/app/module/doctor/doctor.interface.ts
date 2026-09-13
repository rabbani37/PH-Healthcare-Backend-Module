export interface IDoctorApplicationPayload {
  user: {
    name: string;
    email: string;
  };
  doctor: {
    name: string;
    email: string;
    specilization: string;
    licenseNumber: string;
    qualifications: string;
    experinceYears: number;

    // Optional fields if you decide to send them via the form body
    address?: string;
    bio?: string;
    consultationFee?: number;
    contactNumber?: string;
  };
}


export interface IVerifyDoctorEmailPayload {
  email: string;
  otp: string;
}
