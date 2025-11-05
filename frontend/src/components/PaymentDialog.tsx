import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Plan definitions matching the backend
const PLANS = {
  COLLEGE: {
    name: "College Pack",
    price: 99,
    tokenLimit: 500000, // 500k tokens
    features: ["Enhanced chat functionality", "Priority support"]
  },
  LITE: {
    name: "Lite Pack",
    price: 299,
    tokenLimit: 2000000, // 2M tokens
    features: ["Advanced chat functionality", "Priority support", "Extended history"]
  },
  PRO: {
    name: "Pro Pack",
    price: 599,
    tokenLimit: 10000000, // 10M tokens
    features: ["Premium chat functionality", "24/7 support", "Unlimited history", "Custom models"]
  }
};

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess: (plan: keyof typeof PLANS) => void;
  userId: string;
}

export function PaymentDialog({ open, onOpenChange, onPaymentSuccess, userId }: PaymentDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof PLANS>('COLLEGE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Create payment order
      const orderResponse = await fetch("/api/payment/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          plan: selectedPlan
        }),
      });
      
      if (!orderResponse.ok) {
        throw new Error("Failed to create payment order");
      }
      
      const orderData = await orderResponse.json();
      
      // In a real implementation, we would integrate with Razorpay here
      // For this POC, we'll simulate the payment process
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify payment (in a real implementation, this would be done with Razorpay's verification)
      const verifyResponse = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          plan: selectedPlan,
          transactionId: orderData.transactionId,
          razorpayPaymentId: "fake_payment_id",
          razorpayOrderId: orderData.orderId,
          razorpaySignature: "fake_signature"
        }),
      });
      
      if (!verifyResponse.ok) {
        throw new Error("Failed to verify payment");
      }
      
      // Notify parent of successful payment
      onPaymentSuccess(selectedPlan);
      
      // Close dialog
      onOpenChange(false);
    } catch (err) {
      console.error("Payment failed:", err);
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            You've reached your free token limit. Please select a plan to continue using the service.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
            {error}
          </div>
        )}
        
        <div className="grid gap-4 py-4">
          {Object.entries(PLANS).map(([key, plan]) => (
            <div 
              key={key}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedPlan === key 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-primary/50"
              }`}
              onClick={() => setSelectedPlan(key as keyof typeof PLANS)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.tokenLimit.toLocaleString()} tokens
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">₹{plan.price}</p>
                </div>
              </div>
              <ul className="mt-2 text-sm text-muted-foreground">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={loading}>
            {loading ? "Processing..." : `Pay ₹${PLANS[selectedPlan].price}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}