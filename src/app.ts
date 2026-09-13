import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { UserRouter } from "./app/module/user/user.router";
import { getBkashIdToken } from "./app/lib/bKash";
import { AppoinmentRoutes } from "./app/module/appoinment/appoinment.route";
import { DoctorRoutes } from "./app/module/doctor/doctor.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/auth", UserRouter);
app.use("/api/v1/appoinment", AppoinmentRoutes)
app.use("/api/v1/doctor", DoctorRoutes)









app.use("/test", async (req: Request, res: Response) => {
	const bKashIdToken = await getBkashIdToken()


	res.status(httpStatus.OK).json({
		success: true,
		message: ".....TESR HERE......",
	});
})



// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
