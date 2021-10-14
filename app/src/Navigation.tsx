import { Toolbar, Typography } from '@material-ui/core';
import { Button } from '@material-ui/core';
import DisconnectIcon from '@material-ui/icons/LinkOff';
import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-material-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import React, { FC } from 'react';
import {
    Link as RouterLink
} from "react-router-dom";

const Navigation: FC = () => {
    const { wallet } = useWallet();

    return (
        <Toolbar style={{ display: 'flex' }}>
            <Typography component="h1" variant="h6" style={{ flexGrow: 1 }}>
                GM Coin
            </Typography>
            <Button variant="contained" color="secondary" component={RouterLink} to="/">
                Home
            </Button>
            <Button variant="contained" color="secondary" component={RouterLink} to="/admin">
                Admin
            </Button>
            <Button variant="contained" color="secondary" component={RouterLink} to="/users">
                Users
            </Button>
            <WalletMultiButton />
            {wallet && <WalletDisconnectButton startIcon={<DisconnectIcon />} style={{ marginLeft: 8 }} />}
        </Toolbar>
    );
};

export default Navigation;
