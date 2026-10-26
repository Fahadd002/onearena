import React from "react";
import { AuthProvider } from "@/lib/auth";

const RootDashboardLayout = async ({children} : {children: React.ReactNode}) => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
    </AuthProvider>
  );
}

export default RootDashboardLayout
