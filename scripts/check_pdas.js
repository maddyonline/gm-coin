const anchor = require("@project-serum/anchor");
const IDL = require("../target/idl/gm_coin.json");

const connection = new anchor.web3.Connection('https://api.devnet.solana.com')

const provider = new anchor.Provider(
    connection,
    new anchor.Wallet(),
    anchor.Provider.defaultOptions(),
);
const programId = new anchor.web3.PublicKey(IDL.metadata.address);
const program = new anchor.Program(IDL, programId, provider);

const publicKeys = [
    new anchor.web3.PublicKey("8HyEh6yhYvNPo1sTYQvEkSPARVgZB3JkVR6MdW13rk7d"),
    new anchor.web3.PublicKey("3rmNzCUDq2Dy59Xnet5vAbSWJXth1pvt43RrWbYrCKKx"),
]


async function firstVisit() {
    const visitor = anchor.web3.Keypair.fromSecretKey(new Uint8Array([
        23, 190, 195, 120, 237, 88, 152, 138, 43, 106, 179,
        102, 58, 136, 246, 219, 46, 160, 8, 14, 167, 36,
        181, 189, 69, 213, 138, 250, 27, 111, 246, 85, 207,
        164, 82, 110, 157, 222, 39, 58, 222, 243, 92, 24,
        144, 123, 211, 7, 9, 149, 100, 183, 101, 47, 61,
        124, 39, 176, 177, 149, 91, 27, 220, 79
    ]))
    console.log(`visitor`, visitor.publicKey.toString());
    const provider = new anchor.Provider(
        new anchor.web3.Connection('https://api.devnet.solana.com'),
        new anchor.Wallet(visitor),
        anchor.Provider.defaultOptions(),
    );
    const programId = new anchor.web3.PublicKey(IDL.metadata.address);
    const program = new anchor.Program(IDL, programId, provider);
    const [visitorState, visitorBump] = await anchor.web3.PublicKey.findProgramAddress(
        [visitor.publicKey.toBuffer()],
        program.programId
    )
    const tx = await program.rpc.firstVisit(visitorBump, {
        accounts: {
            payer: visitor.publicKey,
            // visitor accounts
            visitor: visitor.publicKey,
            visitorState,
            systemProgram: anchor.web3.SystemProgram.programId,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: []
    });
    console.log("First visit tx.", tx);

}

async function lookupPdas() {
    const pdas = [
        "gm_coin",
        "vault",
        ...publicKeys,
    ]
    for (const seedStr of pdas) {
        let buffer;
        if (typeof seedStr === "string") {
            buffer = Buffer.from(anchor.utils.bytes.utf8.encode(seedStr));
        } else if (seedStr instanceof anchor.web3.PublicKey) {
            buffer = seedStr.toBuffer();
        } else {
            throw new Error("Unrecognized type");
        }
        const [pdaPublicKey, pdaNonce] = await anchor.web3.PublicKey.findProgramAddress(
            [buffer],
            programId
        )

        console.log(typeof seedStr === 'string' ? seedStr : seedStr.toString(), pdaPublicKey.toString(), pdaNonce)
        try {
            const pdaAccount = await connection.getAccountInfo(pdaPublicKey)
            console.log({ pdaAccount })
            if (pdaAccount && pdaAccount.owner) {
                console.log(`owner: ${pdaAccount.owner}`)
            }
        } catch (error) {
            console.log(error)
        }
        console.log("---")
    }

}

async function main() {
    // lookupPdas()
    await firstVisit()
    // const keypair = anchor.web3.Keypair.generate();
    // console.log(keypair.secretKey);
    // console.log(keypair.publicKey.toString());
}

main()
