"use client";
import { useEffect, useMemo, useState } from "react";
import { initialConversations, initialListings, initialReports } from "@/lib/demo-data";
import type { Conversation, Listing, Loan, Report, UserAccount, UserAccountInput } from "@/lib/marketplace-types";

const KEY = "campus-loop-prototype-v2";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "No fue posible completar la operación.");
  return payload;
}

type LoanSnapshot = { loans: Loan[]; listingStates: { listingId: number; ownerId: number; ownerName: string; status: "Prestado" | "Disponible" }[] };

export function useMarketplace(currentUser: UserAccount | null) {
  const [storedListings, setListings] = useState<Listing[]>(initialListings);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [localReady, setLocalReady] = useState(false);
  const [loanStates, setLoanStates] = useState<LoanSnapshot["listingStates"]>([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansError, setLoansError] = useState("");
  const listings = useMemo(() => storedListings.map((item) => {
    const state = loanStates.find((entry) => entry.listingId === item.id);
    return state ? { ...item, owner: state.ownerName, status: state.status, mine: state.ownerId === currentUser?.id } : { ...item, mine: item.ownerId ? item.ownerId === currentUser?.id : false };
  }), [storedListings, loanStates, currentUser?.id]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const state = JSON.parse(saved);
        setListings(state.listings ?? initialListings);

        setReports(state.reports ?? initialReports);
        setConversations(state.conversations ?? initialConversations);
      }
    } catch { /* Ignore malformed prototype storage. */ } finally { setLocalReady(true); }
  }, []);

  useEffect(() => {
    let active = true;
    if (!currentUser) { setUsers([]); setLoans([]); setLoanStates([]); setLoansLoading(false); return; }
    api<{ users: UserAccount[] }>("/api/users").then((result) => { if (active) setUsers(result.users); }).catch(() => { if (active) setUsers([currentUser]); });
    async function refresh() {
      try {
        const snapshot = await api<LoanSnapshot>("/api/loans");
        if (active) { setLoans(snapshot.loans); setLoanStates(snapshot.listingStates); setLoansError(""); }
      } catch (error) { if (active) setLoansError(error instanceof Error ? error.message : "No se pudieron consultar los préstamos."); }
      finally { if (active) setLoansLoading(false); }
    }
    setLoansLoading(true); setLoansError(""); void refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (localReady) localStorage.setItem(KEY, JSON.stringify({ listings: storedListings, reports, conversations }));
  }, [localReady, storedListings, reports, conversations]);

  const stats = useMemo(() => ({
    available: listings.filter((item) => item.status === "Disponible" && !item.hidden).length,
    activeLoans: loans.filter((loan) => !(loan.ownerConfirmed && loan.borrowerConfirmed)).length,
    openReports: reports.filter((report) => !report.resolved).length,
  }), [listings, loans, reports]);

  const addListing = (listing: Omit<Listing, "id" | "owner" | "mine" | "accent" | "icon">) => setListings((items) => [{ ...listing, id: Date.now(), owner: currentUser?.name ?? "Tú", ownerId: currentUser?.id, mine: true, accent: "#d8ff3e", icon: "box" }, ...items]);
  function updateStatus(id: number, status: Listing["status"]) {
    const loan = loanStates.find((item) => item.listingId === id);
    if (loan || storedListings.find((item) => item.id === id)?.status === "Prestado") throw new Error("El estado de este recurso se actualiza desde la devolución del préstamo.");
    setListings((items) => items.map((item) => item.id === id ? { ...item, status } : item));
  }
  function reportListing(item: Listing) { if (reports.some((report) => report.target === item.title && !report.resolved)) return false; setReports((items) => [{ id: Date.now(), target: item.title, type: "Publicación", reason: "Contenido o condiciones potencialmente inapropiadas.", reporter: "Tú", resolved: false }, ...items]); return true; }
  async function confirmLoan(id: number) {
    const snapshot = await api<LoanSnapshot>("/api/loans", { method: "PATCH", body: JSON.stringify({ id }) });
    setLoans(snapshot.loans); setLoanStates(snapshot.listingStates);
    return snapshot.loans.find((loan) => loan.id === id)?.ownerConfirmed ?? false;
  }
  async function signOut() { await api("/api/session", { method: "DELETE" }); }
  function resolveReport(id: number, action: "hide" | "suspend" | "dismiss") { const report = reports.find((item) => item.id === id); if (action === "hide" && report) setListings((items) => items.map((item) => item.title === report.target ? { ...item, hidden: true } : item)); setReports((items) => items.map((item) => item.id === id ? { ...item, resolved: true } : item)); }
  const sendMessage = (id: number, text: string) => setConversations((items) => items.map((conversation) => conversation.id === id ? { ...conversation, messages: [...conversation.messages, { from: "me", text, time: "Ahora" }] } : conversation));

  async function authenticate(email: string, password: string) {
    setLoansLoading(true); setLoans([]); setLoanStates([]);
    try {
      const result = await api<{ user: UserAccount }>("/api/session", { method: "POST", body: JSON.stringify({ email, password }) });
      return result.user;
    } catch (error) { setLoansLoading(false); throw error; }
  }
  async function addUser(actorId: number, user: UserAccountInput & { password: string }) {
    const result = await api<{ user: UserAccount }>("/api/users", { method: "POST", body: JSON.stringify({ ...user, actorId }) });
    setUsers((items) => [...items, result.user]); return result.user;
  }
  async function updateUser(actorId: number, id: number, changes: Partial<UserAccountInput> & { status?: UserAccount["status"] }) {
    const result = await api<{ user: UserAccount }>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ ...changes, actorId }) });
    setUsers((items) => items.map((user) => user.id === id ? result.user : user)); return result.user;
  }
  async function toggleUser(actorId: number, user: UserAccount) { return updateUser(actorId, user.id, { status: user.status === "Activo" ? "Suspendido" : "Activo" }); }
  async function deleteUser(actorId: number, id: number) { await api(`/api/users/${id}`, { method: "DELETE", body: JSON.stringify({ actorId }) }); setUsers((items) => items.filter((user) => user.id !== id)); }

  return { listings, loans, reports, conversations, users, hydrated: localReady, loansLoading, loansError, loanStates, signOut, stats, addListing, updateStatus, reportListing, confirmLoan, resolveReport, sendMessage, authenticate, addUser, updateUser, toggleUser, deleteUser };
}
