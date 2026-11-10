"use client";
import { useEffect,useState } from "react";
import { useTheme } from "next-themes";
import { Moon,Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
export function ThemeSwitch(){
  const {theme,setTheme}=useTheme();const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  const dark=ready&&theme==='dark';
  return <div className="theme-setting"><div>{dark?<Moon aria-hidden="true"/>:<Sun aria-hidden="true"/>}<label htmlFor="night-mode">{dark?'Modo nocturno':'Modo claro'}</label></div><Switch id="night-mode" aria-label="Modo nocturno" checked={dark} disabled={!ready} onCheckedChange={value=>setTheme(value?'dark':'light')}/></div>;
}
