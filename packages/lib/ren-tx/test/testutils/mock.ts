import { LockChain, MintChain } from "@renproject/interfaces";
import { fromHex } from "@renproject/utils";
import BigNumber from "bignumber.js";

const confirmationRegistry: number[] = [];
const getConfs = (id: number) => {
    return confirmationRegistry[id];
};

export const buildMockLockChain = (conf = { targetConfirmations: 50 }) => {
    const id = confirmationRegistry.length;
    confirmationRegistry[id] = 0;
    const transactionConfidence = () => {
        const confidence = {
            current: getConfs(id),
            target: conf.targetConfirmations,
        };
        return confidence;
    };

    const mockLockChain: LockChain = {
        name: "Bitcoin",
        assetDecimals: () => 1,
        utils: {
            addressIsValid: () => true,
            resolveChainNetwork: () => "testnet",
        },
        transactionFromID: () => {},
        transactionID: () =>
            "0xb5252f4b08fda457234a6da6fd77c3b23adf8b3f4e020615b876b28aa7ee6299",
        transactionConfidence,
        initialize: () => {
            return mockLockChain;
        },
        getDeposits: async (_a, _b, _c, onDeposit) => {
            await onDeposit({
                transaction: {
                    amount: "1",
                    txHash:
                        "0xb5252f4b08fda457234a6da6fd77c3b23adf8b3f4e020615b876b28aa7ee6299",
                },
                amount: "1",
            });
        },
        getGatewayAddress: () => "gatewayAddress",
        getPubKeyScript: () => Buffer.from("pubkey"),
        depositV1HashString: () => "v1HashString",
        legacyName: "Btc",
        assetIsNative: () => true,
        assetIsSupported: () => true,
        transactionRPCFormat: () => ({
            txid: fromHex(
                "0xb5252f4b08fda457234a6da6fd77c3b23adf8b3f4e020615b876b28aa7ee6299",
            ),
            txindex: "0",
        }),
        addressStringToBytes: (address: string): Buffer => Buffer.from(address),
    };
    return {
        mockLockChain,
        setConfirmations: (n: number) => {
            confirmationRegistry[id] = n;
        },
    };
};

export const buildMockMintChain = (minted?: boolean) => {
    const state = {
        currentLockConfs: 0,
    };
    const mockMintChain: MintChain = {
        name: "Ethereum",
        assetDecimals: () => 1,
        transactionID: () => "tid" + String(new Date().getTime()),
        utils: {
            addressIsValid: () => true,
            resolveChainNetwork: () => "testnet",
        },
        transactionFromID: () => {},
        // transactionID: () =>
        //     "0xb5252f4b08fda457234a6da6fd77c3b23adf8b3f4e020615b876b28aa7ee6299",
        transactionConfidence: () => ({ current: 0, target: 1 }),
        initialize: () => {
            return mockMintChain;
        },
        transactionRPCFormat: () => ({
            txid: fromHex(
                "0xb5252f4b08fda457234a6da6fd77c3b23adf8b3f4e020615b876b28aa7ee6299",
            ),
            txindex: "0",
        }),
        legacyName: "Eth",
        resolveTokenGatewayContract: () =>
            "0x0000000000000000000000000000000000000000",
        submitMint: (_asset, _calls, _tx, emitter) => {
            setTimeout(() => {
                emitter.emit(
                    "transactionHash",
                    "0xb5252f4b08fda457234a6da6fd77c3b23adf8b3f4e020615b876b28aa7ee6299",
                );
            }, 100);
        },
        findBurnTransaction: (_p, _d, emitter) => {
            setTimeout(() => {
                emitter.emit(
                    "transactionHash",
                    "0xb5252f4b08fda457234a6da6fd77c3b23adf8b3f4e020615b876b28aa7ee6299",
                );
            }, 1000);

            return {
                transaction: {
                    hash:
                        "0xb5252f4b08fda457234a6da6fd77c3b23adf8b3f4e020615b876b28aa7ee6299",
                },
                amount: new BigNumber(0),
                to: "asd",
                nonce: new BigNumber(0),
            };
        },
        // This will skip the deposit process if truthy
        findTransaction: () => minted,
        getFees: () => ({ burn: 10, mint: 10 }),
        getBalance: () => new BigNumber(1),
        assetIsNative: () => true,
        assetIsSupported: () => true,
        getMintParams: () => {
            return {
                contractCalls: [
                    {
                        sendTo: "0x0000000000000000000000000000000000000000",
                        contractFn: "nop",
                    },
                ],
            };
        },
    };
    return { mockMintChain, state };
};
