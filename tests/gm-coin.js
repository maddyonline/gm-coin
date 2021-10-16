const anchor = require('@project-serum/anchor');
const serumCmn = require("@project-serum/common");
const {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  Token,
} = require("@solana/spl-token");
const { assert } = require('chai');

describe('gm-coin', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  let mint, originalVault, vaultTokenAccount, vaultProgram, vaultProgramNonce;
  let visitor, visitorTokenAccount, visitorState, visitorBump;



  it('creates vault and vault program', async () => {
    const program = anchor.workspace.GmCoin;

    const [_mint, _originalVault] = await serumCmn.createMintAndVault(
      program.provider,
      new anchor.BN(1_000_000)
    );

    let [_vaultProgram, _vaultProgramNonce] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("vault"))],
      program.programId
    )

    // make vault program owner of vault (token account)
    const _vaultTokenAccount = await serumCmn.createTokenAccount(program.provider, _mint, _vaultProgram);

    // Create another PDA for storing global state (cooloffSeconds)
    const [_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("gm_coin"))],
      program.programId
    );
    const cooloffSeconds = new anchor.BN(30);
    const tx = await program.rpc.initialize(_bump, cooloffSeconds, {
      accounts: {
        globalState: _pda,
        payer: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    console.log("Your transaction signature", tx);
    mint = _mint;
    originalVault = _originalVault;
    vaultTokenAccount = _vaultTokenAccount;
    vaultProgram = _vaultProgram;
    vaultProgramNonce = _vaultProgramNonce;



  });

  it('all mint related variables are initialized', async () => {
    console.log({
      mint: mint.toString(),
      originalVault: originalVault.toString(),
      vault: vaultTokenAccount.toString(),
      vaultProgram: vaultProgram.toString(),
      vaultProgramNonce
    })
    assert.equal(mint instanceof anchor.web3.PublicKey, true);
    assert.equal(originalVault instanceof anchor.web3.PublicKey, true);
    assert.equal(vaultTokenAccount instanceof anchor.web3.PublicKey, true);
    assert.equal(vaultProgram instanceof anchor.web3.PublicKey, true);
    assert.equal(vaultProgramNonce === undefined, false);
  });

  it("Can create an associated token account", async () => {
    const program = anchor.workspace.GmCoin;
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
      program.provider.wallet.payer
    );
    const account = await client.getAccountInfo(associatedToken);
    assert.ok(account.state === 1);
    assert.ok(account.amount.toNumber() === 0);
    assert.ok(account.isInitialized);
    assert.ok(account.owner.equals(program.provider.wallet.publicKey));
    assert.ok(account.mint.equals(mint));
  });

  it("initializes visitor", async () => {
    const program = anchor.workspace.GmCoin;
    const _visitor = anchor.web3.Keypair.generate();
    const [_visitorState, _visitorBump] = await anchor.web3.PublicKey.findProgramAddress(
      [_visitor.publicKey.toBuffer()],
      program.programId
    );

    const _visitorTokenAccount = await serumCmn.createTokenAccount(
      program.provider,
      mint,
      _visitor.publicKey,
    );
    visitor = _visitor;
    visitorTokenAccount = _visitorTokenAccount;
    visitorState = _visitorState;
    visitorBump = _visitorBump;
  });



  it('funding vault works', async () => {
    const program = anchor.workspace.GmCoin;
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
  });

  it('first visit', async () => {
    const program = anchor.workspace.GmCoin;

    await program.rpc.firstVisit(visitorBump, {
      accounts: {
        payer: program.provider.wallet.publicKey,
        // visitor accounts
        visitor: visitor.publicKey,
        visitorState,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      signers: [visitor]
    });
  });

  it('first visit again', async () => {
    const program = anchor.workspace.GmCoin;
    try {
      await program.rpc.firstVisit(visitorBump, {
        accounts: {
          payer: program.provider.wallet.publicKey,
          // visitor accounts
          visitor: visitor.publicKey,
          visitorState,
          systemProgram: anchor.web3.SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [visitor]
      });
    } catch (error) {
      console.log(error);
    }

  });

  it('subsequent visits', async () => {
    const program = anchor.workspace.GmCoin;
    const revisit = async () => {
      const [_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("gm_coin"))],
        program.programId
      );

      const tx = await program.rpc.visitAgain(vaultProgramNonce, {
        accounts: {
          globalState: _pda,
          visitor: visitor.publicKey,
          visitorState,
          vault: vaultTokenAccount,
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
    console.log("sleeping for a while...")
    await new Promise(r => setTimeout(r, 30 * 1000));
    await revisit();
    await revisit();
    await revisit();
    await revisit();



  });


});
