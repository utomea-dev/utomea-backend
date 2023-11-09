import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "../libs/sesClient";

const createSendEmailCommand = (recipientAddress: string, otp: string) => {
  return new SendEmailCommand({
    Destination: {
      ToAddresses: [recipientAddress],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `Your reset password otp: ${otp}`,
        },
        Text: {
          Charset: "UTF-8",
          Data: `Your reset password otp: ${otp}`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Reset Password OTP Request",
      },
    },
    Source: "nikhil.taneja@qed42.com",
  });
};

const run = async (recipientAddress: string, otp: string) => {
  const sendEmailCommand = createSendEmailCommand(recipientAddress, otp);

  try {
    return await sesClient.send(sendEmailCommand);
  } catch (e) {
    console.error("Failed to send email.", e);
    return e;
  }
};

const createVerificationEmail = (
  recipientAddress: string,
  verificationCode: string
) => {
  return new SendEmailCommand({
    Destination: {
      ToAddresses: [recipientAddress],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `Your verification code: ${verificationCode}`,
        },
        Text: {
          Charset: "UTF-8",
          Data: `Your verification code: ${verificationCode}`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Email Verification Code",
      },
    },
    Source: "nikhil.taneja@qed42.com",
  });
};

const sendCode = async (recipientAddress: string, verificationCode: string) => {
  const sendEmailCommand = createVerificationEmail(
    recipientAddress,
    verificationCode
  );

  try {
    return await sesClient.send(sendEmailCommand);
  } catch (e) {
    console.error("Failed to send verification code email.", e);
    return e;
  }
};

// snippet-end:[ses.JavaScript.email.sendEmailV3]
export { run, sendCode };
