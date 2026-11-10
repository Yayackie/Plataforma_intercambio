"use client";
import { useEffect,useRef,useState } from "react";
import { Button } from "@/components/ui/button";
export function NotificationSound({userId,count}:{userId:number;count:number}) {
  const [enabled,setEnabled]=useState(false);
  const audio=useRef<AudioContext|null>(null),previous=useRef<number|null>(null);
  useEffect(()=>{previous.current=null;setEnabled(false);},[userId]);
  useEffect(()=>{if(previous.current!==null&&count>previous.current&&enabled&&audio.current?.state==='running'){
    const context=audio.current,oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type='sine';oscillator.frequency.setValueAtTime(660,context.currentTime);
    gain.gain.setValueAtTime(0,context.currentTime);gain.gain.linearRampToValueAtTime(0.055,context.currentTime+0.03);gain.gain.exponentialRampToValueAtTime(0.001,context.currentTime+0.3);
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+0.32);
  }previous.current=count;},[count,enabled]);
  useEffect(()=>()=>{void audio.current?.close();},[]);
  return <Button variant="ghost" size="sm" aria-pressed={enabled} onClick={async()=>{try{if(!enabled){audio.current??=new AudioContext();await audio.current.resume();}setEnabled(!enabled);}catch{setEnabled(false);}}}>{enabled?'Sonido activado':'Activar sonido'}</Button>;
}
