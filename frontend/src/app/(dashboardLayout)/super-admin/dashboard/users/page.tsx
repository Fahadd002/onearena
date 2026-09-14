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
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
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
type SortField = "name" | "role" | "status" | "createdAt";

const roleStyle: Record<User["role"], string> = {
  SUPER_ADMIN: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  ADMIN: "bg-primary/15 text-primary",
  MANAGER: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  USER: "bg-secondary text-secondary-foreground",
};
const statusStyle: Record<User["status"], "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  SUSPENDED: "destructive",
  BLOCKED: "destructive",
};

export default function SuperAdminUsersPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const pagination = usePagination(10);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"ALL" | User["role"]>("ALL");
  const [sort, setSort] = useState<{ field: SortField; direction: "asc" | "desc" }>({
    field: "createdAt",
    direction: "desc",
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
    <TableHead>
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </TableHead>
  );

  // Profile fields – no IDs, no duplicate email
  const profileFields = (user: User) => [
    { icon: UserIcon, label: "Name", value: user.name },
    { icon: Mail, label: "Email", value: user.email },
    { icon: Phone, label: "Contact", value: user.ownerProfile?.contactNumber || "—" },
    {
      icon: CheckCircle2,
      label: "Email Verified",
      value: user.emailVerified ? "Yes" : "No",
    },
    {
      icon: BadgeCheck,
      label: "Role",
      value: user.role.replaceAll("_", " "),
    },
    {
      icon: ShieldCheck,
      label: "Status",
      value: user.status,
    },
    {
      icon: Calendar,
      label: "Joined",
      value: new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    },
  ];

  return (
    <section className="dashboard-section space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dashboard-meta">Platform directory</p>
          <h1 className="dashboard-title mt-2">User management</h1>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span className="font-bold text-primary">{meta?.total ?? 0}</span>
          <span className="ml-1 text-muted-foreground">active accounts</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "USER", "ADMIN", "MANAGER", "SUPER_ADMIN"] as const).map(
          (item) => (
            <Button
              key={item}
              size="sm"
              variant={role === item ? "default" : "outline"}
              onClick={() => {
                setRole(item);
                pagination.resetPage();
              }}
            >
              {item === "ALL" ? "All users" : item.replaceAll("_", " ")}
            </Button>
          ),
        )}
      </div>

      {isLoading ? (
        <TableLoadingState message="Loading users..." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <SortHead field="name" label="User" />
                  <SortHead field="role" label="Role" />
                  <SortHead field="status" label="Status" />
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex min-w-48 items-center gap-3">
                        {/* Table avatar – clickable */}
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
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${roleStyle[user.role]}`}
                      >
                        {user.role.replaceAll("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusStyle[user.status]}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label={`View ${user.name}`}>
                              <Eye className="size-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <div className="flex items-center gap-4">
                                {/* Dialog avatar – clickable */}
                                <Avatar
                                  className="size-16 cursor-pointer"
                                  onClick={() => {
                                    if (user.image) {
                                      setPreviewImage(user.image);
                                    }
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
                                <div>
                                  <DialogTitle className="text-xl">{user.name}</DialogTitle>
                                  <DialogDescription>{user.email}</DialogDescription>
                                </div>
                              </div>
                            </DialogHeader>
                            <div className="mt-4 grid grid-cols-1 gap-3">
                              {profileFields(user).map((field, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-sm">
                                  <field.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                  <div className="flex-1">
                                    <span className="text-muted-foreground">{field.label}:</span>
                                    <span className="ml-1 font-medium">{field.value}</span>
                                  </div>
                                </div>
                              ))}
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
        </div>
      )}

      {/* Full‑screen image preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
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