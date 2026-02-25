import {
    EC2Client,
    DescribeInstancesCommand,
    StartInstancesCommand,
    StopInstancesCommand,
} from "@aws-sdk/client-ec2";
import { logAction } from "./database.js";

const REGION = "ap-northeast-1"; // Tokyo
const INSTANCE_ID = "i-0e060fb05058b7ef2";

// Create client correctly scoped
const getEc2Client = () => {
    return new EC2Client({
        region: REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
    });
};

export const checkStatus = async () => {
    const client = getEc2Client();
    const command = new DescribeInstancesCommand({
        InstanceIds: [INSTANCE_ID],
    });

    try {
        const data = await client.send(command);
        const state = data.Reservations[0].Instances[0].State.Name;
        return { status: state };
    } catch (err) {
        console.error("Error checking EC2 status:", err);
        throw err;
    }
};

export const startInstance = async (userEmail) => {
    const client = getEc2Client();
    const command = new StartInstancesCommand({
        InstanceIds: [INSTANCE_ID],
    });

    try {
        const currentStatus = await checkStatus();
        if (currentStatus.status === "running" || currentStatus.status === "pending") {
            return { message: "Instance is already " + currentStatus.status, status: currentStatus.status };
        }

        const data = await client.send(command);
        const newState = data.StartingInstances[0].CurrentState.Name;

        // Log in background
        await logAction("start", userEmail);

        return { message: "Starting instance", status: newState };
    } catch (err) {
        console.error("Error starting EC2:", err);
        throw err;
    }
};

export const stopInstance = async (userEmail) => {
    const client = getEc2Client();
    const command = new StopInstancesCommand({
        InstanceIds: [INSTANCE_ID],
    });

    try {
        const currentStatus = await checkStatus();
        if (currentStatus.status === "stopped" || currentStatus.status === "stopping") {
            return { message: "Instance is already " + currentStatus.status, status: currentStatus.status };
        }

        const data = await client.send(command);
        const newState = data.StoppingInstances[0].CurrentState.Name;

        // Log in background
        await logAction("stop", userEmail);

        return { message: "Stopping instance", status: newState };
    } catch (err) {
        console.error("Error stopping EC2:", err);
        throw err;
    }
};
