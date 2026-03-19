import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { UserCircle2, Lock, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const Profile = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;

    setFullName(
      profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "",
    );
  }, [profile?.full_name, user]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const trimmedName = fullName.trim();

      if (!trimmedName) throw new Error("Name is required.");

      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: trimmedName })
          .eq("user_id", user!.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({
          user_id: user!.id,
          full_name: trimmedName,
        });

        if (error) throw error;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: trimmedName, name: trimmedName },
      });

      if (authError) throw authError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Profile updated successfully.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update profile.");
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (password !== confirmPassword) throw new Error("Passwords do not match.");

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update password.");
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: {},
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Account deleted successfully.");
      await signOut().catch(() => undefined);
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete account.");
    },
  });

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account details and security settings.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserCircle2 className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-xl">Profile Info</CardTitle>
                <CardDescription>Update the name shown on your account.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={user?.email ?? ""} disabled readOnly />
            </div>

            <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-xl">Change Password</CardTitle>
                <CardDescription>Set a new password for your account.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button onClick={() => changePassword.mutate()} disabled={changePassword.isPending}>
              {changePassword.isPending ? "Updating..." : "Update password"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-destructive" />
              <div>
                <CardTitle className="text-xl">Delete Account</CardTitle>
                <CardDescription>Delete your account and all associated data permanently.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone. Your contacts, campaigns, templates, settings, and account access will be deleted permanently.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(event) => {
                      event.preventDefault();
                      deleteAccount.mutate();
                    }}
                    disabled={deleteAccount.isPending}
                  >
                    {deleteAccount.isPending ? "Deleting..." : "Yes, delete account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Profile;
