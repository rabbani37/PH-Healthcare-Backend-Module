import { z } from 'zod';

export const ApplicationDoctorZodSchema = z.object({
    user: z.object({
        name: z.string().min(1, "Name cannot be empty"),
        email: z.email("Invalid user email address"),
    }),
    doctor: z.object({
        name: z.string().min(1, "Doctor name cannot be empty"),
        email: z.string().email("Invalid doctor email address"),
        specilization: z.string(),
        licenseNumber: z.string(),
        qualifications: z.string(),
        experinceYears: z.union([z.number(), z.string()]).transform((val) => {
            // Converts string number configurations safely into numeric integers
            const parsed = Number(val);
            return isNaN(parsed) ? 0 : parsed;
        }),
        address: z.string().optional(),
        bio: z.string().optional(),
        consultationFee: z.union([z.number(), z.string()]).transform((val) => {
            if (!val) return undefined;
            const parsed = Number(val);
            return isNaN(parsed) ? undefined : parsed;
        }).optional(),
        contactNumber: z.string().optional(),
    }),
});

// Infer type definitions cleanly from schema
export type TDoctorApplicationInput = z.infer<typeof ApplicationDoctorZodSchema>;
