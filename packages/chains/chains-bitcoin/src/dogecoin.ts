import { RenNetwork } from "@renproject/utils";

import { Blockchair, BlockchairNetwork } from "./APIs/blockchair";
import { SoChain, SoChainNetwork } from "./APIs/sochain";
import { BitcoinBaseChain } from "./base";
import {
    BitcoinNetworkConfig,
    BitcoinNetworkConfigMap,
    BitcoinNetworkInput,
} from "./utils/types";
import { resolveBitcoinNetworkConfig, SoChainExplorer } from "./utils/utils";

const DogecoinMainnet: BitcoinNetworkConfig = {
    label: "Dogecoin",

    selector: "Dogecoin",
    nativeAsset: {
        name: "Dogecoin",
        symbol: "DOGE",
        decimals: 8,
    },
    averageConfirmationTime: 60,
    explorer: SoChainExplorer("doge", "DOGE"),
    p2shPrefix: new Uint8Array([0x16]),
    providers: [
        new Blockchair(BlockchairNetwork.DOGECOIN),
        { api: new SoChain(SoChainNetwork.DOGE), priority: 15 },
    ],
    // validateAddress: (address: string) =>
    //     validateAddress(address, "DOGE", "mainnet"),
};

const DogecoinTestnet: BitcoinNetworkConfig = {
    label: "Dogecoin Testnet",

    selector: "Dogecoin",
    nativeAsset: {
        name: "Testnet Dogecoin",
        symbol: "DOGE",
        decimals: 8,
    },
    averageConfirmationTime: 60,
    isTestnet: true,
    explorer: SoChainExplorer("testnet/doge", "DOGETEST"),
    p2shPrefix: new Uint8Array([0xc4]),
    providers: [{ api: new SoChain(SoChainNetwork.DOGETEST), priority: 15 }],
    // validateAddress: (address: string) =>
    //     validateAddress(address, "DOGE", "testnet"),
};

export class Dogecoin extends BitcoinBaseChain {
    public static chain = "Dogecoin";
    public static configMap: BitcoinNetworkConfigMap = {
        [RenNetwork.Mainnet]: DogecoinMainnet,
        [RenNetwork.Testnet]: DogecoinTestnet,
        [RenNetwork.Devnet]: DogecoinTestnet,
    };
    public configMap = Dogecoin.configMap;

    public static assets = {
        DOGE: "DOGE",
    };
    public assets = Dogecoin.assets;

    public constructor({ network }: { network: BitcoinNetworkInput }) {
        super({
            network: resolveBitcoinNetworkConfig(Dogecoin.configMap, network),
        });
    }
}
