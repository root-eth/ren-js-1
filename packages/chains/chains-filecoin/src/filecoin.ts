import { InputType } from "zlib";

import BigNumber from "bignumber.js";
import { blake2b } from "blakejs";
import elliptic from "elliptic";
import { CID } from "multiformats";

import {
    Address,
    decode as decodeAddress,
    encode as encodeAddress,
    validateAddressString,
} from "@glif/filecoin-address";
import FilecoinClient from "@glif/filecoin-rpc-client";
import {
    assertType,
    ChainTransaction,
    DepositChain,
    ErrorWithCode,
    InputChainTransaction,
    OutputType,
    populateChainTransaction,
    RenJSError,
    RenNetwork,
    RenNetworkString,
    utils,
} from "@renproject/utils";

import { FilTransaction } from "./utils/deposit";
import { Filfox } from "./utils/filfox";
import { fetchDeposits, fetchMessage, getHeight } from "./utils/lotus";
import { txidFormattedToTxid, txidToTxidFormatted } from "./utils/utils";

interface FilecoinConfig {}

export interface FilecoinNetworkConfig {
    selector: string;
    nativeAsset: {
        name: string;
        symbol: string;
        decimals: number;
    };
    averageConfirmationTime: number;
    addressPrefix: string;
    explorer: string;

    // RPC details
    rpc: {
        apiAddress: string;
        token?: string;
    };

    filfoxAPI?: string;
}

const isFilecoinNetworkConfig = (
    renNetwork: unknown,
): renNetwork is FilecoinNetworkConfig =>
    !!(renNetwork as FilecoinNetworkConfig).selector &&
    !!(renNetwork as FilecoinNetworkConfig).nativeAsset &&
    !!(renNetwork as FilecoinNetworkConfig).rpc &&
    !!(renNetwork as FilecoinNetworkConfig).addressPrefix &&
    !!(renNetwork as FilecoinNetworkConfig).explorer;

const FilecoinMainnet: FilecoinNetworkConfig = {
    selector: "Filecoin",

    nativeAsset: {
        name: "Filecoin",
        symbol: "FIL",
        decimals: 18,
    },

    averageConfirmationTime: 30,

    addressPrefix: "f",
    explorer: "https://filfox.info/en/",

    rpc: {
        apiAddress: `https://multichain-web-proxy.herokuapp.com/mainnet`,
    },

    filfoxAPI: "https://filfox.info/api/v1/",
};

const FilecoinTestnet: FilecoinNetworkConfig = {
    selector: "Filecoin",

    nativeAsset: {
        name: "Filecoin",
        symbol: "FIL",
        decimals: 18,
    },

    averageConfirmationTime: 30,

    addressPrefix: "t",
    explorer: "https://filfox.info/en/",

    rpc: {
        apiAddress: `https://multichain-web-proxy.herokuapp.com/testnet`,
    },
};

export type FilecoinInputPayload =
    | {
          chain: string;
          type?: "gatewayAddress";
      }
    | {
          chain: string;
          type: "transaction";
          params: {
              tx: ChainTransaction;
          };
      };

export interface FilecoinOutputPayload {
    chain: string;
    type?: "address";
    /**
     * @deprecated Use params.address instead.
     */
    address?: string;
    params?: {
        address: string;
    };
}

export class Filecoin
    implements DepositChain<FilecoinInputPayload, FilecoinOutputPayload>
{
    public static chain = "Filecoin";
    public chain: string;
    public static assets = {
        FIL: "FIL",
    };
    public assets = Filecoin.assets;

    public static configMap = {
        [RenNetwork.Mainnet]: FilecoinMainnet,
        [RenNetwork.Testnet]: FilecoinTestnet,
        [RenNetwork.Devnet]: FilecoinTestnet,
    };
    public configMap = Filecoin.configMap;

    public network: FilecoinNetworkConfig;

    public client: FilecoinClient;
    public clientOptions: FilecoinConfig;

    public filfox: Filfox | undefined;

    public constructor({
        network,
        options,
    }: {
        network: RenNetwork | RenNetworkString | FilecoinNetworkConfig;
        options?: FilecoinConfig;
    }) {
        const networkConfig = isFilecoinNetworkConfig(network)
            ? network
            : Filecoin.configMap[network];
        if (!networkConfig) {
            if (typeof network === "string") {
                throw new Error(`Invalid RenVM network ${network}.`);
            } else {
                throw new Error(`Invalid Filecoin network config.`);
            }
        }

        this.network = networkConfig;
        this.chain = this.network.selector;
        this.clientOptions = options || {};

        this.client = new FilecoinClient(this.network.rpc);

        if (this.network.filfoxAPI) {
            this.filfox = new Filfox(this.network.filfoxAPI);
        }
    }

    public validateAddress(address: string): boolean {
        return validateAddressString(address);
    }

    public validateTransaction(
        transaction: Partial<ChainTransaction> &
            ({ txid: string } | { txidFormatted: string }),
    ): boolean {
        return (
            (utils.isDefined(transaction.txid) ||
                utils.isDefined(transaction.txidFormatted)) &&
            (transaction.txidFormatted
                ? utils.fromBase64(
                      this.txidFormattedToTxid(transaction.txidFormatted),
                  ).length === 38
                : true) &&
            (transaction.txid
                ? utils.isURLBase64(transaction.txid, {
                      length: 38,
                  })
                : true) &&
            (transaction.txindex
                ? !new BigNumber(transaction.txindex).isNaN()
                : true) &&
            (transaction.txidFormatted && transaction.txid
                ? this.txidFormattedToTxid(transaction.txidFormatted) ===
                  transaction.txid
                : true) &&
            (transaction.txindex === undefined || transaction.txindex === "0")
        );
    }

    public addressExplorerLink(address: string): string {
        // TODO: Check network.
        return `https://filfox.info/en/address/${address}`;
    }

    public transactionExplorerLink({
        txid,
        txidFormatted,
    }: Partial<ChainTransaction> &
        ({ txid: string } | { txidFormatted: string })): string | undefined {
        const url = `https://filfox.info/en/message/`;
        if (txidFormatted) {
            return url + txidFormatted;
        } else if (txid) {
            return url + this.txidToTxidFormatted({ txid });
        }
        return undefined;
    }

    /**
     * See [[LockChain.isLockAsset]].
     */
    public isLockAsset(asset: string): boolean {
        return asset === this.network.nativeAsset.symbol;
    }

    private _assertAssetIsSupported(asset: string) {
        if (!this.isLockAsset(asset)) {
            throw new Error(`Asset ${asset} not supported on ${this.chain}.`);
        }
    }

    /**
     * See [[LockChain.assetDecimals]].
     */
    public assetDecimals(asset: string): number {
        this._assertAssetIsSupported(asset);
        return this.network.nativeAsset.decimals;
    }

    public async watchForDeposits(
        asset: string,
        fromPayload: FilecoinInputPayload,
        address: string,
        onInput: (input: InputChainTransaction) => void,
        _removeInput: (input: InputChainTransaction) => void,
        listenerCancelled: () => boolean,
    ): Promise<void> {
        this._assertAssetIsSupported(asset);
        if (fromPayload.chain !== this.chain) {
            throw new Error(
                `Invalid payload for chain ${fromPayload.chain} instead of ${this.chain}.`,
            );
        }

        // If the payload is a transaction, submit it to onInput and then loop
        // indefintely.
        if (fromPayload.type === "transaction") {
            const inputTx = fromPayload.params.tx;
            if ((inputTx as InputChainTransaction).amount === undefined) {
                while (true) {
                    let tx: FilTransaction;

                    try {
                        if (this.filfox) {
                            tx = await this.filfox.fetchMessage(
                                inputTx.txidFormatted,
                            );
                        } else {
                            tx = await fetchMessage(
                                this.client,
                                inputTx.txidFormatted,
                                this.network.addressPrefix,
                            );
                        }
                        onInput({
                            chain: this.chain,
                            txid: txidFormattedToTxid(tx.cid),
                            txidFormatted: tx.cid,
                            txindex: "0",

                            asset,
                            amount: tx.amount,
                        });
                        break;
                    } catch (error: unknown) {
                        console.error(error);
                    }
                }

                while (true) {
                    await utils.sleep(15 * utils.sleep.SECONDS);
                }
            }
        }

        // If there's too many logs to catch-up on, fetch the transactions from
        // Filfox (mainnet only)

        let progress = 0;

        while (true) {
            if (listenerCancelled()) {
                return;
            }

            let height: number = 0;
            try {
                height = await getHeight(this.client);
            } catch (error: unknown) {
                console.error(error);
            }

            const logLimit = 100;
            const fromBlock = height - logLimit;
            const logsToCatchUp = height - progress;
            let fetched = false;

            if (this.filfox && (logsToCatchUp > logLimit || height === 0)) {
                try {
                    const size = 100;
                    let page = 0;

                    while (true) {
                        const { deposits, totalCount } = await utils.tryNTimes(
                            async () => {
                                if (!this.filfox) {
                                    throw new Error(`Filfox not defined.`);
                                }
                                return this.filfox.fetchDeposits(
                                    address,
                                    page,
                                    size,
                                );
                            },
                            5,
                            5 * utils.sleep.SECONDS,
                        );

                        await Promise.all(
                            (deposits || []).map((tx) =>
                                onInput({
                                    chain: this.chain,
                                    txid: txidFormattedToTxid(tx.cid),
                                    txidFormatted: tx.cid,
                                    txindex: "0",

                                    asset,
                                    amount: tx.amount,
                                }),
                            ),
                        );

                        if (size * (page + 1) >= totalCount) {
                            break;
                        }

                        page += 1;

                        await utils.sleep(10 * utils.sleep.SECONDS);
                    }
                    fetched = true;
                } catch (error: unknown) {
                    // Ignore error.
                }
            }

            if (!fetched) {
                const txs: FilTransaction[] = await fetchDeposits(
                    this.client,
                    address,
                    this.network.addressPrefix,
                    fromBlock,
                    height,
                );

                await Promise.all(
                    (txs || []).map((tx) =>
                        onInput({
                            chain: this.chain,
                            txid: txidFormattedToTxid(tx.cid),
                            txidFormatted: tx.cid,
                            txindex: "0",

                            asset,
                            amount: tx.amount,
                        }),
                    ),
                );
            }

            progress = height;

            await utils.sleep(15 * utils.sleep.SECONDS);
        }
    }

    /**
     * See [[LockChain.transactionConfidence]].
     */
    public async transactionConfidence(
        transaction: ChainTransaction,
    ): Promise<BigNumber> {
        const cid = transaction.txidFormatted;
        let msg;
        try {
            msg = await fetchMessage(
                this.client,
                cid,
                this.network.addressPrefix,
            );
        } catch (error: unknown) {
            if (this.filfox) {
                try {
                    msg = await this.filfox.fetchMessage(cid);
                } catch (errorInner) {
                    console.error(errorInner);
                }
            }
            throw error;
        }
        return new BigNumber(msg.confirmations);
    }

    public isDepositAsset(asset: string): boolean {
        return asset === this.network.nativeAsset.symbol;
    }

    public getBalance(
        asset: string,
        address: string,
        // eslint-disable-next-line @typescript-eslint/require-await
    ): BigNumber {
        this._assertAssetIsSupported(asset);
        if (!this.validateAddress(address)) {
            throw new Error(`Invalid address ${address}.`);
        }
        // TODO: Implement.
        return new BigNumber(0);
    }

    /**
     * See [[LockChain.getGatewayAddress]].
     */
    public createGatewayAddress(
        asset: string,
        fromPayload: FilecoinInputPayload,
        shardPublicKey: Uint8Array,
        gHash: Uint8Array,
    ): string {
        this._assertAssetIsSupported(asset);
        if (fromPayload.chain !== this.chain) {
            throw new Error(
                `Invalid payload for chain ${fromPayload.chain} instead of ${this.chain}.`,
            );
        }

        const ec = new elliptic.ec("secp256k1");

        // Decode compressed RenVM public key.
        const renVMPublicKey = ec.keyFromPublic(shardPublicKey);

        // Interpret gHash as a private key.
        const gHashKey = ec.keyFromPrivate(gHash);

        // If `NO_PARAMS_FLAG` is set, set renVM public key and gHash public key,
        // and recreate key pair from resulting curve point.
        const derivedPublicKey = ec.keyFromPublic(
            renVMPublicKey
                .getPublic()
                .add(gHashKey.getPublic()) as unknown as elliptic.ec.KeyPair,
        );

        const bytes = new Uint8Array(
            blake2b(
                utils.fromHex(derivedPublicKey.getPublic(false, "hex")),
                null,
                20,
            ),
        );

        return this.bytesToAddress(bytes);
    }

    /**
     * See [[LockChain.addressToBytes]].
     */
    public addressToBytes(address: string): Uint8Array {
        return new Uint8Array(decodeAddress(address).str);
    }

    /**
     * See [[LockChain.addressToBytes]].
     */
    public bytesToAddress(bytes: Uint8Array): string {
        if (bytes.length === 21) {
            bytes = new Uint8Array(bytes.slice(1, 21));
        }
        // secp256k1 protocol prefix
        const protocol = 1;

        const addressObject = {
            str: utils.concat([new Uint8Array([protocol]), bytes]),
            protocol: () => protocol,
            payload: () => bytes,
        };

        return encodeAddress(
            this.network.addressPrefix,
            addressObject as unknown as Address,
        );
    }

    public txidFormattedToTxid(formattedTxid: string): string {
        return txidFormattedToTxid(formattedTxid);
    }

    public txidToTxidFormatted({ txid }: { txid: string }): string {
        return txidToTxidFormatted(txid);
    }
    public formattedTransactionHash = this.txidToTxidFormatted;

    public getOutputPayload(
        asset: string,
        _inputType: InputType,
        _outputType: OutputType,
        toPayload: FilecoinOutputPayload,
    ): {
        to: string;
        toBytes: Uint8Array;
        payload: Uint8Array;
    } {
        this._assertAssetIsSupported(asset);
        const address = toPayload.params
            ? toPayload.params.address
            : toPayload.address;
        if (!address) {
            throw new Error(`No ${this.chain} address specified.`);
        }
        return {
            to: address,
            toBytes: new Uint8Array(CID.parse(address).bytes),
            payload: new Uint8Array(),
        };
    }

    // Methods for initializing mints and burns ////////////////////////////////

    /**
     * When burning, you can call `Filecoin.Address("...")` to make the address
     * available to the burn params.
     *
     * @category Main
     */
    public Address(address: string): { chain: string; address: string } {
        // Type validation
        assertType<string>("string", { address });

        if (!this.validateAddress(address)) {
            throw ErrorWithCode.updateError(
                new Error(`Invalid ${this.chain} address: ${String(address)}`),
                RenJSError.PARAMETER_ERROR,
            );
        }

        return {
            chain: this.chain,
            address,
        };
    }

    /**
     * When burning, you can call `Filecoin.Address("...")` to make the address
     * available to the burn params.
     *
     * @category Main
     */
    public GatewayAddress(): FilecoinInputPayload {
        return {
            chain: this.chain,
        };
    }

    /**
     * Import an existing Filecoin transaction instead of watching for deposits
     * to a gateway address.
     *
     * @example
     * filecoin.Transaction({
     *   txidFormatted: "bafy2bzaceaoo4msi45t3pbhfov3guu5l34ektpjhuftyddy2rvhf2o5ajijle",
     * })
     */
    public Transaction(
        partialTx: Partial<ChainTransaction> &
            ({ txid: string } | { txidFormatted: string }),
    ): FilecoinInputPayload {
        return {
            chain: this.chain,
            type: "transaction",
            params: {
                tx: populateChainTransaction({
                    partialTx,
                    chain: this.chain,
                    txidToTxidFormatted,
                    txidFormattedToTxid,
                    defaultTxindex: "0",
                }),
            },
        };
    }
}
