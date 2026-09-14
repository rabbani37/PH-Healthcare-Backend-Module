import status from "http-status";
import config from "../config"
import { AppError } from "../utils/AppError";
import { redisClient } from "./redisClient";





export const getBkashIdToken = async () => {


    try {

        const bkashIdTokenKey = `Bkash:idToken`
        const bkashRefreshTokenKey = `Bkash:refreshToken`

        let bkashIdToken = await redisClient.get(bkashIdTokenKey);
        const bkashRefreshToken = await redisClient.get(bkashRefreshTokenKey);
        const bkashIdTokenTimes = await redisClient.ttl(bkashIdTokenKey);
        const bkashRefreshTokenTime = await redisClient.ttl(bkashRefreshTokenKey);


        if ((bkashIdTokenTimes <= 60 * 10 || !bkashIdToken) &&
            bkashRefreshToken &&
            bkashRefreshTokenTime < 60 * 60 * 24) {
            const bkashRefreshResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/token/refresh`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    username: config.bkash_username,
                    password: config.bkash_password
                },
                body: JSON.stringify({
                    app_key: config.bkash_app_key,
                    app_secret: config.bkash_app_secret,
                    refresh_token: bkashRefreshToken
                })

            })
            const bkashRefreshResult = await bkashRefreshResponse.json()
            bkashIdToken = bkashRefreshResult.id_token
        }

        if (bkashIdTokenTimes > 60 * 10) {
            return bkashIdToken
        }

        const bkashApiResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/token/grant`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                username: config.bkash_username,
                password: config.bkash_password
            },
            body: JSON.stringify({
                app_key: config.bkash_app_key,
                app_secret: config.bkash_app_secret
            })
        });

        const bkashApiResult = await bkashApiResponse.json();

        if (bkashApiResult.statusMessage !== "Successful") {
            new AppError( status.NOT_FOUND,"Token Not Found")
        }

        // set id token in redist
        await redisClient.set(bkashIdTokenKey, bkashApiResult.id_token, {
            expiration: {
                type: "EX",
                value: 60 * 60 // 1 hour
            }
        })
        await redisClient.set(bkashRefreshTokenKey, bkashApiResult.refresh_token, {
            expiration: {
                type: "EX",
                value: 60 * 60 * 24 * 28 // 28 days
            }
        })


        return bkashApiResult

    } catch (error: any) {

        console.log(`Bkash Grant Token ERROR: ${error.message}`);
       new AppError( status.NOT_FOUND, `Failed to grant bKash token : ${error.message}`)

    }
}