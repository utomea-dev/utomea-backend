import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

export const getSecretFromSecretManager = async () => {
  try {
    const secret_name = "utomea/dev/secret_key";
    const client = new SecretsManagerClient({
      region: "us-east-2",
    });
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
      })
    );
    const { SECRET_KEY } = JSON.parse(response.SecretString as string);
    return SECRET_KEY;
  } catch (error) {
    console.log("Error from getting secrets from secret manager", error);
  }
};

export const getAccessKeyFromSecretManager = async () => {
  try {
    const secret_name = "dev/utomea/accessKey";
    const client = new SecretsManagerClient({
      region: "us-east-2",
    });
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
      })
    );
    const { AWS_ACCESS_KEY } = JSON.parse(response.SecretString as string);
    return AWS_ACCESS_KEY;
  } catch (error) {
    console.log("Error from getting secrets from secret manager", error);
  }
};


export const getAwsSecretKeyFromSecretManager = async () => {
  try {
    const secret_name = "dev/utomea/accessKey";
    const client = new SecretsManagerClient({
      region: "us-east-2",
    });
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
      })
    );
    const { AWS_SECRET_KEY } = JSON.parse(response.SecretString as string);
    return AWS_SECRET_KEY;
  } catch (error) {
    console.log("Error from getting secrets from secret manager", error);
  }
};