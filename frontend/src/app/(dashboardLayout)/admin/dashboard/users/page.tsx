"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { usePagination } from "@/hooks/usePagination";
import { useSearch } from "@/context/SearchContext";
import { TableEmptyState, TableLoadingState } from "@/components/common/TableStates";
import { TablePagination } from "@/components/common/TablePagination";
import { ViewDetailsDialog } from "@/components/common/ViewDetailsDialog";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

type PaginatedResult = {
  data: User[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { registerHandler, unregisterHandler, setPlaceholder } = useSearch();
  const pagination = usePagination(10);
  const [localSearch, setLocalSearch] = useState("");

  useEffect(() => {
    setPlaceholder("Search users by name or email...");
    const handler = (query: string) => {
      setLocalSearch(query);
      pagination.resetPage();
    };
    registerHandler(handler);
    return () => unregisterHandler();
  }, [registerHandler, unregisterHandler, setPlaceholder, pagination]);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["admin-users", { search: localSearch, page: pagination.page, pageSize: pagination.pageSize }],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        search: localSearch,
        sortBy: "createdAt",
        sortOrder: "desc",
        page: String(pagination.page),
        limit: String(pagination.pageSize),
      };
      const result = await httpClient.get<PaginatedResult>(API_ENDPOINTS.marketplace.users, { params });
      return result.data ?? { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },
  });

  const users = pageData?.data ?? [];
  const meta = pageData?.meta;

  useEffect(() => {
    if (meta?.total !== undefined) {
      pagination.setTotal(meta.total);
    }
  }, [meta?.total, pagination]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      httpClient.patch(`${API_ENDPOINTS.marketplace.users}/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User status updated");
    },
    onError: () => toast.error("Could not update user status"),
  });
  const removeUser = useMutation({
    mutationFn: (id: string) => httpClient.delete(`${API_ENDPOINTS.marketplace.users}/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User removed");
    },
    onError: () => toast.error("Could not remove user"),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("USER");
  const createUser = useMutation({
    mutationFn: () => httpClient.post(API_ENDPOINTS.marketplace.users, { name, email, role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreate(false);
      setName("");
      setEmail("");
      setRole("USER");
      toast.success("User created");
    },
    onError: () => toast.error("Could not create user"),
  });

  const detailItems = (user: User) => [
    { label: "User ID", value: user.id },
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Role", value: user.role.replaceAll("_", " ") },
    { label: "Status", value: user.status },
    {
      label: "Joined",
      value: new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    },
  ];

  return (
    <section className="dashboard-section">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="dashboard-meta">Platform</p>
          <h1 className="dashboard-title">Users</h1>
          <p className="mt-3 text-muted-foreground">Manage platform users and their status.</p>
        </div>
        <Button onClick={() => setShowCreate((prev) => !prev)}>
          {showCreate ? "Cancel" : "Create user"}
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {showCreate && (
        <Card className="dashboard-panel mt-6">
          <CardHeader>
            <CardTitle>New user</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
            <Button
              onClick={() => createUser.mutate()}
              disabled={!name.trim() || !email.trim() || createUser.isPending}
            >
              Save
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <TableLoadingState message="Loading users..." />
      ) : (
        <div className="mt-8 space-y-4">
          {users.map((user) => (
            <Card key={user.id} className="dashboard-panel">
              <CardHeader>
                <CardTitle>{user.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Role: {user.role}</p>
                    <p className="text-sm text-muted-foreground">Status: {user.status}</p>
                    <p className="text-sm text-muted-foreground">
                      Joined: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ViewDetailsDialog
                      title={user.name}
                      description={user.email}
                      trigger={
                        <Button size="sm" variant="outline">
                          <Eye className="mr-2 size-4" />
                          View
                        </Button>
                      }
                      items={detailItems(user)}
                    />
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateStatus.mutate({
                          id: user.id,
                          status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                        })
                      }
                      disabled={updateStatus.isPending}
                    >
                      {user.status === "ACTIVE" ? "Suspend" : "Restore"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (window.confirm("Delete this user?")) removeUser.mutate(user.id);
                      }}
                      disabled={removeUser.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {users.length === 0 && (
            <TableEmptyState message="No users found" description="Try another search." />
          )}
        </div>
      )}

      <TablePagination
        page={pagination.page}
        totalPages={meta?.totalPages ?? 1}
        total={meta?.total ?? 0}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </section>
  );
}
