# 🏗 create-stylus-dapp

<h4 align="center">
  <a href="https://docs.scaffoldeth.io">Documentation</a> |
  <a href="https://scaffoldeth.io">Website</a>
</h4>

🧪 An open-source, up-to-date toolkit for building decentralized applications (dapps) on the Arbitrum blockchain. It's designed to make it easier for developers to create and deploy smart contracts and build user interfaces that interact with those contracts.

⚙️ Built using NextJS, RainbowKit, Stylus, Wagmi, Viem, and Typescript.

- ✅ **Contract Hot Reload**: Your frontend auto-adapts to your smart contract as you edit it.
- 🪝 **[Custom hooks](https://docs.scaffoldeth.io/hooks/)**: Collection of React hooks wrapper around [wagmi](https://wagmi.sh/) to simplify interactions with smart contracts with typescript autocompletion.
- 🧱 [**Components**](https://docs.scaffoldeth.io/components/): Collection of common web3 components to quickly build your frontend.
- 🔥 **Burner Wallet & Local Faucet**: Quickly test your application with a burner wallet and local faucet.
- 🔐 **Integration with Wallet Providers**: Connect to different wallet providers and interact with the Arbitrum network.

![Debug Contracts tab](https://github.com/scaffold-eth/scaffold-eth-2/assets/55535804/b237af0c-5027-4849-a5c1-2e31495cccb1)

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v18.17)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)
- [Rust](https://www.rust-lang.org/tools/install)
- [Docker](https://docs.docker.com/engine/install/)
- [Foundry Cast](https://getfoundry.sh/)

## Quickstart

To get started with create-stylus-dapp, follow the steps below:

1. Clone this repo & install dependencies

```
git clone https://github.com/Quantum3-Labs/create-stylus-dapp.git
cd create-stylus-dapp
yarn install
# Initialize submodules (required for Nitro dev node)
git submodule update --init --recursive
```

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Stylus-compatible network using the Nitro dev node script (`./packages/stylus/nitro-devnode/run-dev-node.sh`). The network runs on your local machine and can be used for testing and development. You can customize the Nitro dev node configuration in the `nitro-devnode` submodule.

3. On a second terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. The contract is located in `packages/stylus/src` and can be modified to suit your needs. The `yarn deploy` command uses the deploy script located in `packages/stylus/scripts` to deploy the contract to the network. You can also customize the deploy script.

4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the `Debug Contracts` page. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

Run smart contract test with `yarn stylus:test`

- Edit your smart contract `lib.rs` in `packages/stylus/src`
- Edit your frontend in `packages/nextjs/pages`
- Edit your deployment scripts in `packages/stylus/scripts`

## Documentation

Visit our [docs](#) to learn how to start building with create-stylus-dapp.

To know more about its features, check out our [website](https://scaffoldstylus.io).

## Contributing to create-stylus-dapp

We welcome contributions to create-stylus-dapp!

Please see [CONTRIBUTING.MD](https://github.com/Quantum3-Labs/create-stylus-dapp/blob/main/CONTRIBUTING.md) for more information and guidelines for contributing to create-stylus-dapp.
