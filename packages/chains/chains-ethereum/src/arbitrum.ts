import { RenNetwork } from "@renproject/utils";

import { EthereumBaseChain } from "./base";
import { resolveEVMNetworkConfig } from "./utils/generic";
import {
    EthereumClassConfig,
    EthProvider,
    EthSigner,
    EVMNetworkConfig,
    EVMNetworkInput,
    populateEVMNetwork,
} from "./utils/types";

const arbitrumMainnetConfig: EVMNetworkConfig = populateEVMNetwork({
    selector: "Arbitrum",

    nativeAsset: { name: "Arbitrum Ether", symbol: "ArbETH", decimals: 18 },
    averageConfirmationTime: 4,

    config: {
        chainId: "0xa4b1",
        chainName: "Arbitrum One",
        nativeCurrency: { name: "Ether", symbol: "AETH", decimals: 18 },
        rpcUrls: [
            "https://arb1.arbitrum.io/rpc",
            "https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}",
            "https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}",
            "wss://arb1.arbitrum.io/ws",
        ],
        blockExplorerUrls: [
            "https://arbiscan.io",
            "https://explorer.arbitrum.io",
        ],
    },

    logRequestLimit: 20000,
    addresses: {
        GatewayRegistry: "0xf36666C230Fa12333579b9Bd6196CB634D6BC506",
        BasicBridge: "0x82DF02A52E2e76C0c233367f2fE6c9cfe51578c5",
    },
});

const arbitrumTestnetConfig: EVMNetworkConfig = populateEVMNetwork({
    selector: "Arbitrum",
    isTestnet: true,

    nativeAsset: {
        name: "Arbitrum Rinkeby Ether",
        symbol: "ArbETH",
        decimals: 18,
    },
    averageConfirmationTime: 4,

    config: {
        chainId: "0x66eeb",
        chainName: "Arbitrum Testnet Rinkeby",
        nativeCurrency: {
            name: "Arbitrum Rinkeby Ether",
            symbol: "ARETH",
            decimals: 18,
        },
        rpcUrls: [
            "https://rinkeby.arbitrum.io/rpc",
            "wss://rinkeby.arbitrum.io/ws",
        ],
        blockExplorerUrls: [
            "https://testnet.arbiscan.io/",
            "https://rinkeby-explorer.arbitrum.io",
        ],
    },

    logRequestLimit: 20000,
    addresses: {
        GatewayRegistry: "0x5076a1F237531fa4dC8ad99bb68024aB6e1Ff701",
        BasicBridge: "0xcb6bD6B6c7D7415C0157e393Bb2B6Def7555d518",
    },
});

/**
 * Arbitrum/arbETH configuration.
 */
export class Arbitrum extends EthereumBaseChain {
    public static chain = "Arbitrum";

    public static configMap = {
        [RenNetwork.Testnet]: arbitrumTestnetConfig,
        [RenNetwork.Mainnet]: arbitrumMainnetConfig,
    };
    public configMap = Arbitrum.configMap;

    public static assets = {
        ArbETH: "ArbETH",
    };
    public assets = Arbitrum.assets;

    public constructor({
        network,
        provider,
        signer,
        config,
    }: {
        network: EVMNetworkInput;
        provider: EthProvider;
        signer?: EthSigner;
        config?: EthereumClassConfig;
    }) {
        super({
            network: resolveEVMNetworkConfig(Arbitrum.configMap, network),
            provider,
            signer,
            config,
        });
    }
}
