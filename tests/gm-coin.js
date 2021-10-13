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

  it('funding vault works', async () => {
    const program = anchor.workspace.GmCoin;
    const amountToFund = new anchor.BN(10_000) // BN: BigNumber
    const tx = await program.rpc.fund(amountToFund, {
      accounts: {
        from: originalVault,
        vault: vault.publicKey,
        owner: program.provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });
    console.log("Your transaction signature", tx);
  });

  it('visits', async () => {
    const program = anchor.workspace.GmCoin;
    const visitor = anchor.web3.Keypair.generate();
    const visitorTokenAccount = await serumCmn.createTokenAccount(
      program.provider,
      mint,
      visitor.publicKey,
    );
    const [visitorState, visitorBump] = await anchor.web3.PublicKey.findProgramAddress(
      [visitor.publicKey.toBuffer()],
      program.programId
    );
    const tx = await program.rpc.firstVisit(nonce, visitorBump, {
      accounts: {
        payer: program.provider.wallet.publicKey,
        visitor: visitor.publicKey,
        visitorState,
        vault: vault.publicKey,
        vaultProgram,
        to: visitorTokenAccount,
        owner: visitor.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [visitor]
    });
    console.log("First tx. Sleeping ...", tx);
    await new Promise(r => setTimeout(r, 4000));
    console.log({ amount: (await serumCmn.getTokenAccount(program.provider, visitorTokenAccount)).amount.toNumber() });

    try {

      const tx2 = await program.rpc.firstVisit(nonce, visitorBump, {
        accounts: {
          payer: program.provider.wallet.publicKey,
          visitor: visitor.publicKey,
          visitorState,
          vault: vault.publicKey,
          vaultProgram,
          to: visitorTokenAccount,
          owner: visitor.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [visitor]
      });
      console.log("Second tx", tx2);
    } catch (error) {
      // TODO (maddy): throw better error
      console.log(`As expected, got error, reinitializing account a second time`, error)
      console.log({ amount: (await serumCmn.getTokenAccount(program.provider, visitorTokenAccount)).amount.toNumber() });

    }

    const revisit = async () => {
      const tx = await program.rpc.visitAgain(nonce, {
        accounts: {
          visitor: visitor.publicKey,
          visitorState,
          vault: vault.publicKey,
          vaultProgram,
          to: visitorTokenAccount,
          owner: visitor.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [visitor]
      });

      console.log("Revisit tx", tx);
      let visitorStateAccount = await program.account.visitorState.fetch(visitorState);
      console.log({
        visitorCount: visitorStateAccount.visitCount.toNumber(),
        lastVisit: visitorStateAccount.lastVisit.toNumber(),
      });
      console.log({ amount: (await serumCmn.getTokenAccount(program.provider, visitorTokenAccount)).amount.toNumber() });
    }

    await revisit();
    await revisit();
    await new Promise(r => setTimeout(r, 30 * 1000));
    await revisit();
    await revisit();
    await revisit();
    await revisit();



  });


});
