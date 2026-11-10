"use client";
import { useEffect, useMemo, useState, useRef } from "react";


import type { Conversation, Listing, Loan, Report, UserAccount, UserAccountInput } from "@/lib/marketplace-types";

import type { CatalogEntry } from "@/lib/catalog-db";


async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache:"no-store", ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "No fue posible completar la operación.");
  return payload;
}

type LoanSnapshot = { loans: Loan[]; listingStates: { listingId: number; ownerId: number; ownerName: string; status: "Prestado" | "Disponible" }[] };

export function useMarketplace(currentUser: UserAccount | null) {
  const actorRef=useRef(currentUser?.id); actorRef.current=currentUser?.id;
  const generation=useRef(0);
  const [notifications,setNotifications]=useState<{section:string;count:number;lastId:number}[]>([]);
  const [entries,setEntries]=useState<CatalogEntry[]>([]);
  const [catalogError,setCatalogError]=useState("");
  const [messagesError,setMessagesError]=useState("");
  const [storedListings, setListings] = useState<Listing[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [localReady, setLocalReady] = useState(false);
  const [loanStates, setLoanStates] = useState<LoanSnapshot["listingStates"]>([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansError, setLoansError] = useState("");
  const listings = useMemo(() => storedListings.map((item) => {
    item = {...item, career: entries.find(e=>e.kind==="career" && e.aliases.includes(item.career))?.name ?? item.career, category: entries.find(e=>e.kind==="category" && e.aliases.includes(item.category))?.name ?? item.category};
    return {...item,mine:item.ownerId===currentUser?.id};
  }), [storedListings, loanStates, currentUser?.id, entries]);

  useEffect(()=>setLocalReady(true),[]);

  useEffect(() => {
    let active=true,refreshing=false; setListings([]);setReports([]);setNotifications([]); setConversations([]); setEntries([]); setMessagesError("");setCatalogError("");
    if(!currentUser) return;
    async function refresh() {
      if(refreshing)return;refreshing=true;const version=generation.current;
      const results=await Promise.allSettled([api<{conversations:Conversation[]}>("/api/messages"),api<{entries:CatalogEntry[]}>("/api/catalog"),api<{listings:Listing[]}>("/api/listings"),api<{notifications:{section:string;count:number;lastId:number}[]}>("/api/notifications"),api<{users:UserAccount[]}>("/api/users"),api<{reports:Report[]}>("/api/reports")]);refreshing=false;
      if(!active || version!==generation.current)return;
      if(results[0].status==="fulfilled"){setConversations(results[0].value.conversations);setMessagesError("");}else setMessagesError("No se pudieron cargar los mensajes. Se volverá a intentar.");
      if(results[1].status==="fulfilled"){setEntries(results[1].value.entries);setCatalogError("");}else setCatalogError("No se pudo cargar el catálogo institucional. Se volverá a intentar.");
      if(results[2].status==='fulfilled')setListings(results[2].value.listings);else setCatalogError('Sin conexión con las publicaciones. Se volverá a intentar automáticamente.');
      if(results[3].status==='fulfilled')setNotifications(results[3].value.notifications);
      if(results[4].status==='fulfilled')setUsers(results[4].value.users);
      if(results[5].status==='fulfilled')setReports(results[5].value.reports);
    }
    void refresh();const timer=window.setInterval(refresh,2000);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);
    return ()=>{active=false;window.clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("online",refresh);};
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
    const timer = window.setInterval(refresh, 2000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [currentUser?.id, currentUser?.role]);

  const stats = useMemo(() => ({
    available: listings.filter((item) => item.status === "Disponible" && !item.hidden).length,
    activeLoans: loans.filter((loan) => !(loan.ownerConfirmed && loan.borrowerConfirmed)).length,
    openReports: reports.filter((report) => !report.resolved).length,
  }), [listings, loans, reports]);

  async function addListing(listing: Omit<Listing, "id" | "owner" | "mine" | "accent" | "icon">) {
    if(!currentUser)throw Error('Inicia sesión para publicar.');
    generation.current++;const actor=actorRef.current;
    if(listing.mode==='Donación') {await api('/api/donations/public',{method:'POST',body:JSON.stringify(listing)});return;}
    const result=await api<{listings:Listing[]}>('/api/listings',{method:'POST',body:JSON.stringify(listing)});
    generation.current++;if(actorRef.current===actor)setListings(result.listings);
  }
  async function changeListing(body:object) {
    generation.current++;const actor=actorRef.current;
    const result=await api<{listings:Listing[]}>('/api/listings',{method:'PATCH',body:JSON.stringify(body)});
    generation.current++;if(actorRef.current===actor)setListings(result.listings);
  }
  async function updateStatus(id:number,status:Listing['status']) {await changeListing({id,action:'status',status});}
  async function requestLoan(id:number){await changeListing({id,action:'request'});}
  async function lend(id:number,recipientId:number){await changeListing({id,action:'lend',recipientId});}
  async function markRead(id:number,lastId:number){generation.current++;const actor=actorRef.current;const result=await api<{conversations:Conversation[]}>('/api/messages',{method:'PATCH',body:JSON.stringify({id,lastId,action:'read'})});generation.current++;if(actor===actorRef.current)setConversations(result.conversations);}
  async function readSection(section:string,lastId:number){generation.current++;const actor=actorRef.current;const result=await api<{notifications:{section:string;count:number;lastId:number}[]}>('/api/notifications',{method:'PATCH',body:JSON.stringify({section,lastId})});generation.current++;if(actor===actorRef.current)setNotifications(result.notifications);}
  async function reportListing(item:Listing){const result=await api<{created:boolean;reports:Report[]}>('/api/reports',{method:'POST',body:JSON.stringify({id:item.id})});setReports(result.reports);return result.created;}
  async function confirmLoan(id: number) {
    const snapshot = await api<LoanSnapshot>("/api/loans", { method: "PATCH", body: JSON.stringify({ id }) });
    setLoans(snapshot.loans); setLoanStates(snapshot.listingStates);
    return snapshot.loans.find((loan) => loan.id === id)?.ownerConfirmed ?? false;
  }
  async function signOut() { await api("/api/session", { method: "DELETE" }); }
  async function resolveReport(id:number,action:string,adminPassword:string){const result=await api<{reports:Report[]}>('/api/reports',{method:'PATCH',body:JSON.stringify({id,action,adminPassword})});setReports(result.reports);}
  async function sendMessage(id:number,text:string) { const actor=actorRef.current; const result=await api<{conversations:Conversation[]}>("/api/messages",{method:"PATCH",body:JSON.stringify({id,text})});if(actorRef.current===actor)setConversations(result.conversations); }
  async function startChat(recipientId:number) { const actor=actorRef.current; const result=await api<{id:number;conversations:Conversation[]}>("/api/messages",{method:"POST",body:JSON.stringify({recipientId})});if(actorRef.current===actor)setConversations(result.conversations);if(actorRef.current!==actor)throw new Error("La sesión cambió.");return result.id; }
  async function searchPeople(query:string) {return (await api<{people:{id:number;name:string;email:string}[]}>(`/api/people?q=${encodeURIComponent(query)}`)).people;}
  async function saveCatalog(input:import("@/lib/catalog-db").CatalogChange,adminPassword:string) {const result=await api<{entries:CatalogEntry[]}>("/api/catalog",{method:"POST",body:JSON.stringify({...input,adminPassword})});setEntries(result.entries);const refreshed=await api<{users:UserAccount[]}>("/api/users");setUsers(refreshed.users);}
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

  return { notifications, markRead, readSection, requestLoan, lend, entries, catalogError, messagesError, searchPeople, startChat, saveCatalog, verifyAdmin, listings, loans, reports, conversations, users, hydrated: localReady, loansLoading, loansError, loanStates, signOut, stats, addListing, updateStatus, reportListing, confirmLoan, resolveReport, sendMessage, authenticate, addUser, updateUser, toggleUser, deleteUser };
}
