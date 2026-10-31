"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { recordLocalActivity } from "@/lib/local-activity";
import { initialListings, initialReports } from "@/lib/demo-data";
import type { Conversation, Listing, Loan, Report, UserAccount, UserAccountInput } from "@/lib/marketplace-types";

import type { CatalogEntry } from "@/lib/catalog-db";
const KEY = "campus-loop-prototype-v2";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "No fue posible completar la operación.");
  return payload;
}

type LoanSnapshot = { loans: Loan[]; listingStates: { listingId: number; ownerId: number; ownerName: string; status: "Prestado" | "Disponible" }[] };

export function useMarketplace(currentUser: UserAccount | null) {
  const actorRef=useRef(currentUser?.id); actorRef.current=currentUser?.id;
  const [entries,setEntries]=useState<CatalogEntry[]>([]);
  const [catalogError,setCatalogError]=useState("");
  const [messagesError,setMessagesError]=useState("");
  const [storedListings, setListings] = useState<Listing[]>(initialListings);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [localReady, setLocalReady] = useState(false);
  const [loanStates, setLoanStates] = useState<LoanSnapshot["listingStates"]>([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansError, setLoansError] = useState("");
  const listings = useMemo(() => storedListings.map((item) => {
    item = {...item, career: entries.find(e=>e.kind==="career" && e.aliases.includes(item.career))?.name ?? item.career, category: entries.find(e=>e.kind==="category" && e.aliases.includes(item.category))?.name ?? item.category};
    const state = loanStates.find((entry) => entry.listingId === item.id);
    return state ? { ...item, owner: state.ownerName, ownerId:state.ownerId, status: state.status, mine: state.ownerId === currentUser?.id } : { ...item, mine: item.ownerId ? item.ownerId === currentUser?.id : false };
  }), [storedListings, loanStates, currentUser?.id, entries]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const state = JSON.parse(saved);
        setListings(state.listings ?? initialListings);

        setReports(state.reports ?? initialReports);

      }
    } catch { /* Ignore malformed prototype storage. */ } finally { setLocalReady(true); }
  }, []);

  useEffect(() => {
    let active=true; setConversations([]); setEntries([]); setMessagesError("");setCatalogError("");
    if(!currentUser) return;
    async function refresh() {
      const results=await Promise.allSettled([api<{conversations:Conversation[]}>("/api/messages"),api<{entries:CatalogEntry[]}>("/api/catalog")]);
      if(!active)return;
      if(results[0].status==="fulfilled"){setConversations(results[0].value.conversations);setMessagesError("");}else setMessagesError("No se pudieron cargar los mensajes. Se volverá a intentar.");
      if(results[1].status==="fulfilled"){setEntries(results[1].value.entries);setCatalogError("");}else setCatalogError("No se pudo cargar el catálogo institucional. Se volverá a intentar.");
    }
    void refresh();const timer=window.setInterval(refresh,5000);
    return ()=>{active=false;window.clearInterval(timer);};
  },[currentUser?.id]);

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
    if (localReady) localStorage.setItem(KEY, JSON.stringify({ listings: storedListings, reports }));
  }, [localReady, storedListings, reports]);

  const stats = useMemo(() => ({
    available: listings.filter((item) => item.status === "Disponible" && !item.hidden).length,
    activeLoans: loans.filter((loan) => !(loan.ownerConfirmed && loan.borrowerConfirmed)).length,
    openReports: reports.filter((report) => !report.resolved).length,
  }), [listings, loans, reports]);

  const addListing = (listing: Omit<Listing, "id" | "owner" | "mine" | "accent" | "icon">) => {
    if (!currentUser) throw new Error("Inicia sesión para publicar.");
    recordLocalActivity(currentUser.id, listing.mode, listing.title, "Publicación creada");
    setListings(items => [{...listing,id:Date.now(),owner:currentUser.name,ownerId:currentUser.id,mine:true,accent:"#d8ff3e",icon:"box"},...items]);
  };
  function updateStatus(id: number, status: Listing["status"]) {
    const listing=storedListings.find(item=>item.id===id);
    if(!listing || !currentUser || listing.ownerId!==currentUser.id) throw new Error("Solo puedes modificar tus publicaciones.");
    if(loanStates.some(item=>item.listingId===id) || listing.status==="Prestado") throw new Error("El estado de este recurso se actualiza desde la devolución del préstamo.");
    if(listing.status===status)return;
    recordLocalActivity(currentUser.id,listing.mode,listing.title,`Publicación: ${listing.status} → ${status}`);
    setListings(items=>items.map(item=>item.id===id?{...item,status}:item));
  }
  function reportListing(item: Listing) { if (reports.some((report) => report.target === item.title && !report.resolved)) return false; setReports((items) => [{ id: Date.now(), target: item.title, type: "Publicación", reason: "Contenido o condiciones potencialmente inapropiadas.", reporter: "Tú", resolved: false }, ...items]); return true; }
  async function confirmLoan(id: number) {
    const snapshot = await api<LoanSnapshot>("/api/loans", { method: "PATCH", body: JSON.stringify({ id }) });
    setLoans(snapshot.loans); setLoanStates(snapshot.listingStates);
    return snapshot.loans.find((loan) => loan.id === id)?.ownerConfirmed ?? false;
  }
  async function signOut() { await api("/api/session", { method: "DELETE" }); }
  function resolveReport(id: number, action: "hide" | "suspend" | "dismiss") { const report = reports.find((item) => item.id === id); if (action === "hide" && report) setListings((items) => items.map((item) => item.title === report.target ? { ...item, hidden: true } : item)); setReports((items) => items.map((item) => item.id === id ? { ...item, resolved: true } : item)); }
  async function sendMessage(id:number,text:string) { const actor=actorRef.current; const result=await api<{conversations:Conversation[]}>("/api/messages",{method:"PATCH",body:JSON.stringify({id,text})});if(actorRef.current===actor)setConversations(result.conversations); }
  async function startChat(recipientId:number) { const actor=actorRef.current; const result=await api<{id:number;conversations:Conversation[]}>("/api/messages",{method:"POST",body:JSON.stringify({recipientId})});if(actorRef.current===actor)setConversations(result.conversations);if(actorRef.current!==actor)throw new Error("La sesión cambió.");return result.id; }
  async function searchPeople(query:string) {return (await api<{people:{id:number;name:string;email:string}[]}>(`/api/people?q=${encodeURIComponent(query)}`)).people;}
  async function saveCatalog(input:{id?:number;kind:string;name:string},adminPassword:string) {const result=await api<{entries:CatalogEntry[]}>("/api/catalog",{method:"POST",body:JSON.stringify({...input,adminPassword})});setEntries(result.entries);const refreshed=await api<{users:UserAccount[]}>("/api/users");setUsers(refreshed.users);}
  async function verifyAdmin(adminPassword:string) {await api("/api/admin/verify",{method:"POST",body:JSON.stringify({adminPassword})});}


  async function authenticate(email: string, password: string) {
    setLoansLoading(true); setLoans([]); setLoanStates([]); setConversations([]);
    try {
      const result = await api<{ user: UserAccount }>("/api/session", { method: "POST", body: JSON.stringify({ email, password }) });
      return result.user;
    } catch (error) { setLoansLoading(false); throw error; }
  }
  async function addUser(actorId: number, user: UserAccountInput & { password: string }, adminPassword?:string) {
    const result = await api<{ user: UserAccount }>("/api/users", { method: "POST", body: JSON.stringify({ ...user, actorId, adminPassword }) });
    setUsers((items) => [...items, result.user]); return result.user;
  }
  async function updateUser(actorId: number, id: number, changes: Partial<UserAccountInput> & { status?: UserAccount["status"] }, adminPassword?:string) {
    const result = await api<{ user: UserAccount }>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify({ ...changes, actorId, adminPassword }) });
    setUsers((items) => items.map((user) => user.id === id ? result.user : user)); return result.user;
  }
  async function toggleUser(actorId: number, user: UserAccount, adminPassword?:string) { return updateUser(actorId, user.id, { status: user.status === "Activo" ? "Suspendido" : "Activo" }, adminPassword); }
  async function deleteUser(actorId: number, id: number, adminPassword?:string) { await api(`/api/users/${id}`, { method: "DELETE", body: JSON.stringify({ actorId, adminPassword }) }); setUsers((items) => items.filter((user) => user.id !== id)); }

  return { entries, catalogError, messagesError, searchPeople, startChat, saveCatalog, verifyAdmin, listings, loans, reports, conversations, users, hydrated: localReady, loansLoading, loansError, loanStates, signOut, stats, addListing, updateStatus, reportListing, confirmLoan, resolveReport, sendMessage, authenticate, addUser, updateUser, toggleUser, deleteUser };
}
