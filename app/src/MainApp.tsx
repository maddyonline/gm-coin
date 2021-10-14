import React from 'react';
import { AnchorWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Button } from '@material-ui/core';
const serumCmn = require("@project-serum/common");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

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


const Revisit = async (
    program: any,
    appState: any,
    setAppState: any,
    setPrintableAppState: any
) => {
    const { visitorTokenAccount, vaultTokenAccount } = appState;

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
            vault: vaultTokenAccount,
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
}

const FirstVisit = async (
    program: any,
    appState: any,
    setAppState: any,
    setPrintableAppState: any
) => {
    const { visitorTokenAccount, vaultTokenAccount } = appState;

    let [vaultProgram, vaultProgramNonce] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("vault"))],
        program.programId
    )

    const [visitorState, visitorBump] = await anchor.web3.PublicKey.findProgramAddress(
        [program.provider.wallet.publicKey.toBuffer()],
        program.programId
    )

    const tx = await program.rpc.firstVisit(vaultProgramNonce, visitorBump, {
        accounts: {
            payer: program.provider.wallet.publicKey,
            // visitor accounts
            visitor: program.provider.wallet.publicKey,
            visitorState,
            to: visitorTokenAccount,
            owner: program.provider.wallet.publicKey,
            // vault accounts
            vault: vaultTokenAccount,
            vaultProgram,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
    });
    console.log("First tx.", tx);

}

const VisitorInit = async (
    program: any,
    appState: any,
    setAppState: any,
    setPrintableAppState: any) => {
    const { mint } = appState;
    const [_visitorState, _visitorBump] = await anchor.web3.PublicKey.findProgramAddress(
        [program.provider.wallet.publicKey.toBuffer()],
        program.programId
    );

    const _visitorTokenAccount = await serumCmn.createTokenAccount(
        program.provider,
        mint,
        program.provider.wallet.publicKey,
    );
    setAppState({
        ...appState,
        visitorTokenAccount: _visitorTokenAccount,
        visitorState: _visitorState,
        visitorBump: _visitorBump,
    })


}

const Fund = async (program: any,
    appState: any,
    setAppState: any,
    setPrintableAppState: any) => {
    const { mint, originalVault } = appState;
    let [vaultProgram, _] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("vault"))],
        program.programId
    )
    const vaultProgramFetched = await (new Connection(connectionUrl)).getAccountInfo(vaultProgram);
    console.log({ vaultProgramFetched })

    // make vault program owner of vault (token account)
    const vaultTokenAccount = await serumCmn.createTokenAccount(program.provider, mint, vaultProgram);

    const amountToFund = new anchor.BN(10_000) // BN: BigNumber
    const tx = await program.rpc.fund(amountToFund, {
        accounts: {
            from: originalVault,
            vault: vaultTokenAccount,
            owner: program.provider.wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
        },
    });
    console.log("Your transaction signature", tx);
    setAppState({ ...appState, vaultTokenAccount });
}

const Mint = async (
    program: any,
    appState: any,
    setAppState: any,
    setPrintableAppState: any) => {


    const [mint, originalVault] = await serumCmn.createMintAndVault(
        program.provider,
        new anchor.BN(INITIAL_MINT_AMOUNT)
    );

    setPrintableAppState({
        mint: mint.toString(),
        originalVault: originalVault.toString(),
    });

    setAppState({ ...appState, mint, originalVault });
}


const Init = async (
    program: any,
    appState: any,
    setAppState: any,
    setPrintableAppState: any) => {


    // Create another PDA for storing global state (cooloffSeconds)
    const [_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("gm_coin"))],
        program.programId
    );
    const pdaAccount = await (new Connection(connectionUrl)).getAccountInfo(_pda);
    console.log({ pdaAccount })
    if (pdaAccount) {
        console.log("already init, returning early")
        return;
    }

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
    const [program, setProgram] = React.useState(null);
    const [printableAppState, setPrintableAppState] = React.useState({});


    React.useEffect(() => {
        if (anchorWallet) {
            const provider = new anchor.Provider(
                new Connection(connectionUrl),
                anchorWallet,
                anchor.Provider.defaultOptions(),
            );
            console.log({ address: IDL.metadata.address })
            const programId = new anchor.web3.PublicKey(IDL.metadata.address);
            const program = new anchor.Program(IDL, programId, provider);
            setProgram(program);
        }

    }, [anchorWallet])
    return <>
        <div>Hello</div>
        <div></div>
        <div>{JSON.stringify(printableAppState)}</div>
        {program && <Button variant="outlined" color="secondary" onClick={async () => await Mint(program, appState, setAppState, setPrintableAppState)}>Mint</Button>}
        {program && <Button variant="outlined" color="secondary" onClick={async () => await Init(program, appState, setAppState, setPrintableAppState)}>Init</Button>}
        {program && <Button variant="outlined" color="secondary" onClick={async () => await Fund(program, appState, setAppState, setPrintableAppState)}>Fund</Button>}
        {program && <Button variant="outlined" color="secondary" onClick={async () => await VisitorInit(program, appState, setAppState, setPrintableAppState)}>VisitorInit</Button>}
        {program && <Button variant="outlined" color="secondary" onClick={async () => await FirstVisit(program, appState, setAppState, setPrintableAppState)}>FirstVisit</Button>}
        {program && <Button variant="outlined" color="secondary" onClick={async () => await Revisit(program, appState, setAppState, setPrintableAppState)}>Revisit</Button>}

    </>
}