import { getUserInfo } from "@/services/auth.services";

const MyProfilePage = async () => {
  const user = await getUserInfo();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">Account</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">My profile</h1>
      </div>
      <div className="grid gap-4 rounded-xl border border-border/70 bg-card/80 p-6 shadow-elevated">
        <div><p className="text-sm text-muted-foreground">Name</p><p className="mt-1 text-lg text-foreground">{user?.name || "-"}</p></div>
        <div><p className="text-sm text-muted-foreground">Email</p><p className="mt-1 text-lg text-foreground">{user?.email || "-"}</p></div>
        <div><p className="text-sm text-muted-foreground">Role</p><p className="mt-1 text-lg text-foreground">{user?.role?.replace(/_/g, " ") || "-"}</p></div>
        <div><p className="text-sm text-muted-foreground">Status</p><p className="mt-1 text-lg text-foreground">{user?.status || "-"}</p></div>
      </div>
    </main>
  );
}

export default MyProfilePage
