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

export const DogecoinMainnet: BitcoinNetworkConfig = {
    label: "Dogecoin",

    selector: "Dogecoin",
    nativeAsset: {
        name: "Dogecoin",
        symbol: "DOGE",
        decimals: 8,
    },
    explorer: SoChainExplorer("doge", "DOGE"),
    p2shPrefix: Buffer.from([0x16]),
    providers: [
        new Blockchair(BlockchairNetwork.DOGECOIN),
        { api: new SoChain(SoChainNetwork.DOGE), priority: 15 },
    ],
    // validateAddress: (address: string) =>
    //     validateAddress(address, "DOGE", "mainnet"),
};

export const DogecoinTestnet: BitcoinNetworkConfig = {
    label: "Dogecoin Testnet",

    selector: "Dogecoin",
    nativeAsset: {
        name: "Testnet Dogecoin",
        symbol: "DOGE",
        decimals: 8,
    },
    isTestnet: true,
    explorer: SoChainExplorer("testnet/doge", "DOGETEST"),
    p2shPrefix: Buffer.from([0xc4]),
    providers: [{ api: new SoChain(SoChainNetwork.DOGETEST), priority: 15 }],
    // validateAddress: (address: string) =>
    //     validateAddress(address, "DOGE", "testnet"),
};

export const DogecoinConfigMap: BitcoinNetworkConfigMap = {
    [RenNetwork.Mainnet]: DogecoinMainnet,
    [RenNetwork.Testnet]: DogecoinTestnet,
    [RenNetwork.Devnet]: DogecoinTestnet,
};

export class Dogecoin extends BitcoinBaseChain {
    public static chain = "Dogecoin";
    public static configMap = DogecoinConfigMap;
    public configMap = DogecoinConfigMap;

    public static assets = {
        DOGE: "DOGE",
    };
    public assets = Dogecoin.assets;

    constructor(network: BitcoinNetworkInput) {
        super(resolveBitcoinNetworkConfig(Dogecoin.configMap, network));
    }
}
