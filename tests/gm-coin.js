const anchor = require('@project-serum/anchor');
const serumCmn = require("@project-serum/common");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { assert } = require('chai');

describe('gm-coin', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());


  let mint, originalVault, vault, vaultProgram, nonce;


  it('creates vault and vault program', async () => {
    // Add your test here.
    const program = anchor.workspace.GmCoin;
    const [_mint, _originalVault] = await serumCmn.createMintAndVault(
      program.provider,
      new anchor.BN(1_000_000)
    );
    const _vault = anchor.web3.Keypair.generate();

    let [_vaultProgram, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
      [_vault.publicKey.toBuffer()],
      program.programId
    )
    const tx = await program.rpc.initialize({
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
    mint = _mint;
    originalVault = _originalVault;
    vault = _vault;
    vaultProgram = _vaultProgram;
    nonce = _nonce;
  });

  it('all relevant variables are initialized', async () => {
    console.log({
      mint: mint.toString(),
      originalVault: originalVault.toString(),
      vault: {
        publicKey: vault.publicKey.toString(),
        secretKey: "🤫",
      },
      vaultProgram: vaultProgram.toString(),
      nonce
    })
    assert.equal(mint instanceof anchor.web3.PublicKey, true);
    assert.equal(originalVault instanceof anchor.web3.PublicKey, true);
    assert.equal(vault instanceof anchor.web3.Keypair, true);
    assert.equal(vaultProgram instanceof anchor.web3.PublicKey, true);
    assert.equal(nonce === undefined, false);
  });


});
