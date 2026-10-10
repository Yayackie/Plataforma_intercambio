"use client";
import { useEffect, useMemo, useState } from "react";
import { initialConversations, initialListings, initialLoans, initialReports, initialUsers } from "@/lib/demo-data";
import type { Conversation, Listing, Loan, Report, UserAccount, UserAccountInput } from "@/lib/marketplace-types";

const KEY = "campus-loop-prototype-v2";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "No fue posible completar la operación.");
  return payload;
}

export function useMarketplace() {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [localReady, setLocalReady] = useState(false);
  const [usersReady, setUsersReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const state = JSON.parse(saved);
        setListings(state.listings ?? initialListings);
        setLoans(state.loans ?? initialLoans);
        setReports(state.reports ?? initialReports);
        setConversations(state.conversations ?? initialConversations);
      }
    } finally { setLocalReady(true); }
  }, []);

  useEffect(() => {
    api<{ users: UserAccount[] }>("/api/users")
      .then((result) => setUsers(result.users))
      .catch(() => setUsers(initialUsers))
      .finally(() => setUsersReady(true));
  }, []);

  useEffect(() => {
    if (localReady) localStorage.setItem(KEY, JSON.stringify({ listings, loans, reports, conversations }));
  }, [localReady, listings, loans, reports, conversations]);

  const stats = useMemo(() => ({
    available: listings.filter((item) => item.status === "Disponible" && !item.hidden).length,
    activeLoans: loans.filter((loan) => !(loan.ownerConfirmed && loan.borrowerConfirmed)).length,
    openReports: reports.filter((report) => !report.resolved).length,
  }), [listings, loans, reports]);

  const addListing = (listing: Omit<Listing, "id" | "owner" | "mine" | "accent" | "icon">) => setListings((items) => [{ ...listing, id: Date.now(), owner: "Tú", mine: true, accent: "#d8ff3e", icon: "box" }, ...items]);
  const updateStatus = (id: number, status: Listing["status"]) => setListings((items) => items.map((item) => item.id === id ? { ...item, status } : item));
  function reportListing(item: Listing) { if (reports.some((report) => report.target === item.title && !report.resolved)) return false; setReports((items) => [{ id: Date.now(), target: item.title, type: "Publicación", reason: "Contenido o condiciones potencialmente inapropiadas.", reporter: "Tú", resolved: false }, ...items]); return true; }
  function confirmLoan(id: number) { const loan = loans.find((item) => item.id === id); if (!loan) return false; const updated = { ...loan, [loan.role === "owner" ? "ownerConfirmed" : "borrowerConfirmed"]: true }; setLoans((items) => items.map((item) => item.id === id ? updated : item)); if (updated.ownerConfirmed && updated.borrowerConfirmed) updateStatus(updated.listingId, "Disponible"); return updated.ownerConfirmed && updated.borrowerConfirmed; }
  function resolveReport(id: number, action: "hide" | "suspend" | "dismiss") { const report = reports.find((item) => item.id === id); if (action === "hide" && report) setListings((items) => items.map((item) => item.title === report.target ? { ...item, hidden: true } : item)); setReports((items) => items.map((item) => item.id === id ? { ...item, resolved: true } : item)); }
  const sendMessage = (id: number, text: string) => setConversations((items) => items.map((conversation) => conversation.id === id ? { ...conversation, messages: [...conversation.messages, { from: "me", text, time: "Ahora" }] } : conversation));

  async function authenticate(email: string, password: string) {
    const result = await api<{ user: UserAccount }>("/api/session", { method: "POST", body: JSON.stringify({ email, password }) });
    return result.user;
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

  return { listings, loans, reports, conversations, users, hydrated: localReady && usersReady, stats, addListing, updateStatus, reportListing, confirmLoan, resolveReport, sendMessage, authenticate, addUser, updateUser, toggleUser, deleteUser };
}
