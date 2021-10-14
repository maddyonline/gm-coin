import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { WalletDialogProvider } from '@solana/wallet-adapter-material-ui';
import { AnchorWallet, ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
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
import { stringify } from 'querystring';

const {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    Token,
} = require("@solana/spl-token");





const anchor = require("@project-serum/anchor");
const { Connection } = anchor.web3;


const IDL = require("./gm_coin.json")


const createTokenAccount = async (program: any, mint: any, setGMAccount: any) => {
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
        setGMAccount(account);
    } catch (error) {
        const errorMsg = (error as Error).message;
        setGMAccount({ error: errorMsg })
    }
}


function Home() {
    const wallet = useAnchorWallet();
    const [program, setProgram] = React.useState(null);
    const [gmAccount, setGMAccount] = React.useState<{ error: string; } | null>(null);
    const [mint, setMint] = React.useState("4J6rkqPDobhwHo234QKCWRyPynJwwFRxGmA1A8ZsXD87");


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
                setGMAccount(account);
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
        {program && <Button variant="outlined" color="secondary"
            onClick={async () => {
                const mintPublicKey = new anchor.web3.PublicKey(mint);
                await createTokenAccount(program, mintPublicKey, setGMAccount);
            }}>Create Token Account</Button>}
    </div>
}



function Users() {
    return <h2>Users</h2>;
}

function RouterApp() {
    return (
        <Router>
            <Navigation />
            <Switch>
                <Route path="/admin">
                    <MainApp />
                </Route>
                <Route path="/users">
                    <Users />
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
