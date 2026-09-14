import React from "react";

const RootDashboardLayout = async ({children} : {children: React.ReactNode}) => {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}

export default RootDashboardLayout
