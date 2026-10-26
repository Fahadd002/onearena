"use client";

import { useMemo, useRef, useState, useEffect, forwardRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Search,
  UserPlus,
  Loader2,
  Check,
  CalendarDays,
  Wallet,
  UserIcon,
  Sparkles,
  CreditCard,
  Smartphone,
  Hash,
  Banknote,
  Lock,
  ChevronRight,
  Phone,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { httpClient } from "@/lib/axios/httpClient";
import { API_ENDPOINTS } from "@/lib/api/config";
import { startOfToday, addDays } from "@/components/turfs/dateRanges";
import { ymd, formatPrice, timeLabel } from "@/lib/slotsUtils";
import { DateStrip } from "@/components/turfs/DateStrip";
import { TurfRow, visibleSlotsOf } from "@/components/turfs/TurfRow";
import { AdminTurfSlots, visibleSlotsOf as adminVisibleSlotsOf } from "./AdminTurfSlots";
import { fetchTurfById } from "@/components/turfs/api";
import type { Turf } from "@/types/turf.type";
import type { Bucket } from "@/lib/slotsUtils";
import { useIsMounted } from "@/components/turfs/useIsToday";

interface UserSearchResult {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
}

interface SelectedUser {
  id: string;
  name: string;
  phoneNumber?: string | null;
  email?: string | null;
}

interface PickedSlot {
  id: string;
  turfId: string;
  turfName: string;
  startMinute: number;
  endMinute: number;
  price: number;
  date: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  turfs?: Turf[];
  todayISO?: string;
}

const paymentOptions = [
  { id: "BKASH", name: "bKash", icon: "/marchent-icon/bKash.svg" },
  { id: "NAGAD", name: "Nagad", icon: "/marchent-icon/nagad.svg" },
  { id: "ROKET", name: "Rocket", icon: "/marchent-icon/rocket.svg" },
] as const;

const ADVANCE_PER_SLOT = 500;

export function AdminBookingDrawer({ isOpen, onClose, todayISO }: Props) {
  const queryClient = useQueryClient();
  const mounted = useIsMounted();
  const today = useMemo(() => new Date(todayISO ?? ymd(startOfToday())), [todayISO]);

  const slotSectionRef = useRef<HTMLElement>(null);
  const confirmSectionRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", phoneNumber: "", role: "USER" });
  const trimmedSearch = searchTerm.trim();

  const [date, setDate] = useState<Date>(today);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [picked, setPicked] = useState<PickedSlot[]>([]);

  const [discount, setDiscount] = useState("0");
  const [advanceEnabled, setAdvanceEnabled] = useState(false);
  const [advanceMethod, setAdvanceMethod] = useState<string>("");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [senderMobile, setSenderMobile] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  const { data: turfsData } = useQuery({
    queryKey: ["admin-turfs", ymd(date)],
    queryFn: async () => {
      const res = await httpClient.get<any>(API_ENDPOINTS.marketplace.turfs, {
        params: { date: ymd(date), page: "1", limit: "50" },
      });
      return res.data ?? [];
    },
    enabled: isOpen,
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
      const res = await httpClient.get<UserSearchResult[]>(API_ENDPOINTS.marketplace.usersSearch, {
        params: { q: trimmedSearch },
      });
      return res.data ?? [];
    },
    enabled: isOpen && !selectedUser && trimmedSearch.length >= 3,
    staleTime: 0,
  });

  const recalcDropdown = () => {
    if (!searchInputRef.current) return;
    setDropdownRect(searchInputRef.current.getBoundingClientRect());
  };

  useEffect(() => {
    if (!searchOpen) return;
    recalcDropdown();
    const onScrollOrResize = () => recalcDropdown();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      const inInput = searchInputRef.current && searchInputRef.current.contains(target);
      const inDropdown = (e.target as HTMLElement)?.closest?.("[data-search-dropdown]");
      if (!inInput && !inDropdown) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [searchOpen]);

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const res = await httpClient.post<any>(API_ENDPOINTS.marketplace.usersByPhone, {
        name: newUser.name,
        phoneNumber: newUser.phoneNumber || trimmedSearch,
        role: newUser.role || "USER",
        defaultPassword: "password123",
      });
      return res.data;
    },
    onSuccess: (user) => {
      toast.success("User created");
      handleSelectUser({ id: user.id, name: user.name, phoneNumber: user.phoneNumber, email: user.email });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create user"),
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        userId: selectedUser!.id,
        slotIds: picked.map((p) => p.id),
        discountAmount: Number(discount) || 0,
      };
      const adv = buildAdvancePayload();
      if (adv) payload.advancePayment = adv;
      const res = await httpClient.post(API_ENDPOINTS.marketplace.adminBookings, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Booking ${(data as any)?.bookingNumber ?? ""} created`);
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      reset();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create booking"),
  });

  const step1Complete = !!selectedUser;
  const step2Complete = picked.length > 0;
  const step3Unlocked = step1Complete && step2Complete;

  const baseTotal = picked.reduce((sum, p) => sum + p.price, 0);
  const discountValue = Math.max(0, Math.min(Number(discount) || 0, baseTotal));
  const grandTotal = baseTotal - discountValue;

  const suggestedAdvanceTotal = Math.min(ADVANCE_PER_SLOT * picked.length, grandTotal);

  const effectiveMethod = advanceMethod || (canPayAdvanceMobile ? mobilePaymentNumbers[0]?.method ?? "CASH" : "CASH");
  const isCash = effectiveMethod === "CASH";

  const paymentAmount = isCash
    ? Math.max(0, Math.min(Number(cashAmount) || 0, grandTotal))
    : Math.min(suggestedAdvanceTotal, grandTotal);

  function buildAdvancePayload() {
    if (!advanceEnabled) return null;
    if (paymentAmount <= 0) return null;
    if (isCash) {
      return { method: "CASH", senderMobile: "", transactionId: "", amount: paymentAmount };
    }
    const sender = senderMobile.replace(/[\s-]/g, "");
    const txn = transactionId.trim();
    if (!/^(?:\+8801|01)\d{9}$/.test(sender)) return null;
    if (txn.length < 4 || txn.length > 64) return null;
    return { method: effectiveMethod, senderMobile: sender, transactionId: txn, amount: paymentAmount };
  }

  const advance = useMemo(() => {
    if (!advanceEnabled) return null;
    const sender = senderMobile.replace(/[\s-]/g, "");
    const txn = transactionId.trim();
    let err: string | null = null;

    if (paymentAmount <= 0) {
      err = "Payment amount must be greater than 0";
    } else if (paymentAmount > grandTotal) {
      err = "Payment amount cannot exceed the booking total";
    } else if (!isCash) {
      if (!/^(?:\+8801|01)\d{9}$/.test(sender)) {
        err = "Enter a valid sender mobile number";
      } else if (txn.length < 4 || txn.length > 64) {
        err = "Enter a valid transaction number";
      }
    }

    setAdvanceError(err);
    if (err) return null;
    return { method: effectiveMethod, senderMobile: isCash ? "" : sender, transactionId: isCash ? "" : txn, amount: paymentAmount };
  }, [advanceEnabled, effectiveMethod, isCash, senderMobile, transactionId, paymentAmount, grandTotal]);

  useEffect(() => {
    if (step1Complete && slotSectionRef.current) {
      const t = setTimeout(() => {
        slotSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [step1Complete]);

  useEffect(() => {
    if (step3Unlocked && confirmSectionRef.current) {
      const t = setTimeout(() => {
        confirmSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [step3Unlocked]);

  function handleSelectUser(u: SelectedUser) {
    setSelectedUser(u);
    setSearchTerm("");
    setSearchOpen(false);
    setDropdownRect(null);
    setShowCreateForm(false);
  }

  function handleChangeUser() {
    setSelectedUser(null);
    setSearchTerm("");
    setSearchOpen(false);
    setDropdownRect(null);
    setShowCreateForm(false);
  }

  const toggleSlot = (s: PickedSlot) => {
    setPicked((prev) => {
      const idx = prev.findIndex((p) => p.id === s.id);
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return [...prev, s];
    });
  };

  const reset = () => {
    setSelectedUser(null);
    setSearchTerm("");
    setSearchOpen(false);
    setDropdownRect(null);
    setShowCreateForm(false);
    setNewUser({ name: "", phoneNumber: "", role: "USER" });
    setPicked([]);
    setDiscount("0");
    setAdvanceEnabled(false);
    setAdvanceMethod("");
    setCashAmount("");
    setSenderMobile("");
    setTransactionId("");
    setAdvanceError(null);
    setDate(today);
    setBucket("all");
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleToggleAdvance = () => {
    const next = !advanceEnabled;
    setAdvanceEnabled(next);
    if (next) {
      setAdvanceError(null);
      const defaultMethod = canPayAdvanceMobile ? mobilePaymentNumbers[0]?.method ?? "CASH" : "CASH";
      setAdvanceMethod(defaultMethod);
      if (defaultMethod === "CASH") {
        setCashAmount(String(suggestedAdvanceTotal || grandTotal));
      }
    } else {
      setAdvanceMethod("");
      setCashAmount("");
      setSenderMobile("");
      setTransactionId("");
      setAdvanceError(null);
    }
  };

  const handleSelectPaymentMethod = (method: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const scroller = bodyScrollRef.current;
    const savedTop = scroller?.scrollTop ?? 0;
    setAdvanceMethod(method);
    requestAnimationFrame(() => {
      if (scroller) scroller.scrollTop = savedTop;
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" />
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed inset-y-0 right-0 z-[100] flex h-full w-full flex-col border-l border-border bg-background shadow-2xl sm:w-[min(680px,100vw)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold sm:text-lg">Book Slot for User</h2>
            </div>
            <Button variant="outline" size="sm" onClick={close} className="h-8 w-8 border-transparent p-0 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground" aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>

          <div ref={bodyScrollRef} className="flex-1 overflow-auto [overflow-anchor:none]">
            <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
              <Section number={1} title="Select Customer" subtitle="Search or create a user" done={step1Complete}>
                {selectedUser ? (
                  <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <UserIcon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{selectedUser.name}{selectedUser.phoneNumber ? ` (${selectedUser.phoneNumber})` : ""}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 shrink-0 border-primary/40 text-primary hover:border-primary hover:bg-primary/10" onClick={handleChangeUser}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search by Phone, Name or Email</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        ref={searchInputRef}
                        placeholder="Enter at least 3 characters..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setSearchOpen(true);
                          setShowCreateForm(false);
                          requestAnimationFrame(recalcDropdown);
                        }}
                        onFocus={() => {
                          recalcDropdown();
                          setSearchOpen(true);
                        }}
                        className="h-9 pl-9 pr-9"
                      />
                      {searching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                    </div>

                    {showCreateForm && (
                      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center gap-2">
                          <UserPlus className="size-4 text-primary" />
                          <Label className="text-sm font-semibold">Create New User</Label>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name *</Label>
                            <Input className="h-9" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone *</Label>
                            <Input className="h-9" value={newUser.phoneNumber} onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => createUserMutation.mutate()} disabled={!newUser.name || !newUser.phoneNumber || createUserMutation.isPending}>
                            {createUserMutation.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                            Create
                          </Button>
                          <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:border-primary hover:bg-primary/10" onClick={() => setShowCreateForm(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Section>

              <Section ref={slotSectionRef} number={2} title="Pick Slots" subtitle="Choose a date and time" locked={!step1Complete} lockedHint="Select a customer first" done={step2Complete} summary={step2Complete ? (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-foreground">{picked.length} slot{picked.length > 1 ? "s" : ""}</span>
                  <span className="truncate text-xs text-muted-foreground">· ৳{formatPrice(baseTotal)}</span>
                  <Button variant="outline" size="sm" className="ml-auto h-7 shrink-0 border-primary/40 text-primary hover:border-primary hover:bg-primary/10" onClick={() => setPicked([])}>
                    Clear
                  </Button>
                </div>
              ) : null}>
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted/30 px-2 py-2">
                    <DateStrip range={{ start: today, end: addDays(today, 89) }} value={date} onChange={setDate} today={today} className="min-w-0" />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {([["all", "All"], ["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"], ["night", "Night"]] as const).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setBucket(key as Bucket)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${bucket === key ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
                    <div className="space-y-3 p-2">
                      {fetchedTurfs.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">No turfs available.</p>
                      ) : (
                        fetchedTurfs.map((turf) => {
                          const slotCount = adminVisibleSlotsOf(turf, date, bucket, mounted).length;
                          if (!slotCount) return null;
                          return <AdminTurfSlots key={turf.id} turf={turf} date={date} bucket={bucket} cart={picked} toggle={toggleSlot} />;
                        })
                      )}
                      {fetchedTurfs.every((t) => adminVisibleSlotsOf(t, date, bucket, mounted).length === 0) && (
                        <p className="py-10 text-center text-sm text-muted-foreground">No slots for this date/time.</p>
                      )}
                    </div>
                  </div>
                </div>
              </Section>

              <Section ref={confirmSectionRef} number={3} title="Confirm Booking" subtitle="Review and complete payment" locked={!step3Unlocked} lockedHint={!step1Complete ? "Select a customer first" : "Pick at least one slot first"} done={false}>
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <CalendarDays className="size-3.5" /> Slots
                    </p>
                    <div className="space-y-1.5">
                      {picked.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.turfName}</p>
                            <p className="text-xs text-muted-foreground">{p.date} · {timeLabel(p.startMinute)} – {timeLabel(p.endMinute)}</p>
                          </div>
                          <p className="shrink-0 font-medium">৳{formatPrice(p.price)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Wallet className="size-3.5" /> Summary
                    </p>
                    <div className="space-y-2 text-sm">
                      <Row label={`Subtotal (${picked.length} slot${picked.length > 1 ? "s" : ""})`} value={`৳${formatPrice(baseTotal)}`} />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Discount</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={baseTotal}
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          className="h-8 w-28 text-right"
                        />
                      </div>
                      <Separator />
                      <Row label="Total" value={`৳${formatPrice(grandTotal)}`} bold />
                      {advanceEnabled && advance && (
                        <Row label={isCash ? "Cash received" : "Advance paid"} value={`৳${formatPrice(advance.amount)}`} />
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <CreditCard className="size-3.5" /> Payment
                      </p>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={advanceEnabled}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const scroller = bodyScrollRef.current;
                          const savedTop = scroller?.scrollTop ?? 0;
                          handleToggleAdvance();
                          requestAnimationFrame(() => {
                            if (scroller) scroller.scrollTop = savedTop;
                          });
                        }}
                        className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input ${advanceEnabled ? "bg-primary" : "bg-input"}`}
                        data-state={advanceEnabled ? "checked" : "unchecked"}
                        aria-label="Toggle payment recording"
                      >
                        <span
                          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${advanceEnabled ? "translate-x-5" : "translate-x-0"}`}
                        />
                      </button>
                    </div>

                    {!advanceEnabled && (
                      <p className="mt-3 text-xs text-muted-foreground">Booking will be created as <b>unpaid</b>. Customer can pay at the venue.</p>
                    )}

                    {advanceEnabled && (
                      <div className="mt-3 min-h-[200px] space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const scroller = bodyScrollRef.current;
                              const savedTop = scroller?.scrollTop ?? 0;
                              setAdvanceMethod("CASH");
                              setCashAmount(String(suggestedAdvanceTotal || grandTotal));
                              requestAnimationFrame(() => {
                                if (scroller) scroller.scrollTop = savedTop;
                              });
                            }}
                            className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${isCash ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}
                          >
                            <Banknote className="size-3.5" />
                            Cash
                          </button>
                          {paymentOptions.map((opt) => {
                            const selected = effectiveMethod === opt.id;
                            return (
                              <button
                                type="button"
                                key={opt.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => handleSelectPaymentMethod(opt.id, e)}
                                className="flex cursor-pointer items-center transition-all duration-200"
                              >
                                <img
                                  src={opt.icon}
                                  alt={opt.name}
                                  className={`h-9 w-20 shrink-0 rounded-md transition-all duration-200 bg-white ${selected ? "drop-shadow-[0_0_8px_rgba(128,0,255,0.5)] scale-105" : "hover:scale-105"}`}
                                />
                              </button>
                            );
                          })}
                        </div>

                        {isCash && (
                          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                              <Banknote className="size-3.5" />
                              Record cash received at the counter
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <Label className="text-xs text-muted-foreground">Amount received</Label>
                              <div className="relative w-36">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
                                <Input type="number" min={0} max={grandTotal} value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="h-8 pl-7 text-right" />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Suggested <span className="font-semibold text-foreground">৳{formatPrice(suggestedAdvanceTotal)}</span> ({ADVANCE_PER_SLOT}/slot)
                            </p>
                          </div>
                        )}

                        {!isCash && (
                          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                            {(() => {
                              const selected = mobilePaymentNumbers.find((p) => p.method === effectiveMethod) || paymentOptions.find((p) => p.id === effectiveMethod);
                              if (isCash) return null;
                              if (selected && 'number' in selected) {
                                return (
                                  <p className="text-xs text-muted-foreground">
                                    Send <span className="font-semibold text-foreground">৳{formatPrice(suggestedAdvanceTotal)}</span> to{" "}
                                    <span className="font-semibold text-primary">{selected.number}</span> ({selected.method}), then enter details below.
                                  </p>
                                );
                              }
                              return (
                                <p className="text-xs text-muted-foreground">
                                  Send <span className="font-semibold text-foreground">৳{formatPrice(suggestedAdvanceTotal)}</span> via {paymentOptions.find(p => p.id === effectiveMethod)?.name}, then enter details below.
                                </p>
                              );
                            })()}
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="tel"
                                value={senderMobile}
                                onFocus={(e) => {
                                  const scroller = bodyScrollRef.current;
                                  const savedTop = scroller?.scrollTop ?? 0;
                                  requestAnimationFrame(() => {
                                    if (scroller) scroller.scrollTop = savedTop;
                                  });
                                }}
                                onChange={(e) => setSenderMobile(e.target.value)}
                                placeholder="Sender mobile number (01XXXXXXXXX)"
                                className="h-9 pl-9"
                              />
                            </div>
                            <div className="relative">
                              <Hash className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={transactionId}
                                onFocus={(e) => {
                                  const scroller = bodyScrollRef.current;
                                  const savedTop = scroller?.scrollTop ?? 0;
                                  requestAnimationFrame(() => {
                                    if (scroller) scroller.scrollTop = savedTop;
                                  });
                                }}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder="Transaction ID"
                                className="h-9 pl-9"
                              />
                            </div>
                          </div>
                        )}

                        {advanceError && <p className="text-xs text-destructive">{advanceError}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            </div>
          </div>

          <div className="border-t border-border bg-card/80 px-3 py-3 sm:px-6 sm:py-4">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
              <div className="min-w-0 text-xs text-muted-foreground sm:text-sm">
                {step3Unlocked ? (
                  <>
                    Total <span className="font-semibold text-foreground">৳{formatPrice(grandTotal)}</span>
                    {advanceEnabled && advance && (
                      <span className="ml-2">· {isCash ? "Cash" : "Advance"} ৳{formatPrice(advance.amount)}</span>
                    )}
                  </>
                ) : step2Complete ? (
                  <>
                    <span className="font-medium text-foreground">{picked.length}</span> slot{picked.length === 1 ? "" : "s"} selected <span className="ml-2">· ৳{formatPrice(baseTotal)}</span>
                  </>
                ) : step1Complete ? (
                  <>Pick at least one slot to continue</>
                ) : (
                  <>Select a customer to begin</>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" className="border-primary/40 text-primary hover:border-primary hover:bg-primary/10" onClick={close}>
                  Cancel
                </Button>
                <Button size="sm" variant="default" onClick={() => bookingMutation.mutate()} disabled={!step3Unlocked || bookingMutation.isPending || (advanceEnabled && !advance)}>
                  {bookingMutation.isPending ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : advanceEnabled && advance ? (
                    isCash ? <Banknote className="mr-1.5 size-3.5" /> : <CreditCard className="mr-1.5 size-3.5" />
                  ) : (
                    <Sparkles className="mr-1.5 size-3.5" />
                  )}
                  {advanceEnabled && advance ? (isCash ? `Confirm & Record Cash (৳${formatPrice(advance.amount)})` : `Confirm & Pay (৳${formatPrice(advance.amount)})`) : "Confirm Booking"}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {searchOpen && trimmedSearch.length >= 3 && dropdownRect &&
          createPortal(
            <div data-search-dropdown className="fixed z-[200] max-h-72 overflow-auto rounded-lg border border-border bg-popover shadow-lg" style={{ top: dropdownRect.bottom + 4, left: dropdownRect.left, width: dropdownRect.width }}>
              {searching && !searchResults?.length ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <ul className="py-1">
                  {searchResults.map((u) => (
                  <li key={u.id}>
                    <button type="button" onClick={() => handleSelectUser({ id: u.id, name: u.name, phoneNumber: u.phoneNumber, email: u.email })} className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted/60">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <UserIcon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {u.name}{u.phoneNumber ? ` (${u.phoneNumber})` : ""}
                        </p>
                      </div>
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3 p-4 text-center">
                  <p className="text-sm text-muted-foreground">No user found</p>
                  <Button type="button" onClick={() => { setNewUser({ name: "", phoneNumber: trimmedSearch, role: "USER" }); setShowCreateForm(true); setSearchOpen(false); }} size="sm" variant="default">
                    <UserPlus className="mr-1.5 size-3.5" />
                    Create New User
                  </Button>
                </div>
              )}
            </div>,
            document.body
          )}
      </>
    </AnimatePresence>,
    document.body
  );
}

interface SectionProps {
  number: number;
  title: string;
  subtitle: string;
  locked?: boolean;
  lockedHint?: string;
  done?: boolean;
  summary?: ReactNode;
  children: ReactNode;
}

const Section = forwardRef<HTMLElement, SectionProps>(function Section({ number, title, subtitle, locked, lockedHint, done, summary, children }, ref) {
  return (
    <section ref={ref} className={`relative rounded-xl border bg-card transition-all duration-300 ${locked ? "border-border/60 opacity-60" : done ? "border-primary/40" : "border-border"}`}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-primary text-primary-foreground" : locked ? "border border-muted-foreground/40 text-muted-foreground" : "border border-primary/40 bg-primary/10 text-primary"}`}>
          {done ? <Check className="size-3.5" strokeWidth={3} /> : number}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          {!summary && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {locked && (
          <span className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Lock className="size-2.5" />
            Locked
          </span>
        )}
      </div>

      {summary && <div className="border-b border-border bg-muted/20 px-4 py-2">{summary}</div>}

      {locked ? (
        <div className="flex items-center justify-center px-4 py-6 text-xs text-muted-foreground">{lockedHint}</div>
      ) : (
        <div className="p-4">{children}</div>
      )}
    </section>
  );
});

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "text-base font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
