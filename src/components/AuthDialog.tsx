import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PhoneAuth } from '@/components/PhoneAuth';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: (user: any, session: any) => void;
}

export const AuthDialog = ({ open, onOpenChange, onAuthSuccess }: AuthDialogProps) => {
  const handleAuthSuccess = (user: any, session: any) => {
    onAuthSuccess(user, session);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-center">Access Premium Features</DialogTitle>
        </DialogHeader>
        <div className="p-0">
          <PhoneAuth onAuthSuccess={handleAuthSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
};