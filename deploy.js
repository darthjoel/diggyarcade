const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");
const { CloudFrontClient, CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
require("dotenv").config();

// Configuration
const BUCKET_NAME = process.argv[2];
const REGION = process.env.AWS_REGION || "us-east-1";
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID || "EQK2W0CKD77RC";
const DIST_DIR = path.join(__dirname, "dist");

if (!BUCKET_NAME) {
    console.error("❌ Error: Please provide an S3 bucket name.");
    console.error("Usage: node deploy.js <bucket-name>");
    process.exit(1);
}

if (!fs.existsSync(DIST_DIR)) {
    console.error("❌ Error: dist/ directory not found. Run ./package.sh first.");
    process.exit(1);
}

const s3Client = new S3Client({ region: REGION });
const stsClient = new STSClient({ region: REGION });
const cfClient = new CloudFrontClient({ region: REGION });

async function checkCredentials() {
    try {
        console.log("🔍 Checking AWS credentials...");
        const command = new GetCallerIdentityCommand({});
        const response = await stsClient.send(command);
        console.log(`✅ Authenticated as: ${response.Arn}`);
        return true;
    } catch (err) {
        console.error("\n❌ AWS Authentication Failed!");
        if (err.message.includes("ExpiredToken") || err.message.includes("session has expired")) {
            console.error("💡 Your AWS session has expired.");
        } else {
            console.error(`Error: ${err.message}`);
        }
        console.error("\n👉 Please run: aws login");
        console.error("   (Or ensure your AWS credentials are appropriately configured)\n");
        return false;
    }
}

async function invalidateCloudFront() {
    if (!CLOUDFRONT_DISTRIBUTION_ID) {
        console.log("⚠️ No CloudFront Distribution ID provided. Skipping invalidation.");
        return true;
    }

    try {
        console.log(`🔄 Creating CloudFront invalidation for ${CLOUDFRONT_DISTRIBUTION_ID}...`);
        const command = new CreateInvalidationCommand({
            DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
            InvalidationBatch: {
                CallerReference: `deploy-${Date.now()}`,
                Paths: {
                    Quantity: 1,
                    Items: ["/*"],
                },
            },
        });
        await cfClient.send(command);
        console.log("✅ CloudFront invalidation triggered successfully.");
        return true;
    } catch (err) {
        console.error("❌ Failed to create CloudFront invalidation:", err.message);
        return false;
    }
}

async function uploadFile(filePath, bucketKey) {
    const fileContent = fs.readFileSync(filePath);
    const contentType = mime.lookup(filePath) || "application/octet-stream";

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: bucketKey,
        Body: fileContent,
        ContentType: contentType,
    });

    try {
        await s3Client.send(command);
        console.log(`✅ Uploaded: ${bucketKey} (${contentType})`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to upload ${bucketKey}:`, err.message);
        return false;
    }
}

async function walk(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat.isDirectory()) {
            await walk(filepath, callback);
        } else {
            await callback(filepath);
        }
    }
}

async function deploy() {
    // 1. Pre-flight check
    const isAuthenticated = await checkCredentials();
    if (!isAuthenticated) {
        process.exit(1);
    }

    console.log(`🚀 Deploying to S3 bucket: ${BUCKET_NAME}...`);

    let successCount = 0;
    let failCount = 0;
    const filePaths = [];

    await walk(DIST_DIR, async (filePath) => {
        filePaths.push(filePath);
    });

    for (const filePath of filePaths) {
        const relativePath = path.relative(DIST_DIR, filePath);
        const bucketKey = relativePath.split(path.sep).join("/");
        const success = await uploadFile(filePath, bucketKey);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    if (failCount > 0) {
        console.error(`\n⚠️ Deployment finished with S3 errors: ${successCount} succeeded, ${failCount} failed.`);
        process.exit(1);
    }

    // 2. CloudFront Invalidation
    const cfSuccess = await invalidateCloudFront();
    if (!cfSuccess) {
        console.error("⚠️ S3 upload succeeded, but CloudFront invalidation failed.");
        process.exit(1);
    }

    console.log("\n✨ Deployment fully complete!");
    console.log(`🌎 Your arcade is live at: http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com/`);
}

deploy().catch((err) => {
    console.error("❌ Fatal Error during deployment:", err);
    process.exit(1);
});
