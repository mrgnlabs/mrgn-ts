import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

export const SigningDialogBox = ({
  open,
  setOpen
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) => {

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        style: { backgroundColor: 'transparent', boxShadow: 'none', overflow: 'hidden' },
      }}
    >
      <div className="bg-[#10141f] w-[400px] max-w-4/5 flex flex-col gap-8 justify-evenly items-center p-8 text-base text-white font-aeonik font-[400] rounded-xl text-center">
        <div>
          <span className="text-2xl font-[500]">Access upgraded features</span>
          <br />
          <br />
          Prove you own this wallet by signing a message in your wallet.
          It is free and does not involve the network.
        </div>
        <Button onClick={handleClose} autoFocus className="bg-transparent font-aeonik text-white text-base font-xl glow-on-hover">
          LET&apos;S DO THIS
        </Button>
      </div>
    </Dialog >
  );
}
