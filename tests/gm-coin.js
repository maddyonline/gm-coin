const anchor = require('@project-serum/anchor');
const serumCmn = require("@project-serum/common");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

describe('gm-coin', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());



  it('Is initialized!', async () => {
    // Add your test here.
    const program = anchor.workspace.GmCoin;
    const [mint, originalVault] = await serumCmn.createMintAndVault(
      program.provider,
      new anchor.BN(1_000_000)
    );
    const vault = anchor.web3.Keypair.generate();

    let [vaultProgram, nonce] = await anchor.web3.PublicKey.findProgramAddress(
      [vault.publicKey.toBuffer()],
      program.programId
    )
    const tx = await program.rpc.initialize({
      signers: [vault],
      instructions: [
        ...(await serumCmn.createTokenAccountInstrs(
          program.provider,
          vault.publicKey,
          mint,
          vaultProgram
        ))
      ]
    });
    console.log("Your transaction signature", tx);
  });


});
