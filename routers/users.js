import express, { response } from "express";
import { getHashedPassword, getUsers, postUser, updateUser, updateUserPassword } from "../helper.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import randomstring from "randomstring";

const router = express.Router();

router.post("/signup", async (request, response) => {
  try {
    const { name, email, password } = request.body;
    const hashedPassword = await getHashedPassword(password);

    // check if email exists
    const users = await getUsers({email: email});
    if (users) {
      response
        .status(200)
        .send({ success: false, message: "Email already exists" });
      return;
    }
    const result = await postUser({ name, email, password: hashedPassword, fptoken: "" });
    result.insertedId
      ? response
          .status(200)
          .send({ success: true, message: "User added successfully" })
      : response.status(400).send({ success: false, message: "Signup failed" });
  } catch (error) {
    response.status(400).send({ success: false, message: error.message });
  }
});

router.post("/login", async (request, response) => {
  try {
    const { email, password } = request.body;
    const userDB = await getUsers({email: email});

    //email doesn't exists
    if (!userDB) {
      response
        .status(200)
        .send({ success: false, message: "Invalid credentials" });
      return;
    }
    //password not matching
    const storedPw = userDB.password;
    const isPwMatch = await bcrypt.compare(password, storedPw);
    if (!isPwMatch) {
      response
        .status(200)
        .send({ success: false, message: "Invalid credentials" });
      return;
    }

    response.status(200).send({ success: true, message: "Successful login" });
  } catch (error) {
    response.status(400).send({ success: false, message: error.message });
  }
});

router.post("/forgot-password", async function (request, response) {
  try {
    const { email } = request.body;
    const userDB = await getUsers({email: email});

    //email doesn't exists
    if (!userDB) {
      response
        .status(200)
        .send({ success: false, message: "Email doesn't exist" });
      return;
    }
    const randomStr = randomstring.generate();
    const expireToken = Date.now() + 1000*60*5;
    const updateFpToken = await updateUser(email, {fptoken: randomStr, expireToken: expireToken});
    if(updateFpToken.modifiedCount <= 0){
        response
            .status(400)
            .send({ success: false, message: "Failed to send mail" });
        return;
    }
    sendMail(userDB.name, email, randomStr);
    response.status(200).send({ success: true, message: "Please check your inbox to reset password" });

  } catch (error) {
    response.status(400).send({ success: false, message: error.message });
  }
});

const sendMail = async (name, email, fptoken) => {
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.APP_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Dummy Reset Password",
            html: `<p>Hi ${name}, <br/>
                Please click or copy the below link to reset password : 

                <a href="https://password-reset-murtaza.netlify.app/reset-password/${fptoken}" target="_blank"><b>https://password-reset-murtaza.netlify.app/reset-password/${fptoken}</b></a>

                <p><b>Note: </b>The link will expire after 5 minutes.</p> 
            </p>`
        };
        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                console.log(error)
            } else {
                console.log("Mail has been sent - ", info.response);
            }
        });

    } catch (error) {
        response.status(400).send({success: false, message: error.message})
    }
}

// verify url
router.get("/reset-password", async function (request, response) {
    try {
        const token = request.query.token;
        const tokenData = await getUsers({fptoken: token, expireToken: {$gt: Date.now()}});

        if (!tokenData) {
            response
              .status(400)
              .send({ success: false, message: "Token expired" });
            return;
        }
        response.status(200).send({ success: true, message: "Token Verified" });
            
    } catch (error) {
        response.status(400).send({success: false, message: error.message})
    }
});   

// reset password
router.post("/reset-password", async function (request, response) {
    try {
        const token = request.query.token;
        const tokenData = await getUsers({fptoken: token});

        if (!tokenData) {
            response
              .status(400)
              .send({ success: false, message: "Token expired" });
            return;
        }

        const {password} = request.body;
        const hashedPassword = await getHashedPassword(password);
        const updatePassword = await updateUserPassword(tokenData.email, {password: hashedPassword, fptoken: "", expireToken: 0});
        if(updatePassword.modifiedCount <= 0){
            response
                .status(400)
                .send({ success: false, message: "Failed to update Password" });
            return;
        }
        response.status(200).send({ success: true, message: "Password has been reset. You will be redirected to Login page." });

    } catch (error) {
        response.status(400).send({success: false, message: error.message})
    }
});

export const userRouter = router;
