import { defineChain } from "viem";

export const arbitrumNitro = defineChain({
  id: 412346,
  name: "Arbitrum Nitro",
  network: "arbitrum-nitro",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://localhost:8547"],
    },
    public: {
      http: ["http://localhost:8547"],
    },
  },
});
