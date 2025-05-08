// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Smartphone, Download, Upload, ArrowRightLeft, CheckCircle } from 'lucide-react';
import type { TransactionType } from '@/types';

const DMPESA_APP_URL = 'https://play.google.com/store/apps/details?id=com.dmpesa';

export default function PaymentsPage() {
  const [amount, setAmount] = useState<string>('');
  const [transactionType, setTransactionType] = useState<TransactionType>('deposit');
  const [isDMPesaAppInstalled, setIsDMPesaAppInstalled] = useState<boolean | null>(null);
  const { toast } = useToast();

  const checkAppInstallation = () => {
    // In a real scenario, this would involve trying to open a custom URL scheme
    // or checking platform-specific APIs if within a native wrapper.
    // For this web simulation, we'll assume it's not installed by default.
    setIsDMPesaAppInstalled(false); 
  };
  
  useEffect(() => {
    if (isDMPesaAppInstalled === null) {
      checkAppInstallation();
    }
  }, [isDMPesaAppInstalled]);


  const handleTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid amount.', variant: 'destructive' });
      return;
    }

    if (!isDMPesaAppInstalled) {
      toast({
        title: 'DMPesa App Required',
        description: 'Please install and log in to the DMPesa app to proceed with transactions.',
        variant: 'destructive',
      });
      return;
    }
    
    // Simulate transaction
    setTimeout(() => {
      toast({
        title: `${transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'} Successful (Simulated)`,
        description: `Your ${transactionType} of $${parseFloat(amount).toFixed(2)} via DMPesa app has been processed.`,
      });
      setAmount('');
    }, 1500);
  };
  
  const handleSimulateAppInstall = () => {
    setIsDMPesaAppInstalled(true);
    toast({ title: "DMPesa App Status", description: "Simulated: DMPesa app is now considered installed and logged in."});
  };

  return (
    <div className="container mx-auto py-2">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <ArrowRightLeft className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl">Payments</CardTitle>
          <CardDescription>
            Deposit or withdraw funds for your trading account using the DMPesa application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <Label htmlFor="transaction-type" className="text-lg font-semibold">Transaction Type</Label>
            <RadioGroup
              id="transaction-type"
              value={transactionType}
              onValueChange={(value) => setTransactionType(value as TransactionType)}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="deposit" id="deposit" />
                <Label htmlFor="deposit" className="text-base flex items-center gap-2 cursor-pointer"><Upload className="h-5 w-5"/> Deposit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="withdrawal" id="withdrawal" />
                <Label htmlFor="withdrawal" className="text-base flex items-center gap-2 cursor-pointer"><Download className="h-5 w-5"/> Withdraw</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div>
            <Label htmlFor="amount" className="text-lg font-semibold">Amount (USD)</Label>
            <div className="relative mt-2">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-10 text-lg h-12"
                min="1"
              />
            </div>
          </div>
          
          {isDMPesaAppInstalled === false && (
            <Card className="bg-destructive/10 border-destructive">
              <CardContent className="pt-6 space-y-3 text-center">
                <Smartphone className="mx-auto h-10 w-10 text-destructive mb-2" />
                <p className="text-destructive font-semibold">DMPesa App Required</p>
                <p className="text-sm text-destructive/80">
                  To make deposits or withdrawals, you need the DMPesa app installed and logged in on your device.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                   <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/20"
                    onClick={handleSimulateAppInstall}
                  >
                    I've Installed & Logged In / Simulate
                  </Button>
                  <Button
                    onClick={() => window.open(DMPESA_APP_URL, '_blank')}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download DMPesa App
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

           {isDMPesaAppInstalled === true && (
             <Card className="bg-green-500/10 border-green-500">
                <CardContent className="pt-6 text-center flex items-center justify-center gap-2">
                     <CheckCircle className="h-6 w-6 text-green-600" />
                     <p className="text-sm text-green-700 font-medium">DMPesa app detected (simulated). You can proceed.</p>
                </CardContent>
             </Card>
           )}


          <Button
            size="lg"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-xl py-6"
            onClick={handleTransaction}
            disabled={!amount || parseFloat(amount) <= 0 || !isDMPesaAppInstalled}
          >
            {transactionType === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            All transactions are processed securely via the DMPesa app. This is a simulated environment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
