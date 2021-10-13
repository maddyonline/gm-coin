import React from 'react';
import { AnchorWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Button } from '@material-ui/core';
const serumCmn = require("@project-serum/common");

const IDL = require("./gm_coin.json");

const anchor = require("@project-serum/anchor");
const { SystemProgram, Connection } = anchor.web3;

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
    return;
    const _vault = anchor.web3.Keypair.generate();

    let [_vaultProgram, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
        [_vault.publicKey.toBuffer()],
        program.programId
    )

    const [_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("gm_coin"))],
        program.programId
    );
    const cooloffSeconds = new anchor.BN(COOLOFF_SECONDS);
    const tx = await program.rpc.initialize(_bump, cooloffSeconds, {
        accounts: {
            globalState: _pda,
            payer: program.provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [_vault],
        instructions: [
            ...(await serumCmn.createTokenAccountInstrs(
                program.provider,
                _vault.publicKey,
                _mint,
                _vaultProgram
            ))
        ]
    });
    console.log("Your transaction signature", tx);
    setAppState({
        ...appState,
        mint: _mint,
        originalVault: _originalVault,
        vault: _vault,
        vaultProgram: _vaultProgram,
        nonce: _nonce,
    })
    setPrintableAppState({
        mint: _mint.toString(),
        originalVault: _originalVault.toString(),
        vault: {
            publicKey: _vault.publicKey.toString(),
            secretKey: "🤫",
        },
        vaultProgram: _vaultProgram.toString(),
        _nonce
    })
}

export default function MainApp() {
    const anchorWallet = useAnchorWallet();
    const [appState, setAppState] = React.useState({});
    const [printableAppState, setPrintableAppState] = React.useState({});
    return <>
        <div>Hello</div>
        <div>{JSON.stringify(printableAppState)}</div>
        {anchorWallet && <Button variant="outlined" color="secondary" onClick={async () => await createMint(anchorWallet, appState, setAppState, setPrintableAppState)}>Mint</Button>}

    </>
}