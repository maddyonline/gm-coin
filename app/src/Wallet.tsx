import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { WalletDialogProvider } from '@solana/wallet-adapter-material-ui';
import { AnchorWallet, ConnectionProvider, useConnection, WalletProvider } from '@solana/wallet-adapter-react';
import {
    getLedgerWallet,
    getPhantomWallet,
    getSlopeWallet,
    getSolflareWallet,
    getSolletWallet,
    getSolletExtensionWallet,
    getTorusWallet,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useSnackbar } from 'notistack';
import React, { FC, useCallback, useMemo } from 'react';
import Navigation from './Navigation';
import MainApp from './MainApp';
import { useAnchorWallet } from '@solana/wallet-adapter-react';

import {
    BrowserRouter as Router,
    Switch,
    Route,
} from "react-router-dom";
import { Button } from '@material-ui/core';

const {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    Token,
} = require("@solana/spl-token");


const serumCmn = require("@project-serum/common");


const anchor = require("@project-serum/anchor");
const { Connection } = anchor.web3;


const IDL = require("./gm_coin.json")


const toAccountDetails = (account: any) => ({
    amount: account.amount.toNumber(),
    owner: account.owner.toString(),
    mint: account.mint.toString(),
})



function RevisitPage() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [program, setProgram] = React.useState(null);
    const [mint, setMint] = React.useState(null);
    const [vault, setVault] = React.useState(null);
    const [originalVault, setOriginalVault] = React.useState(null);
    const [mintStr, setMintStr] = React.useState("")
    const [vaultStr, setVaultStr] = React.useState("")
    const [originalVaultStr, setOriginalVaultStr] = React.useState("")

    React.useEffect(() => {
        if (wallet && connection) {
            const provider = new anchor.Provider(
                connection,
                wallet,
                anchor.Provider.defaultOptions(),
            );
            console.log({ address: IDL.metadata.address })
            const programId = new anchor.web3.PublicKey(IDL.metadata.address);
            const program = new anchor.Program(IDL, programId, provider);
            setProgram(program);
        }

    }, [wallet, connection])

    const revisitInstruction = React.useCallback(async (
        program: any,
    ) => {
        let visitorTokenAccount;
        try {
            const associatedToken = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                mint,
                program.provider.wallet.publicKey
            );

            const client = new Token(
                program.provider.connection,
                mint,
                TOKEN_PROGRAM_ID,
                program.provider.wallet.publicKey
            );

            const account = await client.getAccountInfo(associatedToken);
            console.log({ account })
            visitorTokenAccount = account.address;
        } catch (error) {
            console.log(error);
            return;
        }

        let [vaultProgram, vaultProgramNonce] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("vault"))],
            program.programId
        )

        const [visitorState, _] = await anchor.web3.PublicKey.findProgramAddress(
            [program.provider.wallet.publicKey.toBuffer()],
            program.programId
        )
        const [_pda, __] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("gm_coin"))],
            program.programId
        );

        const tx = await program.rpc.visitAgain(vaultProgramNonce, {
            accounts: {
                globalState: _pda,
                visitor: program.provider.wallet.publicKey,
                visitorState,
                vault: new anchor.web3.PublicKey("DPgCpwZoRPj6SCumjBxoLZT68Jh9w7oWfzL8gsU9ePZH"),
                vaultProgram,
                to: visitorTokenAccount,
                owner: program.provider.wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            },
        });

        console.log("Revisit tx", tx);
        let visitorStateAccount = await program.account.visitorState.fetch(visitorState);
        console.log({
            visitorCount: visitorStateAccount.visitCount.toNumber(),
            lastVisit: visitorStateAccount.lastVisit.toNumber(),
        });
    }, [connection, mint, vault, originalVault]);
    return <div>
        <form onSubmit={(e) => {
            e.preventDefault();
            if (mintStr) {
                setMint(new anchor.web3.PublicKey(mintStr));
            }
            if (originalVaultStr) {
                setOriginalVault(new anchor.web3.PublicKey(originalVaultStr));
            }
            if (vaultStr) {
                setVault(new anchor.web3.PublicKey(vaultStr));
            }
            setMintStr("");
            setVaultStr("");
            setOriginalVaultStr("");

        }}>
            <div>
                <div>{
                    [
                        [mint, "mint"],
                        [vault, "vault"],
                        [originalVault, "original vault"]
                    ].filter(e => e[0])
                        .map(e => <li key={e[1]}><label>{e[1]} {e[0]?.toString()}</label></li>)
                }
                </div>
                <label>
                    Mint
                    <input type="text" name="mint" value={mintStr} onChange={(e) => setMintStr(e.target.value)} />
                </label>

            </div>
            <label>
                Vault
                <input type="text" name="vault" value={vaultStr} onChange={(e) => setVaultStr(e.target.value)} />
            </label>
            <label>
                Original Vault
                <input type="text" name="originalVault" value={originalVaultStr} onChange={e => setOriginalVaultStr(e.target.value)} />
            </label>
            <input type="submit" />
        </form>
        <div>{program && <Button onClick={async () => await revisitInstruction(program)}>Revisit</Button>} </div>
    </div>
}

const createTokenAccount = async (program: any, mint: any, setGMAccount: any, setMyAddress: any) => {
    const associatedToken = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        program.provider.wallet.publicKey
    );

    await program.rpc.initAssociatedToken({
        accounts: {
            token: associatedToken,
            mint: mint,
            payer: program.provider.wallet.publicKey,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        },
    });
    const client = new Token(
        program.provider.connection,
        mint,
        TOKEN_PROGRAM_ID,
        program.provider.wallet.publicKey
    );
    try {

        const account = await client.getAccountInfo(associatedToken);
        setGMAccount(toAccountDetails(account));
        window.account = account;
        setMyAddress(account.address.toString());

    } catch (error) {
        const errorMsg = (error as Error).message;
        setGMAccount({ error: errorMsg })
    }
}






function Home() {
    const wallet = useAnchorWallet();
    const [program, setProgram] = React.useState(null);
    const [myAddress, setMyAddress] = React.useState("");
    const [gmAccount, setGMAccount] = React.useState<{ error: string; } | { amount: any; owner: string; mint: string; } | null>(null);
    const [mint, setMint] = React.useState("2dTBAHogT1F7pdQ9NNeo4Joo8PHk4wefpu8VCztTtNYo");


    React.useEffect(() => {
        const updateAccount = async (mint: any, wallet: AnchorWallet) => {
            const connection = new Connection('https://api.devnet.solana.com');
            const associatedToken = await Token.getAssociatedTokenAddress(
                ASSOCIATED_TOKEN_PROGRAM_ID,
                TOKEN_PROGRAM_ID,
                mint,
                wallet.publicKey
            );
            const client = new Token(
                connection,
                mint,
                TOKEN_PROGRAM_ID,
                wallet.publicKey
            );
            try {

                const account = await client.getAccountInfo(associatedToken);
                setGMAccount(toAccountDetails(account));
                window.account = account;
                setMyAddress(account.address.toString());
            } catch (error) {
                const errorMsg = (error as Error).message;
                setGMAccount({ error: errorMsg })
            }
        }
        if (wallet) {
            const provider = new anchor.Provider(
                new Connection('https://api.devnet.solana.com'),
                wallet,
                anchor.Provider.defaultOptions(),
            );
            console.log({ address: IDL.metadata.address })
            const programId = new anchor.web3.PublicKey(IDL.metadata.address);
            const program = new anchor.Program(IDL, programId, provider);
            setProgram(program);
        }

        if (mint && wallet) {
            const mintPublicKey = new anchor.web3.PublicKey(mint);
            updateAccount(mintPublicKey, wallet);
        }

    }, [wallet])
    return <div>
        <div>{"My Address"} {myAddress}</div>
        <div>{JSON.stringify(gmAccount)}</div>
        <form onSubmit={(e) => {
            e.preventDefault();
            // console.log(e);
            console.log({ mint });
            setMint("");
        }}>

            <input value={mint} onChange={(e) => setMint(e.target.value)} name="mint" type="text" placeholder="mint" />
            <input type="submit" />
        </form>
        {program && <Button onClick={async () => {
            const [visitorState, _] = await anchor.web3.PublicKey.findProgramAddress(
                [(program as any).provider.wallet.publicKey.toBuffer()],
                (program as any).programId
            )
            let visitorStateAccount = await (program as any).account.visitorState.fetch(visitorState);
            if (visitorStateAccount) {
                console.log({
                    visitorCount: visitorStateAccount.visitCount.toNumber(),
                    lastVisit: visitorStateAccount.lastVisit.toNumber(),
                });
            } else {
                console.log({ visitorStateAccount })
            }
        }}>Fetch Visitor State</Button>}
        {program && wallet && <Button variant="outlined" color="secondary"
            onClick={async () => {
                const mintPublicKey = new anchor.web3.PublicKey(mint);
                await createTokenAccount(program, mintPublicKey, setGMAccount, setMyAddress);
            }}>Create Token Account</Button>}
    </div>
}





function FundAccount() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [program, setProgram] = React.useState(null);
    const [mint, setMint] = React.useState(null);
    const [vault, setVault] = React.useState(null);
    const [originalVault, setOriginalVault] = React.useState(null);
    const [mintStr, setMintStr] = React.useState("")
    const [vaultStr, setVaultStr] = React.useState("")
    const [originalVaultStr, setOriginalVaultStr] = React.useState("")

    React.useEffect(() => {
        if (wallet && connection) {
            const provider = new anchor.Provider(
                connection,
                wallet,
                anchor.Provider.defaultOptions(),
            );
            console.log({ address: IDL.metadata.address })
            const programId = new anchor.web3.PublicKey(IDL.metadata.address);
            const program = new anchor.Program(IDL, programId, provider);
            setProgram(program);
        }

    }, [wallet, connection])

    const fundInstruction = React.useCallback(async (program: any) => {
        if (!vault || !originalVault || !mint) {
            return;
        }
        let [vaultProgram, _] = await anchor.web3.PublicKey.findProgramAddress(
            [Buffer.from(anchor.utils.bytes.utf8.encode("vault"))],
            program.programId
        )
        const vaultProgramFetched = await connection.getAccountInfo(vaultProgram);
        console.log({ vaultProgramFetched })



        const amountToFund = new anchor.BN(10_000) // BN: BigNumber
        const tx = await program.rpc.fund(amountToFund, {
            accounts: {
                from: originalVault,
                vault,
                owner: program.provider.wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            },
        });
        console.log("Your transaction signature", tx);
    }, [connection, mint, vault, originalVault]);
    return <div>
        <form onSubmit={(e) => {
            e.preventDefault();
            if (mintStr) {
                setMint(new anchor.web3.PublicKey(mintStr));
            }
            if (originalVaultStr) {
                setOriginalVault(new anchor.web3.PublicKey(originalVaultStr));
            }
            if (vaultStr) {
                setVault(new anchor.web3.PublicKey(vaultStr));
            }
            setMintStr("");
            setVaultStr("");
            setOriginalVaultStr("");

        }}>
            <div>
                <div>{
                    [
                        [mint, "mint"],
                        [vault, "vault"],
                        [originalVault, "original vault"]
                    ].filter(e => e[0])
                        .map(e => <li key={e[1]}><label>{e[1]} {e[0]?.toString()}</label></li>)
                }
                </div>
                <label>
                    Mint
                    <input type="text" name="mint" value={mintStr} onChange={(e) => setMintStr(e.target.value)} />
                </label>

            </div>
            <label>
                Vault
                <input type="text" name="vault" value={vaultStr} onChange={(e) => setVaultStr(e.target.value)} />
            </label>
            <label>
                Original Vault
                <input type="text" name="originalVault" value={originalVaultStr} onChange={e => setOriginalVaultStr(e.target.value)} />
            </label>
            <input type="submit" />
        </form>
        <div>{program && <Button onClick={async () => await fundInstruction(program)}>Fund</Button>} </div>
    </div>
}

function RouterApp() {
    return (
        <Router>
            <Navigation />
            <Switch>
                <Route path="/admin">
                    <MainApp />
                </Route>
                <Route path="/fund">
                    <FundAccount />
                </Route>
                <Route path="/revisit">
                    <RevisitPage />
                </Route>
                <Route path="/">
                    <Home />
                </Route>
            </Switch>
        </Router>
    );
}


const Wallet: FC = () => {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);


    // @solana/wallet-adapter-wallets imports all the adapters but supports tree shaking --
    // Only the wallets you want to support will be compiled into your application
    const wallets = useMemo(
        () => [
            getPhantomWallet(),
            getSlopeWallet(),
            getSolflareWallet(),
            getTorusWallet({
                options: { clientId: 'Get a client ID @ https://developer.tor.us' },
            }),
            getLedgerWallet(),
            getSolletWallet({ network }),
            getSolletExtensionWallet({ network }),
        ],
        [network]
    );

    const { enqueueSnackbar } = useSnackbar();
    const onError = useCallback(
        (error: WalletError) => {
            enqueueSnackbar(error.message ? `${error.name}: ${error.message}` : error.name, { variant: 'error' });
            console.error(error);
        },
        [enqueueSnackbar]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} onError={onError} autoConnect>
                <WalletDialogProvider>


                    <RouterApp />

                </WalletDialogProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default Wallet;
