import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Package, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Order {
  id: string;
  client_name: string;
  load_count: number;
  instructions: string | null;
  price: number;
  status: string;
  created_at: string;
}

const PRICE_PER_LOAD = 75;

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  "Pending Pickup": { icon: Clock, color: "bg-warning text-warning-foreground", label: "Pending Pickup" },
  "Washing": { icon: Package, color: "bg-primary text-primary-foreground", label: "Washing" },
  "Folding": { icon: Package, color: "bg-accent text-accent-foreground", label: "Folding" },
  "Ready for Return": { icon: Sparkles, color: "bg-success text-success-foreground", label: "Ready" },
  "Completed": { icon: CheckCircle2, color: "bg-muted text-muted-foreground", label: "Completed" },
};

export const CustomerView = ({ userId }: { userId: string }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientName, setClientName] = useState("");
  const [loadCount, setLoadCount] = useState(1);
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("customer-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const price = loadCount * PRICE_PER_LOAD;
      const { error } = await supabase.from("orders").insert({
        user_id: userId,
        client_name: clientName,
        load_count: loadCount,
        instructions: instructions || null,
        price,
        status: "Pending Pickup",
      });

      if (error) throw error;
      
      toast.success(`Order placed! Total: R${price}`);
      setClientName("");
      setLoadCount(1);
      setInstructions("");
    } catch (error: any) {
      toast.error(error.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const activeOrder = orders.find((o) => o.status !== "Completed");
  const completedOrders = orders.filter((o) => o.status === "Completed");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
          <CardTitle className="text-2xl">Place New Order</CardTitle>
          <CardDescription className="text-base">
            R{PRICE_PER_LOAD} per load • Professional service
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Your Name</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter your name"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loadCount">Number of Loads</Label>
              <Input
                id="loadCount"
                type="number"
                min="1"
                value={loadCount}
                onChange={(e) => setLoadCount(parseInt(e.target.value) || 1)}
                className="h-11"
                required
              />
              <p className="text-sm text-muted-foreground">
                Total: R{loadCount * PRICE_PER_LOAD}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Special Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Any special care instructions..."
                className="min-h-[100px] resize-none"
              />
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing Order...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Place Order
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {activeOrder && (
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Current Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Order #{activeOrder.id.slice(0, 8)}</span>
                <Badge className={statusConfig[activeOrder.status]?.color || "bg-muted"}>
                  {statusConfig[activeOrder.status]?.label || activeOrder.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Loads</p>
                  <p className="font-semibold">{activeOrder.load_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold">R{activeOrder.price}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {["Pending Pickup", "Washing", "Folding", "Ready for Return"].map((status, idx) => {
                  const statusOrder = ["Pending Pickup", "Washing", "Folding", "Ready for Return"];
                  const currentStatusIndex = statusOrder.indexOf(activeOrder.status);
                  const isActive = idx <= currentStatusIndex;
                  
                  return (
                    <div
                      key={status}
                      className={`flex-1 h-2 rounded-full transition-all ${
                        isActive ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {completedOrders.length > 0 && (
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Order History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium">{order.load_count} loads</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold">R{order.price}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
