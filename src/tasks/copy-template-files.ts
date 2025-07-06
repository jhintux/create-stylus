import { execa } from "execa";
import { ExternalExtension, Options, TemplateDescriptor } from "../types";
import { findFilesRecursiveSync } from "../utils/find-files-recursively";
import { mergePackageJson } from "../utils/merge-package-json";
import fs from "fs";
import { pathToFileURL } from "url";
import ncp from "ncp";
import path from "path";
import { promisify } from "util";
import link from "../utils/link";
import { getArgumentFromExternalExtensionOption } from "../utils/external-extensions";
import { BASE_DIR, EXTENSIONS_DIR } from "../utils/consts";

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

const getExtensionPath = (extension: string, templatesDirectory: string) =>
  path.resolve(templatesDirectory, EXTENSIONS_DIR, extension);

// Helper function to merge .gitmodules files
const mergeGitmodules = (targetGitmodulesPath: string, extensionGitmodulesPath: string) => {
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
  } catch (error) {
    console.warn(`Warning: Failed to merge .gitmodules files: ${String(error)}`);
  }
};

// Helper function to handle README files
const handleReadmeFile = (targetReadmePath: string, extensionReadmePath: string) => {
  try {
    const extensionExists = fs.existsSync(extensionReadmePath);
    // If extension has a README, replace the target one
    if (extensionExists) {
      fs.copyFileSync(extensionReadmePath, targetReadmePath);
    }
    // If target doesn't exist but extension doesn't have one, do nothing (keep base)
  } catch (error) {
    console.warn(`Warning: Failed to handle README file: ${String(error)}`);
  }
};

// Helper function to copy file if it exists in extension
const copyFileIfExists = (extensionPath: string, targetPath: string, fileName: string) => {
  try {
    const extensionFilePath = path.join(extensionPath, fileName);
    const targetFilePath = path.join(targetPath, fileName);
    if (fs.existsSync(extensionFilePath)) {
      fs.copyFileSync(extensionFilePath, targetFilePath);
    }
  } catch (error) {
    console.warn(`Warning: Failed to copy ${fileName}: ${String(error)}`);
  }
};

const copyBaseFiles = async (basePath: string, targetDir: string, { dev: isDev }: Options) => {
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

const copyExtensionFiles = async ({ dev: isDev }: Options, extensionPath: string, targetDir: string) => {
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
      const shouldSkip =
        isConfig ||
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

const processTemplatedFiles = async (
  { extension, externalExtension, dev: isDev }: Options,
  basePath: string,
  extensionPath: string | null,
  targetDir: string,
) => {
  const baseTemplatedFileDescriptors: TemplateDescriptor[] = findFilesRecursiveSync(basePath, path =>
    isTemplateRegex.test(path),
  ).map(baseTemplatePath => ({
    path: baseTemplatePath,
    fileUrl: pathToFileURL(baseTemplatePath).href,
    relativePath: baseTemplatePath.split(basePath)[1],
    source: "base",
  }));

  const extensionTemplatedFileDescriptors: TemplateDescriptor[] = extensionPath
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

  const externalExtensionTemplatedFileDescriptors: TemplateDescriptor[] =
    externalExtension && externalExtensionFolder
      ? findFilesRecursiveSync(externalExtensionFolder, filePath => isTemplateRegex.test(filePath)).map(
          extensionTemplatePath => ({
            path: extensionTemplatePath,
            fileUrl: pathToFileURL(extensionTemplatePath).href,
            relativePath: extensionTemplatePath.split(externalExtensionFolder)[1],
            source: `external extension ${isDev ? (externalExtension as string) : getArgumentFromExternalExtensionOption(externalExtension)}`,
          }),
        )
      : [];

  await Promise.all(
    [
      ...baseTemplatedFileDescriptors,
      ...extensionTemplatedFileDescriptors,
      ...externalExtensionTemplatedFileDescriptors,
    ].map(async templateFileDescriptor => {
      const templateTargetName = templateFileDescriptor.path.match(isTemplateRegex)?.[1] as string;

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
          ? path.join(basePath, "../../externalExtensions", externalExtension as string, "extension", argsPath)
          : path.join(targetDir, EXTERNAL_EXTENSION_TMP_DIR, "extension", argsPath);

        const fileExists = fs.existsSync(argsFilePath);
        if (fileExists) {
          argsFileUrls?.push(pathToFileURL(argsFilePath).href);
        }
      }

      const args = await Promise.all(
        argsFileUrls.map(async argsFileUrl => (await import(argsFileUrl)) as Record<string, any>),
      );

      const fileTemplate = (await import(templateFileDescriptor.fileUrl)).default as (
        args: Record<string, string[]>,
      ) => string;

      if (!fileTemplate) {
        throw new Error(
          `Template ${templateTargetName} from ${templateFileDescriptor.source} doesn't have a default export`,
        );
      }
      if (typeof fileTemplate !== "function") {
        throw new Error(
          `Template ${templateTargetName} from ${templateFileDescriptor.source} is not exporting a function by default`,
        );
      }

      const allKeys = [...new Set(args.flatMap(Object.keys))];

      const freshArgs: { [key: string]: string[] } = Object.fromEntries(
        allKeys.map(key => [
          key, // INFO: key for the freshArgs object
          [], // INFO: initial value for the freshArgs object
        ]),
      );

      const combinedArgs = args.reduce<typeof freshArgs>((accumulated, arg) => {
        Object.entries(arg).map(([key, value]) => {
          accumulated[key]?.push(value);
        });
        return accumulated;
      }, freshArgs);

      const output = fileTemplate(combinedArgs);

      const targetPath = path.join(
        targetDir,
        templateFileDescriptor.relativePath.split(templateTargetName)[0],
        templateTargetName,
      );
      fs.writeFileSync(targetPath, output);

      if (isDev) {
        const hasCombinedArgs = Object.keys(combinedArgs).length > 0;
        const hasArgsPaths = argsFileUrls.length > 0;
        const devOutput = `--- TEMPLATE FILE
templates/${templateFileDescriptor.source}${templateFileDescriptor.relativePath}


--- ARGS FILES
${
  hasArgsPaths
    ? argsFileUrls.map(url => `\t- ${url.split("templates")[1] || url.split("externalExtensions")[1]}`).join("\n")
    : "(no args files writing to the template)"
}


--- RESULTING ARGS
${
  hasCombinedArgs
    ? Object.entries(combinedArgs)
        .map(([argName, argValue]) => `\t- ${argName}:\t[${argValue.join(",")}]`)
        .join("\n")
    : "(no args sent for the template)"
}
`;
        fs.writeFileSync(`${targetPath}.dev`, devOutput);
      }
    }),
  );
};

const setUpExternalExtensionFiles = async (options: Options, tmpDir: string) => {
  // 1. Create tmp directory to clone external extension
  await fs.promises.mkdir(tmpDir);

  const { repository, branch } = options.externalExtension as ExternalExtension;

  // 2. Clone external extension
  if (branch) {
    await execa("git", ["clone", "--branch", branch, repository, tmpDir], {
      cwd: tmpDir,
    });
  } else {
    await execa("git", ["clone", repository, tmpDir], { cwd: tmpDir });
  }
};

export async function copyTemplateFiles(options: Options, templateDir: string, targetDir: string) {
  copyOrLink = options.dev ? link : copy;
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
      externalExtensionPath = path.join(
        templateDir,
        "../externalExtensions",
        options.externalExtension as string,
        "extension",
      );
    } else {
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
