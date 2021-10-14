import React from 'react';
import { AnchorWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Button } from '@material-ui/core';
const serumCmn = require("@project-serum/common");

const IDL = require("./gm_coin.json");

const anchor = require("@project-serum/anchor");
const { SystemProgram, Connection } = anchor.web3;


declare global {
    interface Window {
        // add you custom properties and methods
        pdaAccount: any;
    }
}


const connectionUrl = 'https://api.devnet.solana.com';
const INITIAL_MINT_AMOUNT = 1_000_000;
const COOLOFF_SECONDS = 30;

const createMint = async (
    anchorWallet: AnchorWallet | undefined,
    appState: any,
    setAppState: any,
    setPrintableAppState: any) => {
    const provider = new anchor.Provider(
        new Connection(connectionUrl),
        anchorWallet,
        anchor.Provider.defaultOptions(),
    );
    console.log({ address: IDL.metadata.address })
    const programId = new anchor.web3.PublicKey(IDL.metadata.address);
    const program = new anchor.Program(IDL, programId, provider);

    const [_mint, _originalVault] = await serumCmn.createMintAndVault(
        program.provider,
        new anchor.BN(INITIAL_MINT_AMOUNT)
    );
    setPrintableAppState({
        mint: _mint.toString(),
        originalVault: _originalVault.toString(),
    });


    const [_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("gm_coin"))],
        program.programId
    );
    const pdaAccount = await (new Connection(connectionUrl)).getAccountInfo(_pda);
    console.log({ pdaAccount })
    window.pdaAccount = pdaAccount;
    const cooloffSeconds = new anchor.BN(COOLOFF_SECONDS);
    const tx = await program.rpc.initialize(_bump, cooloffSeconds, {
        accounts: {
            globalState: _pda,
            payer: program.provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
    });
    console.log("Your transaction signature", tx);

}

export default function MainApp() {
    const anchorWallet = useAnchorWallet();
    const [appState, setAppState] = React.useState({});
    const [printableAppState, setPrintableAppState] = React.useState({});
    return <>
        <div>Hello</div>
        <div></div>
        <div>{JSON.stringify(printableAppState)}</div>
        {anchorWallet && <Button variant="outlined" color="secondary" onClick={async () => await createMint(anchorWallet, appState, setAppState, setPrintableAppState)}>Mint</Button>}

    </>
}