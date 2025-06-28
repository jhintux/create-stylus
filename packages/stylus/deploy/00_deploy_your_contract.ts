import { execSync } from "child_process";
import { config as dotenvConfig } from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables from .env file
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenvConfig({ path: envPath });
}

interface DeploymentConfig {
  endpoint: string;
  privateKey: string;
  contractName: string;
  deploymentDir: string;
}

function getDeploymentConfig(): DeploymentConfig {
  return {
    endpoint: process.env.ENDPOINT || "http://localhost:8547",
    privateKey: process.env.PRIVATE_KEY || "0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659",
    contractName: process.env.CONTRACT_NAME || "stylus-hello-world",
    deploymentDir: process.env.DEPLOYMENT_DIR || "./packages/stylus/deployments",
  };
}

function ensureDeploymentDirectory(deploymentDir: string): void {
  const fullPath = path.resolve(__dirname, "..", deploymentDir);
  if (!fs.existsSync(fullPath)) {
    console.log(`📁 Creating deployment directory: ${fullPath}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

function executeCommand(command: string, cwd: string, description: string): string {
  console.log(`\n🔄 ${description}...`);
  console.log(`Executing: ${command}`);

  try {
    const output = execSync(command, {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    });

    console.log(`✅ ${description} completed successfully!`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error);
    throw error;
  }
}

export default async function deployStylusContract() {
  console.log("🚀 Starting Stylus contract deployment...");

  const config = getDeploymentConfig();

  console.log(`📡 Using endpoint: ${config.endpoint}`);
  console.log(`🔑 Using private key: ${config.privateKey.substring(0, 10)}...`);
  console.log(`📄 Contract name: ${config.contractName}`);
  console.log(`📁 Deployment directory: ${config.deploymentDir}`);

  try {
    // Ensure deployment directory exists
    ensureDeploymentDirectory(config.deploymentDir);

    // Step 1: Deploy the contract using cargo stylus
    const deployCommand = `cargo stylus deploy --endpoint='${config.endpoint}' --private-key='${config.privateKey}'`;
    const deployOutput = executeCommand(
      deployCommand,
      path.resolve(__dirname, ".."),
      "Deploying contract with cargo stylus",
    );

    console.log("Deploy output:", deployOutput);

    // Step 2: Export ABI
    const exportCommand = `cargo stylus export-abi --json ${config.deploymentDir}/${config.contractName}.json`;
    const exportOutput = executeCommand(exportCommand, path.resolve(__dirname, ".."), "Exporting ABI");

    console.log("Export output:", exportOutput);

    console.log("\n🎉 Deployment completed successfully!");
    console.log(`📄 ABI file location: ${config.deploymentDir}/${config.contractName}.json`);

    // Verify the ABI file was created
    const abiFilePath = path.resolve(__dirname, "..", config.deploymentDir, `${config.contractName}.json`);
    if (fs.existsSync(abiFilePath)) {
      console.log(`✅ ABI file verified at: ${abiFilePath}`);
    } else {
      console.warn(`⚠️  ABI file not found at expected location: ${abiFilePath}`);
    }
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Allow running this file directly
if (require.main === module) {
  deployStylusContract().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
