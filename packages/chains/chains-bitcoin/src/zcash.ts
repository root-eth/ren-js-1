import { RenNetwork } from "@renproject/utils";

import { Blockbook } from "./APIs/blockbook";
import { Blockchair, BlockchairNetwork } from "./APIs/blockchair";
import { Insight } from "./APIs/insight";
import { SoChain, SoChainNetwork } from "./APIs/sochain";
import { BitcoinBaseChain } from "./base";
import {
    BitcoinNetworkConfig,
    BitcoinNetworkConfigMap,
    BitcoinNetworkInput,
} from "./utils/types";
import { resolveBitcoinNetworkConfig, SoChainExplorer } from "./utils/utils";

export const ZcashMainnet: BitcoinNetworkConfig = {
    label: "Zcash",

    selector: "Zcash",
    nativeAsset: {
        name: "Zcash",
        symbol: "ZEC",
        decimals: 8,
    },
    explorer: SoChainExplorer("zcash", "ZEC"),
    p2shPrefix: Buffer.from([0x1c, 0xbd]),
    providers: [
        new Blockbook("https://zecblockexplorer.com/api/"),
        new Blockchair(BlockchairNetwork.ZCASH),
        { api: new SoChain(SoChainNetwork.ZEC), priority: 15 },
        { api: new Insight("https://explorer.z.cash/api/"), priority: 20 }, // TODO: test again, currently broken
        { api: new Insight("https://zechain.net/api/v1/"), priority: 20 }, // TODO: test again, currently broken
    ],
    // validateAddress: (address: string) =>
    //     validateAddress(address, "ZEC", "mainnet"),
};

export const ZcashTestnet: BitcoinNetworkConfig = {
    label: "Zcash Testnet",

    selector: "Zcash",

    nativeAsset: {
        name: "Testnet Zcash",
        symbol: "ZEC",
        decimals: 8,
    },

    isTestnet: true,
    explorer: SoChainExplorer("testnet/zcash", "ZECTEST"),
    p2shPrefix: Buffer.from([0x1c, 0xba]),
    providers: [
        new Insight("https://explorer.testnet.z.cash/api/"),
        { api: new SoChain(SoChainNetwork.ZECTEST), priority: 15 },
    ],
    // validateAddress: (address: string) =>
    //     validateAddress(address, "ZEC", "testnet"),
};

export const ZcashConfigMap: BitcoinNetworkConfigMap = {
    [RenNetwork.Mainnet]: ZcashMainnet,
    [RenNetwork.Testnet]: ZcashTestnet,
    [RenNetwork.Devnet]: ZcashTestnet,
};

export class Zcash extends BitcoinBaseChain {
    public static chain = "Zcash";
    public static configMap = ZcashConfigMap;
    public configMap = ZcashConfigMap;

    public static assets = {
        ZEC: "ZEC",
    };
    public assets = Zcash.assets;

    constructor(network: BitcoinNetworkInput) {
        super(resolveBitcoinNetworkConfig(Zcash.configMap, network));
    }
}
