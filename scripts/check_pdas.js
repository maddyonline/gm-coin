const anchor = require("@project-serum/anchor");
const IDL = require("../target/idl/gm_coin.json");

const connection = new anchor.web3.Connection('https://api.devnet.solana.com')

const providerWallet = anchor.web3.Keypair.generate();
const provider = new anchor.Provider(
    connection,
    providerWallet,
    anchor.Provider.defaultOptions(),
);
const programId = new anchor.web3.PublicKey(IDL.metadata.address);
const program = new anchor.Program(IDL, programId, provider);

const publicKeys = [
    new anchor.web3.PublicKey("8HyEh6yhYvNPo1sTYQvEkSPARVgZB3JkVR6MdW13rk7d"),
    new anchor.web3.PublicKey("3rmNzCUDq2Dy59Xnet5vAbSWJXth1pvt43RrWbYrCKKx"),
]

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

        console.log(seedStr, pdaPublicKey.toString(), pdaNonce)
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

function main() {
    lookupPdas()
}

main()
