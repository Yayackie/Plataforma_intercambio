import type { ActivityEvent } from "./activity-types";
const key=(userId:number)=>`campus-loop-activity-${userId}`;
export function readLocalActivity(userId:number):ActivityEvent[]{
  try{const rows=JSON.parse(localStorage.getItem(key(userId))||'[]');return Array.isArray(rows)?rows.filter(r=>r&&typeof r.id==='string'&&typeof r.occurredAt==='string'):[];}catch{return [];}
}
export function recordLocalActivity(userId:number,category:string,title:string,detail:string){
  const event:ActivityEvent={id:`local-${crypto.randomUUID()}`,category,title,detail,occurredAt:new Date().toISOString(),source:'local'};
  localStorage.setItem(key(userId),JSON.stringify([event,...readLocalActivity(userId)]));
  window.dispatchEvent(new Event('campus-activity'));
}
