import { execa } from "execa";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PATH = path.resolve(__dirname, "../bin/create-stylus-dapp.js");
const TEST_DIR = path.resolve(__dirname, "../test-output");

// Helper function to clean up test directories
const cleanupTestDirs = () => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
};

// Helper function to check if project was created correctly
const checkProjectStructure = (projectName, expectedExtension = "hello-world") => {
  const projectPath = path.join(TEST_DIR, projectName);

  // Check if project directory exists
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project directory ${projectName} was not created`);
  }

  // Check if packages/stylus exists
  const stylusPath = path.join(projectPath, "packages", "stylus");
  if (!fs.existsSync(stylusPath)) {
    throw new Error(`Stylus package directory was not created in ${projectName}`);
  }

  // Check if src files exist
  const srcPath = path.join(stylusPath, "src");
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source directory was not created in ${projectName}`);
  }

  // Check if lib.rs and main.rs exist
  const libRsPath = path.join(srcPath, "lib.rs");
  const mainRsPath = path.join(srcPath, "main.rs");
  if (!fs.existsSync(libRsPath)) {
    throw new Error(`lib.rs was not created in ${projectName}`);
  }
  if (!fs.existsSync(mainRsPath)) {
    throw new Error(`main.rs was not created in ${projectName}`);
  }

  // Check if Cargo.toml exists
  const cargoTomlPath = path.join(stylusPath, "Cargo.toml");
  if (!fs.existsSync(cargoTomlPath)) {
    throw new Error(`Cargo.toml was not created in ${projectName}`);
  }

  // Check if package.json exists
  const packageJsonPath = path.join(projectPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json was not created in ${projectName}`);
  }

  // Check if .git directory exists (git was initialized)
  const gitPath = path.join(projectPath, ".git");
  if (!fs.existsSync(gitPath)) {
    throw new Error(`Git repository was not initialized in ${projectName}`);
  }

  console.log(`✅ Project ${projectName} with ${expectedExtension} extension created successfully`);
};

// Test runner function
const runTest = async (testName, testFn) => {
  try {
    await testFn();
    console.log(`✅ ${testName} passed`);
    return true;
  } catch (error) {
    console.error(`❌ ${testName} failed:`, error.message);
    return false;
  }
};

// Main test suite
const runTests = async () => {
  console.log("🧪 Running Create Stylus CLI Tests...\n");

  let passedTests = 0;
  let totalTests = 0;

  // Build before running tests
  console.log("🔨 Building CLI...");
  await execa("npm", ["run", "build"]);

  // Clean up before tests
  cleanupTestDirs();

  // Test 1: Help command
  totalTests++;
  const helpTest = await runTest("Help command", async () => {
    const { stdout } = await execa(CLI_PATH, ["--help"]);
    if (!stdout.includes("Create Scaffold-Stylus app")) {
      throw new Error("Help message not found");
    }
    if (!stdout.includes("hello-world, erc20, erc721, multicall")) {
      throw new Error("Extension options not found in help");
    }
  });
  if (helpTest) passedTests++;

  // Test 2: Default extension project creation
  totalTests++;
  const defaultTest = await runTest("Default extension project creation", async () => {
    const projectName = "test-default";
    await execa(CLI_PATH, [projectName, "--skip-install"], { cwd: TEST_DIR });
    checkProjectStructure(projectName, "hello-world");
    fs.rmSync(path.join(TEST_DIR, projectName), { recursive: true, force: true });
  });
  if (defaultTest) passedTests++;

  // Test 3: Hello-world extension project creation
  totalTests++;
  const helloWorldTest = await runTest("Hello-world extension project creation", async () => {
    const projectName = "test-hello-world";
    await execa(CLI_PATH, [projectName, "--extension", "hello-world", "--skip-install"], { cwd: TEST_DIR });
    checkProjectStructure(projectName, "hello-world");
    fs.rmSync(path.join(TEST_DIR, projectName), { recursive: true, force: true });
  });
  if (helloWorldTest) passedTests++;

  // Test 4: ERC20 extension project creation
  totalTests++;
  const erc20Test = await runTest("ERC20 extension project creation", async () => {
    const projectName = "test-erc20";
    await execa(CLI_PATH, [projectName, "--extension", "erc20", "--skip-install"], { cwd: TEST_DIR });
    checkProjectStructure(projectName, "erc20");
    fs.rmSync(path.join(TEST_DIR, projectName), { recursive: true, force: true });
  });
  if (erc20Test) passedTests++;

  // Test 5: ERC721 extension project creation
  totalTests++;
  const erc721Test = await runTest("ERC721 extension project creation", async () => {
    const projectName = "test-erc721";
    await execa(CLI_PATH, [projectName, "--extension", "erc721", "--skip-install"], { cwd: TEST_DIR });
    checkProjectStructure(projectName, "erc721");
    fs.rmSync(path.join(TEST_DIR, projectName), { recursive: true, force: true });
  });
  if (erc721Test) passedTests++;

  // Test 6: Multicall extension project creation
  totalTests++;
  const multicallTest = await runTest("Multicall extension project creation", async () => {
    const projectName = "test-multicall";
    await execa(CLI_PATH, [projectName, "--extension", "multicall", "--skip-install"], { cwd: TEST_DIR });
    checkProjectStructure(projectName, "multicall");
    fs.rmSync(path.join(TEST_DIR, projectName), { recursive: true, force: true });
  });
  if (multicallTest) passedTests++;

  // Test 7: Skip install flag
  totalTests++;
  const skipInstallTest = await runTest("Skip install flag", async () => {
    const projectName = "test-skip-install";
    const { stdout } = await execa(CLI_PATH, [projectName, "--skip-install"], { cwd: TEST_DIR });
    if (!stdout.includes("Manually skipped, since `--skip-install` flag was passed")) {
      throw new Error("Skip install message not found");
    }
    checkProjectStructure(projectName);
    fs.rmSync(path.join(TEST_DIR, projectName), { recursive: true, force: true });
  });
  if (skipInstallTest) passedTests++;

  // Test 8: File structure validation
  totalTests++;
  const fileStructureTest = await runTest("File structure validation", async () => {
    const projectName = "test-file-structure";
    await execa(CLI_PATH, [projectName, "--skip-install"], { cwd: TEST_DIR });
    const projectPath = path.join(TEST_DIR, projectName);

    // Check for essential files
    const essentialFiles = [
      "package.json",
      "readme.md",
      ".gitignore",
      "yarn.lock",
      "packages/stylus/Cargo.toml",
      "packages/stylus/src/lib.rs",
      "packages/stylus/src/main.rs",
      "packages/nextjs/package.json",
    ];

    essentialFiles.forEach(file => {
      const filePath = path.join(projectPath, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Essential file ${file} was not created`);
      }
    });
    fs.rmSync(path.join(TEST_DIR, projectName), { recursive: true, force: true });
  });
  if (fileStructureTest) passedTests++;

  // Test 9: Invalid extension handling
  totalTests++;
  const invalidExtensionTest = await runTest("Invalid extension handling", async () => {
    const projectName = "test-invalid";
    try {
      await execa(CLI_PATH, [projectName, "--extension", "invalid-extension", "--skip-install"], { cwd: TEST_DIR });
      throw new Error("Should have thrown an error for invalid extension");
    } catch (error) {
      if (!error.stderr && !error.stdout.includes("Invalid extension format")) {
        throw new Error("Expected error for invalid extension not found");
      }
    }
  });
  if (invalidExtensionTest) passedTests++;

  // Test 10: Invalid project name handling
  totalTests++;
  const invalidNameTest = await runTest("Invalid project name handling", async () => {
    const projectName = "invalid-name!@#";
    try {
      await execa(CLI_PATH, [projectName, "--skip-install"], { cwd: TEST_DIR });
      throw new Error("Should have thrown an error for invalid project name");
    } catch (error) {
      if (!error.stderr && !error.stdout.includes("naming restrictions")) {
        throw new Error("Expected error for invalid project name not found");
      }
    }
  });
  if (invalidNameTest) passedTests++;

  // Clean up after tests
  cleanupTestDirs();

  // Print summary
  console.log(`\n📊 Test Summary: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! CLI is working correctly.");
    process.exit(0);
  } else {
    console.log("❌ Some tests failed. Please check the output above.");
    process.exit(1);
  }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error("Test runner failed:", error);
    process.exit(1);
  });
}

export { runTests };
