import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, LogOut, Shield, User } from "lucide-react";
import { CustomerView } from "@/components/CustomerView";
import { AdminView } from "@/components/AdminView";
import { toast } from "sonner";

const ADMIN_PASSWORD = "ala2024admin";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth");
    }
  }, [session, loading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const toggleAdminMode = () => {
    if (!isAdmin) {
      const password = prompt("Enter admin password:");
      if (password === ADMIN_PASSWORD) {
        setIsAdmin(true);
        toast.success("Admin mode activated");
      } else {
        toast.error("Incorrect password");
      }
    } else {
      setIsAdmin(false);
      toast.success("Switched to customer view");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-xl p-2">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ALaundry</h1>
              <p className="text-xs text-muted-foreground">African Leadership Academy</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleAdminMode}
              variant={isAdmin ? "default" : "outline"}
              size="sm"
              className="font-semibold"
            >
              {isAdmin ? (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Student
                </>
              )}
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {isAdmin ? <AdminView /> : <CustomerView userId={session.user.id} />}
      </main>

      <footer className="border-t mt-12 py-6 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 ALaundry • Professional laundry service for ALA students</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
