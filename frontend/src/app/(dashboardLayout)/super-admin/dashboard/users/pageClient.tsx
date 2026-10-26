"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  CheckCircle2,
  Eye,
  LockKeyhole,
  ShieldCheck,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  BadgeCheck,
  User as UserIcon,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/premium/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableEmptyState, TableLoadingState } from "@/components/common/TableStates";
import { TablePagination } from "@/components/common/TablePagination";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { replaceAll } from "@/lib/compat";
import { usePagination } from "@/hooks/usePagination";
import { useSearch } from "@/context/SearchContext";

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "USER" | "ADMIN" | "MANAGER" | "SUPER_ADMIN";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED";
  emailVerified: boolean;
  createdAt: string;
  ownerProfile?: { contactNumber: string; verificationStatus: string } | null;
};
type SortField = "name";

const roleStyle: Record<User["role"], string> = {
  SUPER_ADMIN: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20",
  ADMIN: "bg-primary/15 text-primary border-primary/20",
  MANAGER: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/20",
  USER: "bg-secondary text-secondary-foreground border-border",
};

const statusStyle: Record<User["status"], "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  SUSPENDED: "destructive",
  BLOCKED: "destructive",
};

/** Status Badge Styling */
function getStatusBadge(status: User["status"]) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="h-8 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 flex items-center justify-center">
          Active
        </Badge>
      );
    case "INACTIVE":
      return (
        <Badge className="h-8 bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20 flex items-center justify-center">
          Inactive
        </Badge>
      );
    case "SUSPENDED":
      return (
        <Badge className="h-8 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 flex items-center justify-center">
          Suspended
        </Badge>
      );
    case "BLOCKED":
      return (
        <Badge className="h-8 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 flex items-center justify-center">
          Blocked
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="h-8 flex items-center justify-center">
          {status}
        </Badge>
      );
  }
}

/** Role Badge Styling */
function getRoleBadge(role: User["role"]) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold ${roleStyle[role]}`}
    >
      {replaceAll(role, "_", " ")}
    </span>
  );
}

/** Helper to format join date with time */
function formatJoinedDateTime(dateString: string) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export default function SuperAdminUsersPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const pagination = usePagination(10);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"ALL" | User["role"]>("ALL");
  const [sort, setSort] = useState<{ field: SortField; direction: "asc" | "desc" }>({
    field: "name",
    direction: "asc",
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    setPlaceholder("Search users by name, email, phone, or role...");
    const handleSearch = (query: string) => {
      setSearch(query);
      pagination.resetPage();
    };
    registerHandler(handleSearch);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["super-admin-users", { search, role, sort, page: pagination.page, pageSize: pagination.pageSize }],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        search,
        sortBy: sort.field,
        sortOrder: sort.direction,
        page: String(pagination.page),
        limit: String(pagination.pageSize),
      };
      if (role !== "ALL") params.role = role;
      const result = await httpClient.get<{ data: User[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
        API_ENDPOINTS.marketplace.users,
        { params },
      );
      return result.data ?? { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },
  });

  const users = pageData?.data ?? [];
  const meta = pageData?.meta;

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: User["status"] }) =>
      httpClient.patch(`${API_ENDPOINTS.marketplace.users}/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      toast.success("User access updated");
    },
    onError: () => toast.error("Could not update user access"),
  });

  useEffect(() => {
    if (meta?.total !== undefined) {
      pagination.setTotal(meta.total);
    }
  }, [meta?.total, pagination]);

  const toggleSort = (field: SortField) =>
    setSort((current) => {
      pagination.resetPage();
      return {
        field,
        direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
      };
    });

  const SortHead = ({ field, label }: { field: SortField; label: string }) => (
    <TableHead className="px-1 py-1 font-semibold border-b border-border">
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </TableHead>
  );

  return (
    <section className="dashboard-section space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="dashboard-title mt-2">User management</h1>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-32 rounded-lg bg-muted" />
        ) : (
          <div className="flex h-8 items-center rounded-lg border border-border bg-card px-4 text-sm">
            <span className="font-bold text-primary">{meta?.total ?? 0}</span>
            <span className="ml-1 text-muted-foreground">active accounts</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(["ALL", "USER", "ADMIN", "MANAGER", "SUPER_ADMIN"] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={role === item ? "default" : "outline"}
              onClick={() => {
                setRole(item);
                pagination.resetPage();
              }}
            >
              {item === "ALL" ? "All users" : replaceAll(item, "_", " ")}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="overflow-x-auto border rounded-xl bg-card">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="px-1 py-1 border-b border-border">
                  <Skeleton className="h-3 w-16 rounded" />
                </TableHead>
                <TableHead className="px-1 py-1 border-b border-border">
                  <Skeleton className="h-3 w-16 rounded" />
                </TableHead>
                <TableHead className="px-1 py-1 border-b border-border">
                  <Skeleton className="h-3 w-16 rounded" />
                </TableHead>
                <TableHead className="px-1 py-1 border-b border-border">
                  <Skeleton className="h-3 w-16 rounded" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-b border-border">
                  <TableCell className="px-1 py-1">
                    <Skeleton className="h-4 w-full rounded" />
                  </TableCell>
                  <TableCell className="px-1 py-1">
                    <Skeleton className="h-4 w-full rounded" />
                  </TableCell>
                  <TableCell className="px-1 py-1">
                    <Skeleton className="h-4 w-full rounded" />
                  </TableCell>
                  <TableCell className="px-1 py-1">
                    <Skeleton className="h-4 w-full rounded" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border rounded-xl bg-card">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border">
              <TableRow className="hover:bg-transparent border-b border-border">
                <SortHead field="name" label="User" />
                <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Role</TableHead>
                <TableHead className="px-1 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Status</TableHead>
                <TableHead className="px-1 py-1 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">Action</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-b border-border transition-colors hover:bg-muted/20">
                    <TableCell className="px-1 py-1">
                      <div className="flex min-w-48 items-center gap-3">
                        <Avatar
                          className="cursor-pointer"
                          onClick={() => {
                            if (user.image) {
                              setPreviewImage(user.image);
                            }
                          }}
                        >
                          <AvatarImage src={user.image || undefined} alt={user.name} />
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {user.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${roleStyle[user.role]}`}
                      >
                        {replaceAll(user.role, "_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusStyle[user.status]}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {/* Enhanced View Details Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label={`View ${user.name}`}>
                              <Eye className="size-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg p-6 rounded-2xl">
                            <DialogHeader className="space-y-4">
                              <div className="flex items-start gap-4">
                                <Avatar
                                  className={`h-16 w-16 border border-border ${user.image ? "cursor-pointer transition-transform hover:scale-105" : ""
                                    }`}
                                  onClick={() => {
                                    if (user.image) setPreviewImage(user.image);
                                  }}
                                >
                                  <AvatarImage src={user.image || undefined} alt={user.name} />
                                  <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                                    {user.name
                                      .split(" ")
                                      .map((part) => part[0])
                                      .join("")
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                  <DialogTitle className="text-xl font-bold leading-none">{user.name}</DialogTitle>
                                  <DialogDescription className="text-xs text-muted-foreground font-mono">
                                    {user.email}
                                  </DialogDescription>
                                  <div className="flex items-center gap-2 pt-1.5">
                                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${roleStyle[user.role]}`}>
                                      {replaceAll(user.role, "_", " ")}
                                    </span>
                                    <Badge variant={statusStyle[user.status]} className="text-[11px]">
                                      {user.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </DialogHeader>

                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-border">
                              <div className="flex items-start gap-2.5 text-xs">
                                <UserIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="text-muted-foreground font-medium">Full Name</p>
                                  <p className="font-semibold text-foreground mt-0.5">{user.name}</p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5 text-xs">
                                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="text-muted-foreground font-medium">Email Address</p>
                                  <a href={`mailto:${user.email}`} className="font-semibold text-foreground hover:text-primary transition-colors mt-0.5 block font-mono">
                                    {user.email}
                                  </a>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5 text-xs">
                                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="text-muted-foreground font-medium">Contact Number</p>
                                  <p className="font-semibold text-foreground mt-0.5 font-mono">
                                    {user.ownerProfile?.contactNumber || "—"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5 text-xs">
                                {user.emailVerified ? (
                                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
                                )}
                                <div>
                                  <p className="text-muted-foreground font-medium">Email Verification</p>
                                  <p className={`font-semibold mt-0.5 ${user.emailVerified ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                                    {user.emailVerified ? "Verified" : "Not Verified"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2.5 text-xs sm:col-span-2 bg-muted/40 p-3 rounded-xl border border-border">
                                <Calendar className="mt-0.5 size-4 shrink-0 text-primary" />
                                <div>
                                  <p className="text-muted-foreground font-medium">Joined Date & Time</p>
                                  <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-foreground">
                                    <Clock className="size-3 text-muted-foreground" />
                                    <span>{formatJoinedDateTime(user.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Action Dropdown */}
                        {user.role === "SUPER_ADMIN" ? (
                          <span className="text-xs text-muted-foreground">Protected</span>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatus.mutate({
                                    id: user.id,
                                    status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                                  })
                                }
                                disabled={updateStatus.isPending}
                              >
                                {user.status === "ACTIVE" ? (
                                  <>
                                    <LockKeyhole className="mr-2 size-4 text-destructive" />
                                    Suspend
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="mr-2 size-4 text-primary" />
                                    Restore
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <TableEmptyState message="No users found" description="Try another search or role filter." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={pagination.page}
            totalPages={meta?.totalPages ?? 1}
            total={meta?.total ?? 0}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </>
      )}

      {/* Full‑screen image preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Full profile"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </section>
  );
}