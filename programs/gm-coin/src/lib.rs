use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, TokenAccount, Transfer};
use anchor_spl::token::{Mint, Token};

declare_id!("Ga2AwQnLartZJ2WtVP5hALiBNRo5AM4jkLah7gSVLkWi");

#[program]
pub mod gm_coin {
    use super::*;
    pub fn init_associated_token(ctx: Context<InitAssociatedToken>) -> ProgramResult {
        assert!(ctx.accounts.token.mint == ctx.accounts.mint.key());
        Ok(())
    }
    pub fn initialize(ctx: Context<Initialize>, bump: u8, cooloff_seconds: i64) -> ProgramResult {
        msg!("GM. instruction: [initialize]");
        msg!("args: bump={}, cooloff_seconds={}", bump, cooloff_seconds);
        let global_state = &mut ctx.accounts.global_state;
        global_state.bump = bump;
        global_state.cooloff_seconds = cooloff_seconds;
        Ok(())
    }
    pub fn fund(ctx: Context<FundVault>, amount: u64) -> ProgramResult {
        msg!("GM. instruction: [fund]");
        msg!("args: amount={}", amount);

        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info().clone(),
            to: ctx.accounts.vault.to_account_info().clone(),
            authority: ctx.accounts.owner.clone(),
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn first_visit(ctx: Context<FirstVisit>, visitor_bump: u8) -> ProgramResult {
        msg!("GM. instruction: [first_visit]");
        msg!("args: visitor_bump={}", visitor_bump);
        ctx.accounts.visitor_state.visit_count = 1;
        ctx.accounts.visitor_state.last_visit = ctx.accounts.clock.unix_timestamp;
        ctx.accounts.visitor_state.bump = visitor_bump;
        Ok(())
    }
    pub fn visit_again(ctx: Context<VisitAgain>, nonce: u8) -> ProgramResult {
        msg!("GM. instruction: [visit_again]");
        msg!("args: nonce={}", nonce);

        ctx.accounts.visitor_state.visit_count += 1;

        msg!(
            "GM {}, you've now visited {} times.",
            ctx.accounts.visitor.key,
            ctx.accounts.visitor_state.visit_count
        );
        let cooloff_seconds: i64 = ctx.accounts.global_state.cooloff_seconds;
        msg!("Current cooloffSeconds is {}", cooloff_seconds);

        if ctx.accounts.clock.unix_timestamp - ctx.accounts.visitor_state.last_visit
            > cooloff_seconds
        {
            msg!("GM! This GM is extra special. You get a reward.");
            ctx.accounts.visitor_state.last_visit = ctx.accounts.clock.unix_timestamp;
            let seeds = &[b"vault".as_ref(), &[nonce]];
            let signer = &[&seeds[..]];
            let cpi_accounts = Transfer {
                from: ctx.accounts.vault.to_account_info().clone(),
                to: ctx.accounts.to.to_account_info().clone(),
                authority: ctx.accounts.vault_program.clone(),
            };
            let cpi_program = ctx.accounts.token_program.clone();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, 10)?;
        }
        Ok(())
    }
}

#[test]
fn it_works() {
    assert_eq!(2 + 2, 4);
}

#[derive(Accounts)]
pub struct InitAssociatedToken<'info> {
    #[account(
        init,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub token: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct Initialize<'info> {
    #[account(init, seeds = [b"gm_coin".as_ref()], bump = bump, payer = payer, space = 8 + 8 + 1)]
    global_state: Account<'info, GlobalState>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundVault<'info> {
    #[account(mut, has_one = owner)]
    from: Account<'info, TokenAccount>,
    #[account(mut, constraint = from.mint == vault.mint)]
    vault: Account<'info, TokenAccount>,
    // Owner of the `from` token account.
    owner: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(visitor_bump: u8)]
pub struct FirstVisit<'info> {
    clock: Sysvar<'info, Clock>,
    payer: Signer<'info>,
    visitor: Signer<'info>,
    #[account(init, seeds = [visitor.key.as_ref()], bump = visitor_bump, payer = payer, space = 8 + 8 + 8 + 1)]
    visitor_state: Account<'info, VisitorState>,
    system_program: Program<'info, System>,
}

#[account]
pub struct VisitorState {
    visit_count: u64,
    last_visit: i64,
    bump: u8,
}

#[derive(Accounts)]
#[instruction(nonce: u8)]
pub struct VisitAgain<'info> {
    clock: Sysvar<'info, Clock>,
    #[account(
        seeds = [b"gm_coin".as_ref()],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    visitor: Signer<'info>,
    #[account(mut, seeds = [visitor.key.as_ref()], bump = visitor_state.bump)]
    visitor_state: Account<'info, VisitorState>,
    #[account(mut)]
    vault: AccountInfo<'info>,
    #[account(
        seeds = [b"vault".as_ref()],
        bump = nonce,
    )]
    vault_program: AccountInfo<'info>,
    #[account(mut, has_one = owner)]
    to: Account<'info, TokenAccount>,
    #[account(signer)]
    owner: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
}

#[account]
pub struct GlobalState {
    cooloff_seconds: i64,
    bump: u8,
}
