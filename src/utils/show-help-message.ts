import chalk from "chalk";

export const showHelpMessage = () => {
  console.log(` ${chalk.bold.blue("Usage:")}
    ${chalk.bold.green("npx create-stylus<@version>")} ${chalk.gray("[--skip | --skip-install] [-e <extension> | --extension <extension>] [-h | --help]")}
`);
  console.log(` ${chalk.bold.blue("Options:")}
    ${chalk.gray("--skip, --skip-install")}       Skip packages installation
    ${chalk.gray("-e, --extension")}              Choose contract extension (hello-world, erc20, erc721, multicall)
    ${chalk.gray("-h, --help")}                   Help
    `);
};
