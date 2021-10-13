import React from 'react';
import { AnchorWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
const serumCmn = require("@project-serum/common");

const anchor = require("@project-serum/anchor");
const { SystemProgram, Connection } = anchor.web3;


const IDL = {
    "version": "0.0.0",
    "name": "xbasic_1",
    "instructions": [
        {
            "name": "introduceYourself",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "visitor",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "visitorState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "visitorBump",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "visit",
            "accounts": [
                {
                    "name": "visitor",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "visitorState",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "initialize",
            "accounts": [
                {
                    "name": "myAccount",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "data",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "update",
            "accounts": [
                {
                    "name": "myAccount",
                    "isMut": true,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "data",
                    "type": "u64"
                }
            ]
        },
        {
            "name": "createCheck",
            "accounts": [
                {
                    "name": "check",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "vault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "checkSigner",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "from",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "to",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "owner",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "memo",
                    "type": {
                        "option": "string"
                    }
                },
                {
                    "name": "nonce",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "cashCheck",
            "accounts": [
                {
                    "name": "check",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "vault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "checkSigner",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "to",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "owner",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        }
    ],
    "accounts": [
        {
            "name": "Check",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "from",
                        "type": "publicKey"
                    },
                    {
                        "name": "to",
                        "type": "publicKey"
                    },
                    {
                        "name": "amount",
                        "type": "u64"
                    },
                    {
                        "name": "memo",
                        "type": {
                            "option": "string"
                        }
                    },
                    {
                        "name": "vault",
                        "type": "publicKey"
                    },
                    {
                        "name": "nonce",
                        "type": "u8"
                    },
                    {
                        "name": "burned",
                        "type": "bool"
                    }
                ]
            }
        },
        {
            "name": "MyAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "data",
                        "type": "u64"
                    }
                ]
            }
        },
        {
            "name": "VisitorState",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "visitCount",
                        "type": "u64"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        }
    ],
    "errors": [
        {
            "code": 300,
            "name": "InvalidCheckNonce",
            "msg": "The given nonce does not create a valid program derived address."
        },
        {
            "code": 301,
            "name": "InvalidCheckSigner",
            "msg": "The derived check signer does not match that which was given."
        },
        {
            "code": 302,
            "name": "AlreadyBurned",
            "msg": "The given check has already been burned."
        },
        {
            "code": 303,
            "name": "InvalidMessage",
            "msg": "Sorry that doesn't look like a GM message."
        }
    ],
    "metadata": {
        "address": "2j4NMzDYQPLpS2HKLR7EnzPt5MXBt3fT9PeWTvUAznQp"
    }
}

export default function MainApp() {
    const anchorWallet = useAnchorWallet();
    const [mint, setMint] = React.useState(null);
    const [god, setGod] = React.useState(null);
    const doIt = async (anchorWallet: AnchorWallet) => {
        console.log("doing it");
        const provider = new anchor.Provider(
            new Connection('https://api.devnet.solana.com'),
            anchorWallet,
            anchor.Provider.defaultOptions(),
        );
        const programId = new anchor.web3.PublicKey(IDL.metadata.address);
        const program = new anchor.Program(IDL, programId, provider);
        console.log({ program });
        const myAccount = anchor.web3.Keypair.generate();
        const [visitorState, visitorBump] = await anchor.web3.PublicKey.findProgramAddress(
            [provider.wallet.publicKey.toBuffer(), "1"],
            program.programId
        );

        // const resp = await program.rpc.introduceYourself(new anchor.BN(visitorBump),
        //     {
        //         accounts: {
        //             payer: provider.wallet.publicKey,
        //             visitor: provider.wallet.publicKey,
        //             visitorState: visitorState,
        //             systemProgram: anchor.web3.SystemProgram.programId
        //         },
        //     }
        // );
        // console.log({ resp });
        async function visit() {
            await provider.connection.confirmTransaction(
                await program.rpc.visit(
                    {
                        accounts: {
                            visitor: provider.wallet.publicKey,
                            visitorState: visitorState
                        },
                    }
                ),
                "finalized"
            );
        }

        console.log("About to visit again, this takes a while for solana to finalize...");
        await visit();
        let visitorStateAccount = await program.account.visitorState.fetch(visitorState)
        console.log({ visitorStateAccount })
        await program.rpc.initialize(new anchor.BN(1234), {
            accounts: {
                myAccount: myAccount.publicKey,
                user: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            },
            signers: [myAccount],
        });
    }
    React.useEffect(() => {

        if (anchorWallet) {
            // doIt(anchorWallet);
        }
    }, [anchorWallet])
    return <>
        <div>hello</div>
        <div>{JSON.stringify(mint)}</div>
        <div>{JSON.stringify(god)}</div>
        <button onClick={async () => {
            const provider = new anchor.Provider(
                new Connection('https://api.devnet.solana.com'),
                anchorWallet,
                anchor.Provider.defaultOptions(),
            );
            const [mint, god] = await serumCmn.createMintAndVault(
                provider,
                new anchor.BN(1_000_000)
            );
            setMint(mint);
            setGod(god);
        }}>Create and mint</button>

    </>
}