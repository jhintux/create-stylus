import { execa, execaCommand } from 'execa';
import fs, { lstatSync, readdirSync, existsSync, promises } from 'fs';
import path, { basename, resolve } from 'path';
import mergeJsonStr from 'merge-packages';
import { fileURLToPath, pathToFileURL } from 'url';
import ncp from 'ncp';
import { promisify } from 'util';
import * as https from 'https';
import chalk from 'chalk';
import { Listr } from 'listr2';
import arg from 'arg';
import validateProjectName from 'validate-npm-package-name';
import inquirer from 'inquirer';
import semver from 'semver';

const findFilesRecursiveSync = (baseDir, criteriaFn = () => true) => {
    const subPaths = fs.readdirSync(baseDir);
    const files = subPaths.map(relativePath => {
        const fullPath = path.resolve(baseDir, relativePath);
        return fs.lstatSync(fullPath).isDirectory()
            ? [...findFilesRecursiveSync(fullPath, criteriaFn)]
            : criteriaFn(fullPath)
                ? [fullPath]
                : [];
    });
    return files.flat();
};

function mergePackageJson(targetPackageJsonPath, secondPackageJsonPath, isDev) {
    const existsTarget = fs.existsSync(targetPackageJsonPath);
    const existsSecond = fs.existsSync(secondPackageJsonPath);
    if (!existsTarget && !existsSecond) {
        return;
    }
    const targetPackageJson = existsTarget ? fs.readFileSync(targetPackageJsonPath, "utf8") : "{}";
    const secondPackageJson = existsSecond ? fs.readFileSync(secondPackageJsonPath, "utf8") : "{}";
    const mergedPkgStr = mergeJsonStr.default(targetPackageJson, secondPackageJson);
    const formattedPkgStr = JSON.stringify(JSON.parse(mergedPkgStr), null, 2);
    fs.writeFileSync(targetPackageJsonPath, formattedPkgStr, "utf8");
    if (isDev) {
        const devStr = `TODO: write relevant information for the contributor`;
        fs.writeFileSync(`${targetPackageJsonPath}.dev`, devStr, "utf8");
    }
}

const { mkdir, link } = promises;
const passesFilter = (source, options) => {
    const isDSStore = /\.DS_Store$/.test(source);
    if (isDSStore) {
        return false; // Exclude .DS_Store files
    }
    return options?.filter === undefined
        ? true // no filter
        : typeof options.filter === "function"
            ? options.filter(source) // filter is function
            : options.filter.test(source); // filter is regex
};
/**
 * The goal is that this function has the same API as ncp, so they can be used
 * interchangeably.
 *
 * - clobber not implemented
 */
const linkRecursive = async (source, destination, options) => {
    if (!passesFilter(source, options)) {
        return;
    }
    if (lstatSync(source).isDirectory()) {
        const subPaths = readdirSync(source);
        await Promise.all(subPaths.map(async (subPath) => {
            const sourceSubpath = path.join(source, subPath);
            const isSubPathAFolder = lstatSync(sourceSubpath).isDirectory();
            const destSubPath = path.join(destination, subPath);
            if (!passesFilter(destSubPath, options)) {
                return;
            }
            const existsDestSubPath = existsSync(destSubPath);
            if (isSubPathAFolder && !existsDestSubPath) {
                await mkdir(destSubPath);
            }
            await linkRecursive(sourceSubpath, destSubPath, options);
        }));
        return;
    }
    return link(source, destination);
};

var curatedExtension = [
	{
		extensionFlagValue: "subgraph",
		description: "This Scaffold-ETH 2 extension helps you build and test subgraphs locally for your contracts. It also enables interaction with the front-end and facilitates easy deployment to Subgraph Studio.",
		repository: "https://github.com/scaffold-eth/create-eth-extensions",
		branch: "subgraph"
	},
	{
		extensionFlagValue: "eip-712",
		description: "An implementation of EIP-712, allowing you to send, sign, and verify typed messages in a user-friendly manner.",
		repository: "https://github.com/scaffold-eth/create-eth-extensions",
		branch: "eip-712"
	},
	{
		extensionFlagValue: "ponder",
		description: "This Scaffold-ETH 2 extension comes pre-configured with ponder.sh, providing an example to help you get started quickly.",
		repository: "https://github.com/scaffold-eth/create-eth-extensions",
		branch: "ponder"
	},
	{
		extensionFlagValue: "onchainkit",
		description: "This Scaffold-ETH 2 extension comes pre-configured with onchainkit, providing an example to help you get started quickly.",
		repository: "https://github.com/scaffold-eth/create-eth-extensions",
		branch: "onchainkit"
	},
	{
		extensionFlagValue: "erc-20",
		description: "This extension introduces an ERC-20 token contract and demonstrates how to interact with it, including getting a holder balance and transferring tokens.",
		repository: "https://github.com/scaffold-eth/create-eth-extensions",
		branch: "erc-20"
	},
	{
		extensionFlagValue: "eip-5792",
		description: "This extension demonstrates on how to use EIP-5792 wallet capabilities. This EIP introduces new JSON-RPC methods for sending multiple calls from the user wallet, and checking their status",
		repository: "https://github.com/scaffold-eth/create-eth-extensions",
		branch: "eip-5792"
	},
	{
		extensionFlagValue: "randao",
		description: "This extension shows how to use on-chain randomness using RANDAO for truly on-chain unpredictable random sources.",
		repository: "https://github.com/scaffold-eth/create-eth-extensions",
		branch: "randao"
	},
	{
		extensionFlagValue: "erc-721",
		description: "This extension introduces an ERC-721 token contract and demonstrates how to use it, including getting the total supply and holder balance, listing all NFTs from the collection and NFTs from the connected address, and how to transfer NFTs.",
		repository: "https://github.com/scaffold-eth/create-eth-extensions",
		branch: "erc-721"
	},
	{
		extensionFlagValue: "challenge-0-simple-nft",
		description: "SpeedRunEthereum Challenge 0: Simple NFT Example.",
		repository: "https://github.com/scaffold-eth/se-2-challenges",
		branch: "challenge-0-simple-nft"
	},
	{
		extensionFlagValue: "challenge-1-decentralized-staking",
		description: "SpeedRunEthereum Challenge 1: Decentralized Staking App.",
		repository: "https://github.com/scaffold-eth/se-2-challenges",
		branch: "challenge-1-decentralized-staking"
	},
	{
		extensionFlagValue: "challenge-2-token-vendor",
		description: "SpeedRunEthereum Challenge 2: Token Vendor.",
		repository: "https://github.com/scaffold-eth/se-2-challenges",
		branch: "challenge-2-token-vendor"
	},
	{
		extensionFlagValue: "challenge-3-dice-game",
		description: "SpeedRunEthereum Challenge 3: Dice Game.",
		repository: "https://github.com/scaffold-eth/se-2-challenges",
		branch: "challenge-3-dice-game"
	},
	{
		extensionFlagValue: "challenge-4-dex",
		description: "SpeedRunEthereum Challenge 4: Build a DEX.",
		repository: "https://github.com/scaffold-eth/se-2-challenges",
		branch: "challenge-4-dex"
	},
	{
		extensionFlagValue: "challenge-5-state-channels",
		description: "SpeedRunEthereum Challenge 5: A State Channel Application.",
		repository: "https://github.com/scaffold-eth/se-2-challenges",
		branch: "challenge-5-state-channels"
	},
	{
		extensionFlagValue: "challenge-6-multisig",
		description: "SpeedRunEthereum Challenge 6: Multisig Wallet.",
		repository: "https://github.com/scaffold-eth/se-2-challenges",
		branch: "challenge-6-multisig"
	},
	{
		extensionFlagValue: "challenge-7-svg-nft",
		description: "SpeedRunEthereum Challenge 7: SVG NFT.",
		repository: "https://github.com/scaffold-eth/se-2-challenges",
		branch: "challenge-7-svg-nft"
	},
	{
		extensionFlagValue: "challenge-over-collateralized-lending",
		description: "SpeedRunEthereum Challenge: Over-collateralized Lending.",
		repository: "https://github.com/scaffold-eth/se-2-challenges",
		branch: "challenge-over-collateralized-lending"
	},
	{
		extensionFlagValue: "challenge-prediction-markets",
		description: "SpeedRunEthereum Challenge: Prediction Markets.",
		repository: "https://github.com/scaffold-eth/se-2-challenges",
		branch: "challenge-prediction-markets"
	}
];

const BASE_DIR = "base";
const EXTENSIONS_DIR = "extensions";
const STYLUS_EXTENSIONS = {
    HELLO_WORLD: "hello-world",
    ERC20: "erc20",
    ERC721: "erc721",
    MULTICALL: "multicall",
};

const TRUSTED_GITHUB_ORGANIZATIONS = ["scaffold-eth", "buidlguidl"];
const extensions = curatedExtension;
const CURATED_EXTENSIONS = extensions.reduce((acc, ext) => {
    if (!ext.repository) {
        throw new Error(`Extension must have 'repository': ${JSON.stringify(ext)}`);
    }
    if (!ext.extensionFlagValue) {
        throw new Error(`Extension must have 'extensionFlagValue': ${JSON.stringify(ext)}`);
    }
    acc[ext.extensionFlagValue] = {
        repository: ext.repository,
        branch: ext.branch,
    };
    return acc;
}, {});
function deconstructGithubUrl(url) {
    const urlParts = url.split("/");
    const ownerName = urlParts[3];
    const repoName = urlParts[4];
    const branch = urlParts[5] === "tree" ? urlParts[6] : undefined;
    return { ownerName, repoName, branch };
}
const validateExternalExtension = async (extensionName, dev) => {
    if (dev) {
        // Check externalExtensions/${extensionName} exists
        try {
            const currentFileUrl = import.meta.url;
            const externalExtensionsDirectory = path.resolve(decodeURI(fileURLToPath(currentFileUrl)), "../../externalExtensions");
            await fs.promises.access(`${externalExtensionsDirectory}/${extensionName}`);
        }
        catch {
            throw new Error(`Extension not found in "externalExtensions/${extensionName}"`);
        }
        return extensionName;
    }
    const { githubUrl, githubBranchUrl, branch, owner } = getDataFromExternalExtensionArgument(extensionName);
    const isTrusted = TRUSTED_GITHUB_ORGANIZATIONS.includes(owner.toLowerCase()) || !!CURATED_EXTENSIONS[extensionName];
    // Check if repository exists
    await new Promise((resolve, reject) => {
        https
            .get(githubBranchUrl, res => {
            if (res.statusCode !== 200) {
                reject(new Error(`Extension not found: ${githubUrl}`));
            }
            else {
                resolve(null);
            }
        })
            .on("error", err => {
            reject(err);
        });
    });
    return { repository: githubUrl, branch, isTrusted };
};
// Gets the data from the argument passed to the `--extension` option.
const getDataFromExternalExtensionArgument = (externalExtension) => {
    if (CURATED_EXTENSIONS[externalExtension]) {
        externalExtension = getArgumentFromExternalExtensionOption(CURATED_EXTENSIONS[externalExtension]);
    }
    const isGithubUrl = externalExtension.startsWith("https://github.com/");
    // Check format: owner/project:branch (branch is optional)
    const regex = /^[^/]+\/[^/]+(:[^/]+)?$/;
    if (!regex.test(externalExtension) && !isGithubUrl) {
        throw new Error(`Invalid extension format. Use "owner/project", "owner/project:branch" or github url.`);
    }
    let owner;
    let project;
    let branch;
    if (isGithubUrl) {
        const { ownerName, repoName, branch: urlBranch } = deconstructGithubUrl(externalExtension);
        owner = ownerName;
        project = repoName;
        branch = urlBranch;
    }
    else {
        // Extract owner, project and branch if format passed is owner/project:branch
        owner = externalExtension.split("/")[0];
        project = externalExtension.split(":")[0].split("/")[1];
        branch = externalExtension.split(":")[1];
    }
    const githubUrl = `https://github.com/${owner}/${project}`;
    let githubBranchUrl;
    if (branch) {
        githubBranchUrl = `https://github.com/${owner}/${project}/tree/${branch}`;
    }
    return {
        githubBranchUrl: githubBranchUrl ?? githubUrl,
        githubUrl,
        branch,
        owner,
        project,
    };
};
// Parse the externalExtensionOption object into a argument string.
// e.g. { repository: "owner/project", branch: "branch" } => "owner/project:branch"
const getArgumentFromExternalExtensionOption = (externalExtensionOption) => {
    const { repository, branch } = externalExtensionOption || {};
    const owner = repository?.split("/")[3];
    const project = repository?.split("/")[4];
    return `${owner}/${project}${branch ? `:${branch}` : ""}`;
};
// Gets the extension directories from the external extension repository
const getExtensionDirsFromExternalExtension = async (externalExtension) => {
    const extensions = Object.values(STYLUS_EXTENSIONS);
    const filterExtensionDirs = (dirs) => {
        return dirs.filter(dir => extensions.includes(dir)).reverse();
    };
    if (typeof externalExtension === "string") {
        const currentFileUrl = import.meta.url;
        const externalExtensionsDirectory = path.resolve(decodeURI(fileURLToPath(currentFileUrl)), "../../externalExtensions");
        const externalExtensionDirs = await fs.promises.readdir(`${externalExtensionsDirectory}/${externalExtension}/extension/packages`);
        return filterExtensionDirs(externalExtensionDirs);
    }
    const { branch, repository } = externalExtension;
    const { ownerName, repoName } = deconstructGithubUrl(repository);
    const extensionChecks = extensions.map(async (extension) => {
        const branchOrHead = branch ? `tree/${branch}` : "blob/HEAD";
        const githubUrl = `https://github.com/${ownerName}/${repoName}/${branchOrHead}/extension/packages/${extension}`;
        try {
            const res = await fetch(githubUrl);
            if (res.status === 200)
                return extension;
            if (res.status === 404)
                return null;
            throw new Error(`${extension.charAt(0).toUpperCase() + extension.slice(1)} extension check failed with status ${res.status}. You can verify it at ${githubUrl}.`);
        }
        catch (err) {
            console.warn(err.message);
            return extension;
        }
    });
    const results = await Promise.all(extensionChecks);
    const extensionDirs = results.filter((extension) => extension !== null);
    return extensionDirs;
};

const EXTERNAL_EXTENSION_TMP_DIR = "tmp-external-extension";
const copy = promisify(ncp);
let copyOrLink = copy;
const isTemplateRegex = /([^/\\]*?)\.template\./;
const isPackageJsonRegex = /package\.json/;
const isYarnLockRegex = /yarn\.lock/;
const isConfigRegex = /([^/\\]*?)\\config\.json/;
const isArgsRegex = /([^/\\]*?)\.args\./;
const isExtensionsFolderRegex = /extensions$/;
const isPackagesFolderRegex = /packages$/;
const isGitmodulesRegex = /\.gitmodules$/;
const isReadmeRegex = /readme\.md$/i;
const getExtensionPath = (extension, templatesDirectory) => path.resolve(templatesDirectory, EXTENSIONS_DIR, extension);
// Helper function to merge .gitmodules files
const mergeGitmodules = (targetGitmodulesPath, extensionGitmodulesPath) => {
    try {
        const targetExists = fs.existsSync(targetGitmodulesPath);
        const extensionExists = fs.existsSync(extensionGitmodulesPath);
        if (!targetExists && !extensionExists) {
            return;
        }
        const targetContent = targetExists ? fs.readFileSync(targetGitmodulesPath, "utf8") : "";
        const extensionContent = extensionExists ? fs.readFileSync(extensionGitmodulesPath, "utf8") : "";
        // Simple concatenation with a newline separator
        const mergedContent = targetContent + (targetContent && extensionContent ? "\n" : "") + extensionContent;
        if (mergedContent.trim()) {
            fs.writeFileSync(targetGitmodulesPath, mergedContent, "utf8");
        }
    }
    catch (error) {
        console.warn(`Warning: Failed to merge .gitmodules files: ${String(error)}`);
    }
};
// Helper function to handle README files
const handleReadmeFile = (targetReadmePath, extensionReadmePath) => {
    try {
        const extensionExists = fs.existsSync(extensionReadmePath);
        // If extension has a README, replace the target one
        if (extensionExists) {
            fs.copyFileSync(extensionReadmePath, targetReadmePath);
        }
        // If target doesn't exist but extension doesn't have one, do nothing (keep base)
    }
    catch (error) {
        console.warn(`Warning: Failed to handle README file: ${String(error)}`);
    }
};
// Helper function to copy file if it exists in extension
const copyFileIfExists = (extensionPath, targetPath, fileName) => {
    try {
        const extensionFilePath = path.join(extensionPath, fileName);
        const targetFilePath = path.join(targetPath, fileName);
        if (fs.existsSync(extensionFilePath)) {
            fs.copyFileSync(extensionFilePath, targetFilePath);
        }
    }
    catch (error) {
        console.warn(`Warning: Failed to copy ${fileName}: ${String(error)}`);
    }
};
const copyBaseFiles = async (basePath, targetDir, { dev: isDev }) => {
    await copyOrLink(basePath, targetDir, {
        clobber: false,
        filter: fileName => {
            const isTemplate = isTemplateRegex.test(fileName);
            const isYarnLock = isYarnLockRegex.test(fileName);
            const isPackageJson = isPackageJsonRegex.test(fileName);
            const skipDevOnly = isDev && (isYarnLock || isPackageJson);
            return !isTemplate && !skipDevOnly;
        },
    });
    if (isDev) {
        // We don't want symlink below files in dev mode
        const baseYarnLockPaths = findFilesRecursiveSync(basePath, path => isYarnLockRegex.test(path));
        baseYarnLockPaths.forEach(yarnLockPath => {
            const partialPath = yarnLockPath.split(basePath)[1];
            void copy(path.join(basePath, partialPath), path.join(targetDir, partialPath));
        });
        const basePackageJsonPaths = findFilesRecursiveSync(basePath, path => isPackageJsonRegex.test(path));
        basePackageJsonPaths.forEach(packageJsonPath => {
            const partialPath = packageJsonPath.split(basePath)[1];
            mergePackageJson(path.join(targetDir, partialPath), path.join(basePath, partialPath), isDev);
        });
    }
};
const copyExtensionFiles = async ({ dev: isDev }, extensionPath, targetDir) => {
    // copy (or link if dev) root files
    await copyOrLink(extensionPath, path.join(targetDir), {
        clobber: false,
        filter: path => {
            const isConfig = isConfigRegex.test(path);
            const isArgs = isArgsRegex.test(path);
            const isExtensionsFolder = isExtensionsFolderRegex.test(path) && fs.lstatSync(path).isDirectory();
            const isPackagesFolder = isPackagesFolderRegex.test(path) && fs.lstatSync(path).isDirectory();
            const isTemplate = isTemplateRegex.test(path);
            const isPackageJson = isPackageJsonRegex.test(path);
            const isGitmodules = isGitmodulesRegex.test(path);
            const isReadme = isReadmeRegex.test(path);
            const shouldSkip = isConfig ||
                isArgs ||
                isTemplate ||
                isPackageJson ||
                isExtensionsFolder ||
                isPackagesFolder ||
                isGitmodules ||
                isReadme;
            return !shouldSkip;
        },
    });
    // Handle .gitmodules files - merge with base
    const baseGitmodulesPath = path.join(targetDir, ".gitmodules");
    const extensionGitmodulesPath = path.join(extensionPath, ".gitmodules");
    mergeGitmodules(baseGitmodulesPath, extensionGitmodulesPath);
    // Handle README files - replace if extension has one, otherwise keep base
    const baseReadmePath = path.join(targetDir, "readme.md");
    const extensionReadmePath = path.join(extensionPath, "readme.md");
    handleReadmeFile(baseReadmePath, extensionReadmePath);
    // merge root package.json
    mergePackageJson(path.join(targetDir, "package.json"), path.join(extensionPath, "package.json"), isDev);
    const extensionPackagesPath = path.join(extensionPath, "packages");
    const hasPackages = fs.existsSync(extensionPackagesPath);
    if (hasPackages) {
        // copy extension packages files
        await copyOrLink(extensionPackagesPath, path.join(targetDir, "packages"), {
            clobber: false,
            filter: path => {
                const isArgs = isArgsRegex.test(path);
                const isTemplate = isTemplateRegex.test(path);
                const isPackageJson = isPackageJsonRegex.test(path);
                const isGitmodules = isGitmodulesRegex.test(path);
                const isReadme = isReadmeRegex.test(path);
                const shouldSkip = isArgs || isTemplate || isPackageJson || isGitmodules || isReadme;
                return !shouldSkip;
            },
        });
        // Handle .gitmodules and README files in packages
        const extensionPackages = fs.readdirSync(extensionPackagesPath);
        extensionPackages.forEach(packageName => {
            const packagePath = path.join(targetDir, "packages", packageName);
            const extensionPackagePath = path.join(extensionPath, "packages", packageName);
            // Merge package.json
            mergePackageJson(path.join(packagePath, "package.json"), path.join(extensionPackagePath, "package.json"), isDev);
            // Handle .gitmodules in package
            const packageGitmodulesPath = path.join(packagePath, ".gitmodules");
            const extensionPackageGitmodulesPath = path.join(extensionPackagePath, ".gitmodules");
            mergeGitmodules(packageGitmodulesPath, extensionPackageGitmodulesPath);
            // Handle README in package
            const packageReadmePath = path.join(packagePath, "README.md");
            const extensionPackageReadmePath = path.join(extensionPackagePath, "README.md");
            handleReadmeFile(packageReadmePath, extensionPackageReadmePath);
            // Handle Rust source files (lib.rs and main.rs) - replace if extension has them
            const extensionSrcPath = path.join(extensionPackagePath, "src");
            const targetSrcPath = path.join(packagePath, "src");
            if (fs.existsSync(extensionSrcPath)) {
                // Ensure target src directory exists
                if (!fs.existsSync(targetSrcPath)) {
                    fs.mkdirSync(targetSrcPath, { recursive: true });
                }
                // Copy Rust source files
                copyFileIfExists(extensionSrcPath, targetSrcPath, "lib.rs");
                copyFileIfExists(extensionSrcPath, targetSrcPath, "main.rs");
            }
            // Copy Rust project files
            copyFileIfExists(extensionPackagePath, packagePath, "Cargo.toml");
            copyFileIfExists(extensionPackagePath, packagePath, "Cargo.lock");
        });
    }
};
const processTemplatedFiles = async ({ extension, externalExtension, dev: isDev }, basePath, extensionPath, targetDir) => {
    const baseTemplatedFileDescriptors = findFilesRecursiveSync(basePath, path => isTemplateRegex.test(path)).map(baseTemplatePath => ({
        path: baseTemplatePath,
        fileUrl: pathToFileURL(baseTemplatePath).href,
        relativePath: baseTemplatePath.split(basePath)[1],
        source: "base",
    }));
    const extensionTemplatedFileDescriptors = extensionPath
        ? findFilesRecursiveSync(extensionPath, filePath => isTemplateRegex.test(filePath))
            .map(extensionTemplatePath => ({
            path: extensionTemplatePath,
            fileUrl: pathToFileURL(extensionTemplatePath).href,
            relativePath: extensionTemplatePath.split(extensionPath)[1],
            source: `extension ${extension}`,
        }))
            .flat()
        : [];
    const externalExtensionFolder = isDev
        ? typeof externalExtension === "string"
            ? path.join(basePath, "../../externalExtensions", externalExtension, "extension")
            : undefined
        : path.join(targetDir, EXTERNAL_EXTENSION_TMP_DIR, "extension");
    const externalExtensionTemplatedFileDescriptors = externalExtension && externalExtensionFolder
        ? findFilesRecursiveSync(externalExtensionFolder, filePath => isTemplateRegex.test(filePath)).map(extensionTemplatePath => ({
            path: extensionTemplatePath,
            fileUrl: pathToFileURL(extensionTemplatePath).href,
            relativePath: extensionTemplatePath.split(externalExtensionFolder)[1],
            source: `external extension ${isDev ? externalExtension : getArgumentFromExternalExtensionOption(externalExtension)}`,
        }))
        : [];
    await Promise.all([
        ...baseTemplatedFileDescriptors,
        ...extensionTemplatedFileDescriptors,
        ...externalExtensionTemplatedFileDescriptors,
    ].map(async (templateFileDescriptor) => {
        const templateTargetName = templateFileDescriptor.path.match(isTemplateRegex)?.[1];
        const argsPath = templateFileDescriptor.relativePath.replace(isTemplateRegex, `${templateTargetName}.args.`);
        const argsFileUrls = [];
        if (extensionPath) {
            const argsFilePath = path.join(extensionPath, argsPath);
            const fileExists = fs.existsSync(argsFilePath);
            if (fileExists) {
                argsFileUrls.push(pathToFileURL(argsFilePath).href);
            }
        }
        if (externalExtension) {
            const argsFilePath = isDev
                ? path.join(basePath, "../../externalExtensions", externalExtension, "extension", argsPath)
                : path.join(targetDir, EXTERNAL_EXTENSION_TMP_DIR, "extension", argsPath);
            const fileExists = fs.existsSync(argsFilePath);
            if (fileExists) {
                argsFileUrls?.push(pathToFileURL(argsFilePath).href);
            }
        }
        const args = await Promise.all(argsFileUrls.map(async (argsFileUrl) => (await import(argsFileUrl))));
        const fileTemplate = (await import(templateFileDescriptor.fileUrl)).default;
        if (!fileTemplate) {
            throw new Error(`Template ${templateTargetName} from ${templateFileDescriptor.source} doesn't have a default export`);
        }
        if (typeof fileTemplate !== "function") {
            throw new Error(`Template ${templateTargetName} from ${templateFileDescriptor.source} is not exporting a function by default`);
        }
        const allKeys = [...new Set(args.flatMap(Object.keys))];
        const freshArgs = Object.fromEntries(allKeys.map(key => [
            key, // INFO: key for the freshArgs object
            [], // INFO: initial value for the freshArgs object
        ]));
        const combinedArgs = args.reduce((accumulated, arg) => {
            Object.entries(arg).map(([key, value]) => {
                accumulated[key]?.push(value);
            });
            return accumulated;
        }, freshArgs);
        const output = fileTemplate(combinedArgs);
        const targetPath = path.join(targetDir, templateFileDescriptor.relativePath.split(templateTargetName)[0], templateTargetName);
        fs.writeFileSync(targetPath, output);
        if (isDev) {
            const hasCombinedArgs = Object.keys(combinedArgs).length > 0;
            const hasArgsPaths = argsFileUrls.length > 0;
            const devOutput = `--- TEMPLATE FILE
templates/${templateFileDescriptor.source}${templateFileDescriptor.relativePath}


--- ARGS FILES
${hasArgsPaths
                ? argsFileUrls.map(url => `\t- ${url.split("templates")[1] || url.split("externalExtensions")[1]}`).join("\n")
                : "(no args files writing to the template)"}


--- RESULTING ARGS
${hasCombinedArgs
                ? Object.entries(combinedArgs)
                    .map(([argName, argValue]) => `\t- ${argName}:\t[${argValue.join(",")}]`)
                    .join("\n")
                : "(no args sent for the template)"}
`;
            fs.writeFileSync(`${targetPath}.dev`, devOutput);
        }
    }));
};
const setUpExternalExtensionFiles = async (options, tmpDir) => {
    // 1. Create tmp directory to clone external extension
    await fs.promises.mkdir(tmpDir);
    const { repository, branch } = options.externalExtension;
    // 2. Clone external extension
    if (branch) {
        await execa("git", ["clone", "--branch", branch, repository, tmpDir], {
            cwd: tmpDir,
        });
    }
    else {
        await execa("git", ["clone", repository, tmpDir], { cwd: tmpDir });
    }
};
async function copyTemplateFiles(options, templateDir, targetDir) {
    copyOrLink = options.dev ? linkRecursive : copy;
    const basePath = path.join(templateDir, BASE_DIR);
    const tmpDir = path.join(targetDir, EXTERNAL_EXTENSION_TMP_DIR);
    // 1. Copy base template to target directory
    await copyBaseFiles(basePath, targetDir, options);
    // 2. Copy extension folder
    const extensionPath = options.extension && getExtensionPath(options.extension, templateDir);
    if (extensionPath) {
        await copyExtensionFiles(options, extensionPath, targetDir);
    }
    // 3. Set up external extension if needed
    if (options.externalExtension) {
        let externalExtensionPath = path.join(tmpDir, "extension");
        if (options.dev) {
            externalExtensionPath = path.join(templateDir, "../externalExtensions", options.externalExtension, "extension");
        }
        else {
            await setUpExternalExtensionFiles(options, tmpDir);
        }
        await copyExtensionFiles(options, externalExtensionPath, targetDir);
    }
    // 4. Process templated files and generate output
    await processTemplatedFiles(options, basePath, extensionPath, targetDir);
    // 5. Delete tmp directory
    if (options.externalExtension && !options.dev) {
        await fs.promises.rm(tmpDir, { recursive: true });
    }
    // 6. Initialize git repo to avoid husky error
    await execa("git", ["init"], { cwd: targetDir });
    await execa("git", ["checkout", "-b", "main"], { cwd: targetDir });
}

async function createProjectDirectory(projectName) {
    try {
        const result = await execa("mkdir", [projectName]);
        if (result.failed) {
            throw new Error("There was a problem running the mkdir command");
        }
    }
    catch (error) {
        throw new Error("Failed to create directory", { cause: error });
    }
    return true;
}

async function installPackages(targetDir, task) {
    const execute = execaCommand("yarn install", { cwd: targetDir });
    let outputBuffer = "";
    const chunkSize = 1024;
    execute?.stdout?.on("data", (data) => {
        outputBuffer += data.toString();
        if (outputBuffer.length > chunkSize) {
            outputBuffer = outputBuffer.slice(-1 * chunkSize);
        }
        const visibleOutput = outputBuffer
            .match(new RegExp(`.{1,${chunkSize}}`, "g"))
            ?.slice(-1)
            .map(chunk => chunk.trimEnd() + "\n")
            .join("") ?? outputBuffer;
        task.output = visibleOutput;
        if (visibleOutput.includes("Link step")) {
            task.output = chalk.yellow(`starting link step, this might take a little time...`);
        }
    });
    execute?.stderr?.on("data", (data) => {
        outputBuffer += data.toString();
        if (outputBuffer.length > chunkSize) {
            outputBuffer = outputBuffer.slice(-1 * chunkSize);
        }
        const visibleOutput = outputBuffer
            .match(new RegExp(`.{1,${chunkSize}}`, "g"))
            ?.slice(-1)
            .map(chunk => chunk.trimEnd() + "\n")
            .join("") ?? outputBuffer;
        task.output = visibleOutput;
    });
    await execute;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createFirstGitCommit(targetDir, options) {
    try {
        await execa("git", ["add", "-A"], { cwd: targetDir });
        await execa("git", ["commit", "-m", "Initial commit with 🏗️ Scaffold-Stylus", "--no-verify"], { cwd: targetDir });
    }
    catch (e) {
        // cast error as ExecaError to get stderr
        throw new Error("Failed to initialize git repository", {
            cause: e?.stderr ?? e,
        });
    }
}

// TODO: Instead of using execa, use prettier package from cli to format targetDir
async function prettierFormat(targetDir) {
    try {
        const result = await execa("yarn", ["format"], { cwd: targetDir });
        if (result.failed) {
            throw new Error("There was a problem running the format command");
        }
    }
    catch (error) {
        throw new Error("Failed to create directory", { cause: error });
    }
    return true;
}

function renderOutroMessage(options) {
    let message = `
  \n
  ${chalk.bold.green("Congratulations!")} Your project has been scaffolded! 🎉

  ${chalk.bold("Next steps:")}
  
  ${chalk.dim("cd")} ${options.project}
  `;
    if (!options.install) {
        message += `
    \t${chalk.bold("Install dependencies & format files")}
    \t${chalk.dim("yarn")} install && ${chalk.dim("yarn")} format
    `;
    }
    message += `
  \t${chalk.bold("Start the local development node")}
  \t${chalk.dim("yarn")} chain
  `;
    message += `
  \t${chalk.bold("In a new terminal window, deploy your contracts")}
  \t${chalk.dim("yarn")} deploy
  `;
    message += `
  \t${chalk.bold("In a new terminal window, start the frontend")}
  \t${chalk.dim("yarn")} start
  `;
    message += `
  ${chalk.bold.green("Thanks for using Scaffold-Stylus 🙏, Happy Building!")}
  `;
    console.log(message);
}

async function createProject(options) {
    console.log(`\n`);
    const currentFileUrl = import.meta.url;
    const templateDirectory = path.resolve(decodeURI(fileURLToPath(currentFileUrl)), "../../templates");
    const targetDirectory = path.resolve(process.cwd(), options.project);
    const tasks = new Listr([
        {
            title: `📁 Create project directory ${targetDirectory}`,
            task: () => createProjectDirectory(options.project),
        },
        {
            title: `🚀 Creating a new Scaffold-Stylus app in ${chalk.green.bold(options.project)}${options.externalExtension ? ` with the ${chalk.green.bold(options.dev ? options.externalExtension : getArgumentFromExternalExtensionOption(options.externalExtension))} extension` : ""}${options.extension ? ` with ${chalk.green.bold(options.extension)} contract` : ""}`,
            task: () => copyTemplateFiles(options, templateDirectory, targetDirectory),
        },
        {
            title: "📦 Installing dependencies with yarn, this could take a while",
            task: (_, task) => installPackages(targetDirectory, task),
            skip: () => {
                if (!options.install) {
                    return "Manually skipped, since `--skip-install` flag was passed";
                }
                return false;
            },
            rendererOptions: {
                outputBar: 8,
                persistentOutput: false,
            },
        },
        {
            title: "🪄 Formatting files",
            task: () => prettierFormat(targetDirectory),
            skip: () => {
                if (!options.install) {
                    return "Can't use source prettier, since `yarn install` was skipped";
                }
                return false;
            },
        },
        {
            title: "📡 Initializing Git repository",
            task: () => createFirstGitCommit(targetDirectory),
        },
    ], { rendererOptions: { collapseSkips: false, suffixSkips: true } });
    try {
        await tasks.run();
        renderOutroMessage(options);
    }
    catch (error) {
        console.log("%s Error occurred", chalk.red.bold("ERROR"), error);
        console.log("%s Exiting...", chalk.red.bold("Uh oh! 😕 Sorry about that!"));
    }
}

function validateNpmName(name) {
    const nameValidation = validateProjectName(basename(resolve(name)));
    if (nameValidation.validForNewPackages) {
        return { valid: true };
    }
    return {
        valid: false,
        problems: [...(nameValidation.errors || []), ...(nameValidation.warnings || [])],
    };
}

async function parseArgumentsIntoOptions(rawArgs) {
    const args = arg({
        "--skip-install": Boolean,
        "--skip": "--skip-install",
        "--dev": Boolean,
        "--extension": extensionHandler,
        "-e": "--extension",
        "--help": Boolean,
        "-h": "--help",
    }, {
        argv: rawArgs.slice(2),
    });
    const skipInstall = args["--skip-install"] ?? null;
    const dev = args["--dev"] ?? false; // info: use false avoid asking user
    const help = args["--help"] ?? false;
    let project = args._[0] ?? null;
    // Check if the extension is a built-in extension or external extension
    const extensionArg = args["--extension"];
    let extension = null;
    let externalExtension = null;
    if (extensionArg) {
        if (Object.values(STYLUS_EXTENSIONS).includes(extensionArg)) {
            extension = extensionArg;
        }
        else {
            // It's an external extension
            externalExtension = await validateExternalExtension(extensionArg, dev);
        }
    }
    // if dev mode, extension would be a string
    if (externalExtension && typeof externalExtension === "object" && !externalExtension.isTrusted) {
        console.log(chalk.yellow(` You are using a third-party extension. Make sure you trust the source of ${chalk.yellow.bold(externalExtension.repository)}\n`));
    }
    if (project) {
        const validation = validateNpmName(project);
        if (!validation.valid) {
            console.error(`Could not create a project called ${chalk.yellow(`"${project}"`)} because of naming restrictions:`);
            validation.problems.forEach(p => console.error(`${chalk.red(">>")} Project ${p}`));
            project = null;
        }
    }
    let extensionChoices = [
        STYLUS_EXTENSIONS.HELLO_WORLD,
        STYLUS_EXTENSIONS.ERC20,
        STYLUS_EXTENSIONS.ERC721,
        STYLUS_EXTENSIONS.MULTICALL,
    ];
    if (externalExtension) {
        const externalExtensionDirs = await getExtensionDirsFromExternalExtension(externalExtension);
        if (externalExtensionDirs.length !== 0) {
            extensionChoices = externalExtensionDirs;
        }
    }
    // Set install based on skipInstall flag
    let install = null;
    if (skipInstall !== null) {
        install = !skipInstall;
    }
    return {
        rawOptions: {
            project,
            install,
            dev,
            externalExtension,
            help,
            extension,
        },
        extensionChoices,
    };
}
const EXTENSION_OPTIONS = [...Object.values(STYLUS_EXTENSIONS), "none"];
function extensionHandler(value) {
    const lowercasedValue = value.toLowerCase();
    if (EXTENSION_OPTIONS.includes(lowercasedValue)) {
        return lowercasedValue;
    }
    // If it's not a built-in extension, return as is for external extension validation
    return value;
}

// default values for unspecified args
const defaultOptions = {
    project: "my-dapp-example",
    extension: null,
    install: true,
    dev: false,
    externalExtension: null,
    help: false,
};
async function promptForMissingOptions(options, extensionChoices) {
    const cliAnswers = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== null));
    const questions = [
        {
            type: "input",
            name: "project",
            message: "Your project name:",
            default: defaultOptions.project,
            validate: (name) => {
                const validation = validateNpmName(name);
                if (validation.valid) {
                    return true;
                }
                return "Project " + validation.problems[0];
            },
        },
        {
            type: "list",
            name: "extension",
            message: "What type of contract do you want to create?",
            choices: extensionChoices,
            default: STYLUS_EXTENSIONS.HELLO_WORLD,
        },
    ];
    // Only add install question if it's not already set via CLI arguments
    if (options.install === null) {
        questions.push({
            type: "confirm",
            name: "install",
            message: "Install packages?",
            default: true,
        });
    }
    const answers = await inquirer.prompt(questions, cliAnswers);
    const extension = options.extension ?? answers.extension;
    const mergedOptions = {
        project: options.project ?? answers.project,
        install: options.install ?? answers.install,
        dev: options.dev ?? defaultOptions.dev,
        extension: extension === "none" ? null : extension,
        externalExtension: options.externalExtension,
    };
    return mergedOptions;
}

const TITLE_TEXT = `
 ${chalk.bold.blue("+-+-+-+-+-+-+-+-+-+-+-+-+-+-+")}
 ${chalk.bold.blue("| Create Scaffold-Stylus app |")}
 ${chalk.bold.blue("+-+-+-+-+-+-+-+-+-+-+-+-+-+-+")}
`;
function renderIntroMessage() {
    console.log(TITLE_TEXT);
}

const checkSystemRequirements = async () => {
    const errors = [];
    try {
        const { stdout: nodeVersion } = await execa("node", ["--version"]);
        const cleanNodeVersion = nodeVersion.replace("v", "");
        if (semver.lt(cleanNodeVersion, "20.18.3")) {
            errors.push(`Node.js version must be >= 20.18.3. Current version: ${nodeVersion}`);
        }
    }
    catch {
        errors.push("Node.js is not installed. Please install Node.js >= 20.18.3");
    }
    try {
        const { stdout: yarnVersion } = await execa("yarn", ["--version"]);
        if (semver.lt(yarnVersion, "1.0.0")) {
            errors.push(`Yarn version should be >= 1.0.0. Recommended version is >= 2.0.0. Current version: ${yarnVersion}`);
        }
    }
    catch {
        errors.push("Yarn is not installed. Please install Yarn >= 1.0.0. Recommended version is >= 2.0.0");
    }
    try {
        await execa("git", ["--version"]);
        try {
            await execa("git", ["config", "user.name"]);
        }
        catch {
            errors.push("Git user.name is not configured. Please set it using: git config --global user.name 'Your Name'");
        }
        try {
            await execa("git", ["config", "user.email"]);
        }
        catch {
            errors.push("Git user.email is not configured. Please set it using: git config --global user.email 'your.email@example.com'");
        }
    }
    catch {
        errors.push("Git is not installed. Please install Git");
    }
    return { errors };
};

const showHelpMessage = () => {
    console.log(` ${chalk.bold.blue("Usage:")}
    ${chalk.bold.green("npx create-stylus<@version>")} ${chalk.gray("[--skip | --skip-install] [-e <extension> | --extension <extension>] [-h | --help]")}
`);
    console.log(` ${chalk.bold.blue("Options:")}
    ${chalk.gray("--skip, --skip-install")}       Skip packages installation
    ${chalk.gray("-e, --extension")}              Choose contract extension (hello-world, erc20, erc721, multicall)
    ${chalk.gray("-h, --help")}                   Help
    `);
};

async function cli(args) {
    try {
        renderIntroMessage();
        const { errors } = await checkSystemRequirements();
        if (errors.length > 0) {
            console.log(chalk.red("\n❌ Create-stylus requirements not met:"));
            errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
            process.exit(1);
        }
        const { rawOptions, extensionChoices } = await parseArgumentsIntoOptions(args);
        if (rawOptions.help) {
            showHelpMessage();
            return;
        }
        const options = await promptForMissingOptions(rawOptions, extensionChoices);
        await createProject(options);
    }
    catch (error) {
        console.error(chalk.red.bold(error.message || "An unknown error occurred."));
        return;
    }
}

export { cli };
//# sourceMappingURL=cli.js.map
