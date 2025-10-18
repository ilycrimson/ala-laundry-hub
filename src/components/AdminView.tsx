import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, DollarSign, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
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

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
}

const statusSteps = ["Pending Pickup", "Washing", "Folding", "Ready for Return", "Completed"];

const statusColors: Record<string, string> = {
  "Pending Pickup": "bg-warning text-warning-foreground",
  "Washing": "bg-primary text-primary-foreground",
  "Folding": "bg-accent text-accent-foreground",
  "Ready for Return": "bg-success text-success-foreground",
  "Completed": "bg-muted text-muted-foreground",
};

export const AdminView = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  useEffect(() => {
    fetchData();

    const ordersChannel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    const expensesChannel = supabase
      .channel("admin-expenses")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
        },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchOrders(), fetchExpenses()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Failed to load orders");
    }
  };

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast.error("Failed to load expenses");
    }
  };

  const handleStatusChange = async (orderId: string, currentStatus: string) => {
    const currentIndex = statusSteps.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= statusSteps.length - 1) return;

    const nextStatus = statusSteps[currentIndex + 1];

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus })
        .eq("id", orderId);

      if (error) throw error;
      toast.success(`Status updated to: ${nextStatus}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const amount = parseFloat(expenseAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      const { error } = await supabase.from("expenses").insert({
        description: expenseDesc,
        amount,
      });

      if (error) throw error;

      toast.success("Expense added");
      setExpenseDesc("");
      setExpenseAmount("");
    } catch (error: any) {
      toast.error(error.message || "Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  };

  const activeOrders = orders.filter((o) => o.status !== "Completed");
  const completedOrders = orders.filter((o) => o.status === "Completed");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.price.toString()), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const netProfit = totalRevenue - totalExpenses;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">R{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {completedOrders.length} completed orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">R{totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.length} expense entries
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-lg bg-gradient-to-br from-primary/10 to-accent/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              R{netProfit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue - Expenses
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
          <CardTitle className="text-xl">Active Orders</CardTitle>
          <CardDescription>Click "Next Step" to advance order status</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {activeOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No active orders</p>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border-2 bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{order.client_name}</span>
                      <Badge className={statusColors[order.status] || "bg-muted"}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{order.load_count} loads</span>
                      <span>R{order.price}</span>
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                    {order.instructions && (
                      <p className="text-sm italic text-muted-foreground">"{order.instructions}"</p>
                    )}
                  </div>
                  {order.status !== "Completed" && (
                    <Button
                      onClick={() => handleStatusChange(order.id, order.status)}
                      size="sm"
                      className="font-semibold"
                    >
                      Next Step
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
          <CardTitle className="text-xl">Add Expense</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expenseDesc">Description</Label>
                <Input
                  id="expenseDesc"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g., Detergent, Water bill"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseAmount">Amount (ZAR)</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="h-11"
                />
              </div>
            </div>

            <Button type="submit" className="w-full sm:w-auto font-semibold" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Expense"
              )}
            </Button>
          </form>

          {expenses.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Recent Expenses</h4>
              {expenses.slice(0, 5).map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-semibold text-destructive">-R{expense.amount}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
