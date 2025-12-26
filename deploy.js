const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
require("dotenv").config();

// Configuration
const BUCKET_NAME = process.argv[2];
const REGION = process.env.AWS_REGION || "us-east-1";
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
    } catch (err) {
        console.error(`❌ Failed to upload ${bucketKey}:`, err.message);
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
    console.log(`🚀 Deploying to S3 bucket: ${BUCKET_NAME}...`);

    await walk(DIST_DIR, async (filePath) => {
        // Calculate the S3 key (relative path from DIST_DIR)
        const relativePath = path.relative(DIST_DIR, filePath);
        // Replace backslashes with forward slashes for S3 keys (important on Windows, though user is on Mac)
        const bucketKey = relativePath.split(path.sep).join("/");
        await uploadFile(filePath, bucketKey);
    });

    console.log("\n✨ Deployment complete!");
    console.log(`🌎 Your arcade is live at: http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com/`);
}

deploy().catch((err) => {
    console.error("❌ Fatal Error during deployment:", err);
    process.exit(1);
});
