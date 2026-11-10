"use client";
import { useEffect,useRef,useState } from "react";
import { Volume2,VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
export function NotificationSound({userId,count}:{userId:number;count:number}) {
  const [enabled,setEnabled]=useState(false);
  const audio=useRef<AudioContext|null>(null),previous=useRef<number|null>(null);
  useEffect(()=>{previous.current=null;setEnabled(false);},[userId]);
  useEffect(()=>{if(previous.current!==null&&count>previous.current&&enabled&&audio.current?.state==='running'){
    const context=audio.current;
    // A soft two-note bell, with a quiet overtone and a long, natural decay.
    for(const [offset,frequency] of [[0,783.99],[0.22,1046.5]]) {
      for(const [multiple,volume] of [[1,0.045],[2,0.009]]) {
        const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+offset;
        oscillator.type='sine';oscillator.frequency.value=frequency*multiple;
        gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+0.015);gain.gain.exponentialRampToValueAtTime(0.0001,start+1.25);
        oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+1.3);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
    }
  }previous.current=count;},[count,enabled]);
  useEffect(()=>()=>{void audio.current?.close();},[]);
  return <Button variant="ghost" size="icon" className="sound-toggle" aria-label={enabled?"Silenciar notificaciones":"Activar sonido de notificaciones"} title={enabled?"Sonido activado":"Sonido desactivado"} aria-pressed={enabled} onClick={async()=>{try{if(!enabled){audio.current??=new AudioContext();await audio.current.resume();}setEnabled(!enabled);}catch{setEnabled(false);}}}>{enabled?<Volume2 aria-hidden="true"/>:<VolumeX aria-hidden="true"/>}</Button>;
}
