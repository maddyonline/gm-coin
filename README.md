# GM Coin

This deploys a smart contract on Solana to enable people to earn GM coin by just wishing "GM" on Solana blockchain.
Smart contract enforces a cool off period so one has to wait before earning rewards.

## Solana Instruction RPCs exposed

* `init_associated_token` : Used to create a de-facto associated token for the mint for a given public key.
* `initialize`: Initalize global variables for smart contract (e.g. `cooloff_seconds`).
* `fund`: Fund the vault from the original treasury/mint so it can be used to give GM tokens by the program.
* `first_visit`: Every GM user must make a "first visit". This initializes user-specific PDA to track user visits.
* `visit_again`: Every subsequent visit (1) records the visit count, (2) records the last timestamp of visit, (3) If `cooloff_seconds` have elapsed since last visit, reward user with `10 GM` coins.

## Frontend

See [frontend](https://github.com/maddyonline/gm-coin-frontend) repo.

## Notes

```
anchor build
anchor test
```
# Contact

DM me for any questions on [twitter](https://twitter.com/madhavjha).