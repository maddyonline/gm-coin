use anchor_lang::prelude::*;
use anchor_spl::token::{self, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod gm_coin {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }
    pub fn fund(ctx: Context<FundVault>, amount: u64) -> ProgramResult {
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

    pub fn first_visit(ctx: Context<FirstVisit>, nonce: u8, visitor_bump: u8) -> ProgramResult {
        ctx.accounts.visitor_state.visit_count = 1;
        ctx.accounts.visitor_state.bump = visitor_bump;
        let seeds = &[ctx.accounts.vault.to_account_info().key.as_ref(), &[nonce]];
        let signer = &[&seeds[..]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info().clone(),
            to: ctx.accounts.to.to_account_info().clone(),
            authority: ctx.accounts.vault_program.clone(),
        };
        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, 10)?;
        Ok(())
    }
    pub fn visit_again(ctx: Context<VisitAgain>, nonce: u8) -> ProgramResult {
        ctx.accounts.visitor_state.visit_count += 1;
        msg!(
            "Welcome back {}, you've now visited {} times.",
            ctx.accounts.visitor.key,
            ctx.accounts.visitor_state.visit_count
        );

        if ctx.accounts.visitor_state.visit_count % 3 == 0 {
            let seeds = &[ctx.accounts.vault.to_account_info().key.as_ref(), &[nonce]];
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

#[derive(Accounts)]
pub struct Initialize {}

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
#[instruction(nonce: u8, visitor_bump: u8)]
pub struct FirstVisit<'info> {
    payer: Signer<'info>,
    visitor: Signer<'info>,
    #[account(init, seeds = [visitor.key.as_ref()], bump = visitor_bump, payer = payer, space = 8 + 8 + 1)]
    visitor_state: Account<'info, VisitorState>,
    #[account(mut)]
    vault: AccountInfo<'info>,
    #[account(
        seeds = [vault.to_account_info().key.as_ref()],
        bump = nonce,
    )]
    vault_program: AccountInfo<'info>,
    #[account(mut, has_one = owner)]
    to: Account<'info, TokenAccount>,
    #[account(signer)]
    owner: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    system_program: Program<'info, System>,
}

#[account]
pub struct VisitorState {
    visit_count: u64,
    bump: u8,
}

#[derive(Accounts)]
#[instruction(nonce: u8)]
pub struct VisitAgain<'info> {
    visitor: Signer<'info>,
    #[account(mut, seeds = [visitor.key.as_ref()], bump = visitor_state.bump)]
    visitor_state: Account<'info, VisitorState>,
    #[account(mut)]
    vault: AccountInfo<'info>,
    #[account(
        seeds = [vault.to_account_info().key.as_ref()],
        bump = nonce,
    )]
    vault_program: AccountInfo<'info>,
    #[account(mut, has_one = owner)]
    to: Account<'info, TokenAccount>,
    #[account(signer)]
    owner: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
}
