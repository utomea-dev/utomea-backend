import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "../libs/sesClient";

const createSendEmailCommand = (recipientAddress: string, link: string) => {
  return new SendEmailCommand({
    Destination: {
      ToAddresses: [
        recipientAddress,
      ],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<p>Reset password link:  ${link}</p>`,
        },
        Text: {
          Charset: "UTF-8",
          Data: `${link}`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Reset Password Request",
      },
    },
    Source: "nikhil.taneja@qed42.com",
  });
};

const run = async (recipientAddress: string, link: string) => {
  const sendEmailCommand = createSendEmailCommand(
    recipientAddress,
    link
  );

  try {
    return await sesClient.send(sendEmailCommand);
  } catch (e) {
    console.error("Failed to send email.", e);
    return e;
  }
};

// snippet-end:[ses.JavaScript.email.sendEmailV3]
export { run };