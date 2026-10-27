"use client";

import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Search, UserPlus, Loader2, Check, CalendarDays, Wallet, UserIcon,
  Sparkles, CreditCard, Hash, Banknote, ChevronRight, ChevronLeft,
  Phone, MessageSquare, Copy,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import {
  type AdminBookingPayload,
  type CreatedBooking,
  type CreatedUser,
  createBookingByAdminAction,
  createUserByAdminAction,
} from "@/app/(dashboardLayout)/admin/dashboard/bookings/_actions";
import { startOfToday, addDays } from "@/components/turfs/dateRanges";
import { ymd, formatPrice, timeLabel } from "@/lib/slotsUtils";
import { DateStrip } from "@/components/turfs/DateStrip";
import { AdminTurfSlots, visibleSlotsOf as adminVisibleSlotsOf } from "./AdminTurfSlots";
import { fetchTurfById } from "@/components/turfs/api";
import { validateBangladeshiMobile } from "@/lib/validators";
import type { Turf } from "@/types/turf.type";
import type { Bucket } from "@/lib/slotsUtils";
import { useIsMounted } from "@/components/turfs/useIsToday";

interface UserSearchResult { id: string; name: string; email: string | null; phoneNumber: string | null; }
interface SelectedUser { id: string; name: string; phoneNumber?: string | null; email?: string | null; }
interface PickedSlot { id: string; turfId: string; turfName: string; startMinute: number; endMinute: number; price: number; date: string; }

interface Props { isOpen: boolean; onClose: () => void; turfs?: Turf[]; todayISO?: string; }

const paymentOptions = [
  { id: "BKASH", name: "bKash", icon: "/marchent-icon/bKash.svg" },
  { id: "NAGAD", name: "Nagad", icon: "/marchent-icon/nagad.svg" },
  { id: "ROKET", name: "Rocket", icon: "/marchent-icon/rocket.svg" },
] as const;

const ADVANCE_PER_SLOT = 500;
const STEPS = ["Customer", "Slots", "Confirm"] as const;

export function AdminBookingDrawer({ isOpen, onClose, todayISO }: Props) {
  const queryClient = useQueryClient();
  const mounted = useIsMounted();
  const today = useMemo(() => new Date(todayISO ?? ymd(startOfToday())), [todayISO]);

  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", phoneNumber: "" });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const trimmedSearch = searchTerm.trim();

  const [date, setDate] = useState<Date>(today);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [picked, setPicked] = useState<PickedSlot[]>([]);

  const [discount, setDiscount] = useState("0");
  const [advanceEnabled, setAdvanceEnabled] = useState(false);
  const [advanceMethod, setAdvanceMethod] = useState<string>("");
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [senderMobile, setSenderMobile] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const { data: turfsData } = useQuery({
    queryKey: ["admin-turfs", ymd(date)],
    queryFn: async () => {
      const res = await httpClient.get<any>(API_ENDPOINTS.marketplace.turfs, {
        params: { date: ymd(date), page: "1", limit: "50" },
      });
      return res.data ?? [];
    },
    enabled: isOpen && step === 1,
  });
  const fetchedTurfs: Turf[] = Array.isArray(turfsData) ? turfsData : turfsData?.data ?? [];

  const pickedTurfId = picked[0]?.turfId ?? null;
  const { data: pickedTurf } = useQuery({
    queryKey: ["turf-payment-info", pickedTurfId],
    queryFn: () => fetchTurfById(pickedTurfId!),
    enabled: !!pickedTurfId,
  });
  const mobilePaymentNumbers = pickedTurf?.allowAdvancePayment ? pickedTurf.paymentPhoneNumbers ?? [] : [];
  const canPayAdvanceMobile = mobilePaymentNumbers.length > 0;

  const { data: searchResults, isFetching: searching } = useQuery<UserSearchResult[]>({
    queryKey: ["admin-user-search", trimmedSearch],
    queryFn: async () => {
      if (trimmedSearch.length < 3) return [];
      const res = await httpClient.get<UserSearchResult[]>(API_ENDPOINTS.marketplace.usersSearch, { params: { q: trimmedSearch } });
      return res.data ?? [];
    },
    enabled: isOpen && step === 0 && !selectedUser && trimmedSearch.length >= 3,
    staleTime: 0,
  });

  useEffect(() => {
    if (!searchOpen) return;
    function onDocClick(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-search-wrap]")) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [searchOpen]);

  const createUserMutation = useMutation({
    mutationFn: () => createUserByAdminAction({ name: newUser.name, phoneNumber: newUser.phoneNumber }),
    onSuccess: (data) => {
      if (!data.success) { toast.error(data.message || "Failed to create user"); return; }
      const u = (data as any).data;
      setTempPassword(u?.tempPassword ?? null);
      toast.success("User created");
      // Stay on step 0 so the admin can copy the temporary password before moving on.
      setSelectedUser({ id: u.id, name: u.name, phoneNumber: u.phoneNumber, email: u.email });
      setShowCreateForm(false);
      setSearchTerm("");
      setSearchOpen(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create user"),
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const payload: AdminBookingPayload = {
        userId: selectedUser!.id,
        slotIds: picked.map((p) => p.id),
        discountAmount: Number(discount) || 0,
      };
      const adv = buildAdvancePayload();
      if (adv) payload.advancePayment = adv;
      return createBookingByAdminAction(payload);
    },
    onSuccess: (data) => {
      if (!data.success) { toast.error(data.message || "Failed to create booking"); return; }
      const booking = (data as any).data as CreatedBooking;
      toast.success(`Booking ${booking?.bookingNumber ?? ""} created`);
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      reset();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create booking"),
  });

  const baseTotal = picked.reduce((sum, p) => sum + p.price, 0);
  const discountValue = Math.max(0, Math.min(Number(discount) || 0, baseTotal));
  const grandTotal = baseTotal - discountValue;
  const suggestedAdvanceTotal = Math.min(ADVANCE_PER_SLOT * picked.length, grandTotal);
  const effectiveMethod = advanceMethod || pickDefaultPaymentMethod();
  const isCash = effectiveMethod === "CASH";
  const paymentAmount = Math.max(0, Math.min(Number(advanceAmount) || 0, grandTotal));

  function buildAdvancePayload() {
    if (!advanceEnabled) return null;
    if (paymentAmount <= 0) return null;
    const sender = senderMobile.replace(/[\s-]/g, "");
    const txn = transactionId.trim();
    if (!isCash) {
      if (validateBangladeshiMobile(sender)) return null;
      if (txn.length < 4 || txn.length > 64) return null;
    }
    return { method: effectiveMethod, amount: paymentAmount, senderMobile: isCash ? "" : sender, transactionId: isCash ? "" : txn, reference: reference.trim() || undefined, note: note.trim() || undefined };
  }

  const advance = useMemo(() => {
    if (!advanceEnabled) return null;
    const sender = senderMobile.replace(/[\s-]/g, "");
    const txn = transactionId.trim();
    let err: string | null = null;
    if (paymentAmount <= 0) err = "Amount received must be greater than 0";
    else if (paymentAmount > grandTotal) err = "Amount cannot exceed booking total";
    else if (!isCash) {
      if (validateBangladeshiMobile(sender)) err = "Enter a valid sender mobile number";
      else if (txn.length < 4 || txn.length > 64) err = "Enter a valid transaction number";
    }
    setAdvanceError(err);
    if (err) return null;
    return { method: effectiveMethod, senderMobile: isCash ? "" : sender, transactionId: isCash ? "" : txn, reference: reference.trim() || null, note: note.trim() || null, amount: paymentAmount };
  }, [advanceEnabled, effectiveMethod, isCash, senderMobile, transactionId, reference, note, paymentAmount, grandTotal]);

  function handleSelectUser(u: SelectedUser) {
    setSelectedUser(u);
    setSearchTerm("");
    setSearchOpen(false);
    setShowCreateForm(false);
    setStep(1);
  }

  function handleChangeUser() {
    setSelectedUser(null);
    setSearchTerm("");
    setSearchOpen(false);
    setShowCreateForm(false);
    setTempPassword(null);
    setPicked([]);
    setAdvanceEnabled(false);
    setStep(0);
  }

  const toggleSlot = (s: PickedSlot) => {
    setPicked((prev) => {
      const idx = prev.findIndex((p) => p.id === s.id);
      if (idx >= 0) { const next = [...prev]; next.splice(idx, 1); return next; }
      return [...prev, s];
    });
  };

  const reset = () => {
    setStep(0);
    setSelectedUser(null);
    setSearchTerm("");
    setSearchOpen(false);
    setShowCreateForm(false);
    setNewUser({ name: "", phoneNumber: "" });
    setTempPassword(null);
    setPicked([]);
    setDiscount("0");
    setAdvanceEnabled(false);
    setAdvanceMethod("");
    setAdvanceAmount("");
    setSenderMobile("");
    setTransactionId("");
    setReference("");
    setNote("");
    setAdvanceError(null);
    setDate(today);
    setBucket("all");
  };

  const close = () => { reset(); onClose(); };

  const handleToggleAdvance = () => {
    const next = !advanceEnabled;
    setAdvanceEnabled(next);
    if (next) {
      setAdvanceError(null);
      setAdvanceMethod(pickDefaultPaymentMethod());
      setAdvanceAmount(String(suggestedAdvanceTotal || grandTotal));
    } else {
      setAdvanceMethod("");
      setAdvanceAmount("");
      setSenderMobile("");
      setTransactionId("");
      setReference("");
      setNote("");
      setAdvanceError(null);
    }
  };

  function pickDefaultPaymentMethod(): string {
    if (canPayAdvanceMobile) {
      const bkash = mobilePaymentNumbers.find((p) => p.method === "BKASH");
      if (bkash) return bkash.method;
      return mobilePaymentNumbers[0]?.method ?? "CASH";
    }
    return "BKASH";
  }

  function paymentMethodLabel(method: string): string {
    const match = paymentOptions.find((p) => p.id === method);
    if (match) return match.name;
    const fromTurf = mobilePaymentNumbers.find((p) => p.method === method);
    return fromTurf?.method ?? method;
  }

  const handleSelectPaymentMethod = (method: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setAdvanceMethod(method);
  };

  if (!isOpen) return null;

  const canNext = step === 1 ? picked.length > 0 : true;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
          />

          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-hidden border-l border-border bg-card shadow-2xl sm:w-1/2"
          >
            <div className="shrink-0 border-b border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">
                    {step === 0 ? "Select Customer" : step === 1 ? "Pick Slots" : "Confirm Booking"}
                  </h2>
                </div>
                <button type="button" onClick={close} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {STEPS.map((label, i) => {
                  const active = i === step;
                  const done = i < step;
                  return (
                    <div key={label} className="flex flex-1 items-center gap-2">
                      <div className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${done ? "bg-primary text-primary-foreground"
                          : active ? "border-2 border-primary bg-primary/10 text-primary"
                            : "border border-border text-muted-foreground"
                        }`}>
                        {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                      </div>
                      <span className={`truncate text-xs font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                      {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none] p-4">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                  >
                    {selectedUser ? (
                      <>
                        <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <UserIcon className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">{selectedUser.name}</p>
                            {selectedUser.phoneNumber && <p className="text-xs text-muted-foreground">{selectedUser.phoneNumber}</p>}
                          </div>
                          <Button size="sm" variant="outline" onClick={handleChangeUser}>Change</Button>
                        </div>
                        {tempPassword && (
                          <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Temporary password</p>
                              <p className="font-mono text-base font-bold tracking-widest text-foreground">{tempPassword}</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 shrink-0 border-primary/40 text-primary hover:border-primary hover:bg-primary/10" onClick={() => { try { navigator.clipboard.writeText(tempPassword); toast.success("Password copied"); } catch { toast.error("Copy failed"); } }}>
                              <Copy className="mr-1 size-3" /> Copy
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Search by Phone, Name or Email
                        </Label>

                        <div className="relative" data-search-wrap>
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Enter at least 3 characters..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setSearchOpen(true); setShowCreateForm(false); }}
                            onFocus={() => setSearchOpen(true)}
                            className="h-10 pl-9 pr-9"
                            autoFocus
                          />
                          {searching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                          {searchOpen && trimmedSearch.length >= 3 && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
                              {searching && !searchResults?.length ? (
                                <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
                              ) : searchResults && searchResults.length > 0 ? (
                                <ul className="py-1">
                                  {searchResults.map((u) => (
                                    <li key={u.id}>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectUser({ id: u.id, name: u.name, phoneNumber: u.phoneNumber, email: u.email })}
                                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60"
                                      >
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><UserIcon className="size-3.5" /></span>
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-medium text-foreground">{u.name}{u.phoneNumber ? ` (${u.phoneNumber})` : ""}</p>
                                        </div>
                                        <ChevronRight className="size-3.5 text-muted-foreground" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="space-y-3 p-4 text-center">
                                  <p className="text-sm text-muted-foreground">No user found</p>
                                  <Button
                                    type="button" size="sm"
                                    onClick={() => { setNewUser({ name: "", phoneNumber: "" }); setTempPassword(null); setShowCreateForm(true); setSearchOpen(false); }}
                                  >
                                    <UserPlus className="mr-1.5 size-3.5" /> Create New User
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {showCreateForm && (
                          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                            <div className="flex items-center gap-2">
                              <UserPlus className="size-4 text-primary" />
                              <Label className="text-sm font-semibold">Create New User</Label>
                            </div>
                            <div className="space-y-2">
                              <Input placeholder="Full name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                              <Input placeholder="Phone number" value={newUser.phoneNumber} onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })} />
                            </div>
                            {tempPassword && (
                              <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password</p>
                                  <p className="font-mono text-base font-bold tracking-widest text-foreground">{tempPassword}</p>
                                </div>
                                <Button size="sm" variant="outline" className="h-7 shrink-0 border-primary/40 text-primary hover:border-primary hover:bg-primary/10" onClick={() => { try { navigator.clipboard.writeText(tempPassword); toast.success("Password copied"); } catch { toast.error("Copy failed"); } }}>
                                  <Copy className="mr-1 size-3" /> Copy
                                </Button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => createUserMutation.mutate()} disabled={!newUser.name || !newUser.phoneNumber || createUserMutation.isPending}>
                                {createUserMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />} Create
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setShowCreateForm(false); setTempPassword(null); }}>Cancel</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="flex h-full flex-col gap-3"
                  >
                    <div className="rounded-lg border border-border bg-muted/30 px-2 py-2">
                      <DateStrip range={{ start: today, end: addDays(today, 89) }} value={date} onChange={setDate} today={today} className="min-w-0" />
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {([["all", "All"], ["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"], ["night", "Night"]] as const).map(([key, label]) => (
                          <button key={key} type="button" onClick={() => setBucket(key as Bucket)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${bucket === key ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/40"}`}>{label}</button>
                        ))}
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
                      <div className="space-y-3 p-2">
                        {fetchedTurfs.length === 0 ? (
                          <p className="py-10 text-center text-sm text-muted-foreground">No turfs available.</p>
                        ) : (
                          fetchedTurfs.map((turf) => {
                            const count = adminVisibleSlotsOf(turf, date, bucket, mounted).length;
                            if (!count) return null;
                            return <AdminTurfSlots key={turf.id} turf={turf} date={date} bucket={bucket} cart={picked} toggle={toggleSlot} />;
                          })
                        )}
                        {fetchedTurfs.every((t) => adminVisibleSlotsOf(t, date, bucket, mounted).length === 0) && (
                          <p className="py-10 text-center text-sm text-muted-foreground">No slots for this date/time.</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3"
                  >
                    {selectedUser && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {selectedUser.name}{selectedUser.phoneNumber ? ` · ${selectedUser.phoneNumber}` : ""}
                        </p>
                        {tempPassword && (
                          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Password</p>
                              <p className="font-mono text-base font-bold tracking-widest text-foreground">{tempPassword}</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 shrink-0 border-primary/40 text-primary hover:border-primary hover:bg-primary/10" onClick={() => { try { navigator.clipboard.writeText(tempPassword); toast.success("Password copied"); } catch { toast.error("Copy failed"); } }}>
                              <Copy className="mr-1 size-3" /> Copy
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <CalendarDays className="size-3.5" /> Slots ({picked.length})
                      </p>
                      <div className="space-y-1.5">
                        {picked.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-1.5 text-xs">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{p.turfName}</p>
                              <p className="text-[11px] text-muted-foreground">{p.date} · {timeLabel(p.startMinute)} – {timeLabel(p.endMinute)}</p>
                            </div>
                            <p className="shrink-0 font-medium">৳{formatPrice(p.price)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Wallet className="size-3.5" /> Summary
                      </p>
                      <div className="space-y-2 text-sm">
                        <Row label="Subtotal" value={`৳${formatPrice(baseTotal)}`} />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Discount</span>
                          <Input type="text" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^0-9]/g, ""))} className="h-8 w-24 text-right" />
                        </div>
                        <Separator />
                        <Row label="Total" value={`৳${formatPrice(grandTotal)}`} bold />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <CreditCard className="size-3.5" /> Record Payment
                        </p>
                        <button type="button" role="switch" aria-checked={advanceEnabled} onClick={handleToggleAdvance} className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${advanceEnabled ? "bg-primary" : "bg-input"}`}>
                          <span className={`block h-5 w-5 rounded-full bg-background shadow transition-transform ${advanceEnabled ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>

                      {!advanceEnabled && <p className="mt-2 text-xs text-muted-foreground">Booking will be created as <b>unpaid</b>.</p>}

                      {advanceEnabled && (
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => { setAdvanceMethod("CASH"); setAdvanceAmount(String(suggestedAdvanceTotal || grandTotal)); }} className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${isCash ? "border-primary/40 bg-primary/10 text-primary drop-shadow-[0_0_8px_rgba(128,0,255,0.35)] scale-105" : "border-border bg-card text-muted-foreground hover:scale-105"}`}>
                              <Banknote className="size-3.5" /> Cash
                            </button>
                            {paymentOptions.map((opt) => {
                              const selected = effectiveMethod === opt.id;
                              return (
                                <button type="button" key={opt.id} onClick={(e) => handleSelectPaymentMethod(opt.id, e)} className="flex items-center">
                                  <img src={opt.icon} alt={opt.name} className={`h-8 w-16 shrink-0 rounded-md bg-white transition ${selected ? "drop-shadow-[0_0_8px_rgba(128,0,255,0.5)] scale-105" : "hover:scale-105"}`} />
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Selected method: <span className="font-bold text-foreground">{isCash ? "Cash" : paymentMethodLabel(effectiveMethod)}</span>
                          </p>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">Amount</span>
                            <div className="relative w-32">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
                              <Input type="text" inputMode="numeric" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value.replace(/[^0-9]/g, ""))} className="h-8 pl-6 pr-2 text-right" />
                            </div>
                          </div>

                          {!isCash && (
                            <>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input type="tel" value={senderMobile} onChange={(e) => setSenderMobile(e.target.value)} placeholder="Sender mobile (01XXXXXXXXX)" className="h-9 pl-9" />
                              </div>
                              <div className="relative">
                                <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="Transaction ID" className="h-9 pl-9" />
                              </div>
                            </>
                          )}

                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference (optional)" className="h-9 pl-9" />
                          </div>
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-9 pl-9" />
                          </div>

                          {advanceError && <p className="text-xs text-destructive">{advanceError}</p>}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="shrink-0 border-t border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-xs text-muted-foreground">
                  {step === 2 ? (
                    <>Total <span className="font-semibold text-foreground">৳{formatPrice(grandTotal)}</span></>
                  ) : step === 1 ? (
                    <><span className="font-medium text-foreground">{picked.length}</span> slot{picked.length === 1 ? "" : "s"} · ৳{formatPrice(baseTotal)}</>
                  ) : selectedUser ? (
                    <>Customer selected</>
                  ) : (
                    <>Select a customer</>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  {step > 0 && (
                    <Button size="sm" variant="outline" onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}>
                      <ChevronLeft className="mr-1 size-3.5" /> Back
                    </Button>
                  )}
                  {step === 0 && (
                    <Button size="sm" variant="default" disabled={!selectedUser} onClick={() => setStep(1)}>
                      Next <ChevronRight className="ml-1 size-3.5" />
                    </Button>
                  )}
                  {step === 1 && (
                    <Button size="sm" variant="default" disabled={!canNext} onClick={() => setStep(2)}>
                      Next <ChevronRight className="ml-1 size-3.5" />
                    </Button>
                  )}
                  {step === 2 && (
                    <Button size="sm" variant="default" onClick={() => bookingMutation.mutate()} disabled={bookingMutation.isPending || (advanceEnabled && !advance)}>
                      {bookingMutation.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : advanceEnabled ? (isCash ? <Banknote className="mr-1.5 size-3.5" /> : <CreditCard className="mr-1.5 size-3.5" />) : <Sparkles className="mr-1.5 size-3.5" />}
                      {advanceEnabled ? `Confirm & Record ${isCash ? "Cash" : paymentMethodLabel(effectiveMethod)}` : "Confirm Booking"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "text-base font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}