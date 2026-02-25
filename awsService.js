import {
    EC2Client,
    DescribeInstancesCommand,
    StartInstancesCommand,
    StopInstancesCommand,
} from "@aws-sdk/client-ec2";
import { logAction } from "./database.js";

// Hardcoded region/instance mapping is removed.
// Each method will receive the `region` and `instanceId` from the config.

// Create client correctly scoped
const getEc2Client = (region) => {
    return new EC2Client({
        region: region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
    });
};

export const checkStatus = async (region, instanceId) => {
    const client = getEc2Client(region);
    const command = new DescribeInstancesCommand({
        InstanceIds: [instanceId],
    });

    try {
        const data = await client.send(command);
        const state = data.Reservations[0].Instances[0].State.Name;
        return { status: state, instanceId };
    } catch (err) {
        console.error(`Error checking EC2 status for ${instanceId}:`, err);
        throw err;
    }
};

export const startInstance = async (userEmail, region, instanceId) => {
    const client = getEc2Client(region);
    const command = new StartInstancesCommand({
        InstanceIds: [instanceId],
    });

    try {
        const currentStatus = await checkStatus(region, instanceId);
        if (currentStatus.status === "running" || currentStatus.status === "pending") {
            return { message: "Instance is already " + currentStatus.status, status: currentStatus.status, instanceId };
        }

        const data = await client.send(command);
        const newState = data.StartingInstances[0].CurrentState.Name;

        // Log in background
        await logAction("start", userEmail, instanceId);

        return { message: "Starting instance", status: newState, instanceId };
    } catch (err) {
        console.error(`Error starting EC2 ${instanceId}:`, err);
        throw err;
    }
};

export const stopInstance = async (userEmail, region, instanceId) => {
    const client = getEc2Client(region);
    const command = new StopInstancesCommand({
        InstanceIds: [instanceId],
    });

    try {
        const currentStatus = await checkStatus(region, instanceId);
        if (currentStatus.status === "stopped" || currentStatus.status === "stopping") {
            return { message: "Instance is already " + currentStatus.status, status: currentStatus.status, instanceId };
        }

        const data = await client.send(command);
        const newState = data.StoppingInstances[0].CurrentState.Name;

        // Log in background
        await logAction("stop", userEmail, instanceId);

        return { message: "Stopping instance", status: newState, instanceId };
    } catch (err) {
        console.error(`Error stopping EC2 ${instanceId}:`, err);
        throw err;
    }
};
