import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useLogin } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const loginMutation = useLogin();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    loginMutation.mutate({ data: { username, password } }, {
      onSuccess: (res) => {
        login(res.token, res.user);
        toast({ title: "Welcome back", description: "Successfully logged in." });
        setLocation("/");
      },
      onError: (err: any) => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        toast({ title: "Login failed", description: err.message || "Invalid credentials", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10 px-4"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-primary/20">
            <img src={`${import.meta.env.BASE_URL}images/kcpl-logo-mark.png`} alt="KCPL" className="w-8 h-8 object-contain" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Welcome to KCPL</h1>
          <p className="text-muted-foreground mt-2">Sign in to manage your catalog system</p>
        </div>

        <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
          <Card className="shadow-xl shadow-black/5 border-border/50 backdrop-blur-sm bg-card/90">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username or Email</Label>
                  <Input 
                    id="username" 
                    type="text" 
                    placeholder="admin" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                
                <Button type="submit" className="w-full h-11 text-base mt-2 shadow-md shadow-primary/20" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  Default: admin / admin123
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
