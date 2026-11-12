'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowUpRight, Check, ChevronDown, CircleHelp,
  Clapperboard, Copy, CreditCard, Download, Film, Image as ImageIcon, Images,
  LoaderCircle, LockKeyhole, LogIn, Menu, MessageSquareText, MoreHorizontal, Play,
  Plus, Search, Settings, Sparkles, WandSparkles, X, Zap,
} from 'lucide-react';

type Creation = { id: string; type: 'image' | 'video'; url: string; prompt: string; createdAt: number; model: string };
type Tab = 'image' | 'video';
const STORAGE_KEY = 'nexgen-studio-v1';
const starterIdeas = ['A tiny astronaut exploring a bioluminescent forest', 'Cinematic product shot of a glass perfume bottle', 'A dreamy coastal town floating above the clouds'];

function Button({ children, onClick, className = '', disabled = false, variant = 'primary', type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean; variant?: 'primary' | 'secondary' | 'ghost'; type?: 'button' | 'submit';
}) {
  const variants = { primary: 'bg-violet-500 text-white hover:bg-violet-400 shadow-lg shadow-violet-950/30', secondary: 'border border-white/10 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]', ghost: 'text-zinc-400 hover:bg-white/[0.06] hover:text-white' };
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}>{children}</button>;
}

export default function Studio() {
  const [tab, setTab] = useState<Tab>('image');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [model, setModel] = useState('flux-pro');
  const [ratio, setRatio] = useState('1:1');
  const [style, setStyle] = useState('none');
  const [duration, setDuration] = useState(5);
  const [motion, setMotion] = useState(50);
  const [videoMode, setVideoMode] = useState<'text' | 'image'>('text');
  const [imageUrl, setImageUrl] = useState('');
  const [credits, setCredits] = useState(50);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [activeNav, setActiveNav] = useState('Create');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [enhancing, setEnhancing] = useState(false);
  const [preview, setPreview] = useState<Creation | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setCredits(typeof data.credits === 'number' ? data.credits : 50);
        setCreations(Array.isArray(data.creations) ? data.creations : []);
      }
    } catch { /* start with the demo profile */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ credits, creations })); } catch { /* storage may be unavailable */ }
  }, [credits, creations]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 2800);
    return () => clearTimeout(timer);
  }, [notice]);

  const filteredCreations = useMemo(() => creations.filter((item) => item.prompt.toLowerCase().includes(search.toLowerCase())), [creations, search]);
  const modelOptions = tab === 'image'
    ? [{ value: 'flux-pro', label: 'Flux.1 Pro', detail: 'High detail' }, { value: 'flux-schnell', label: 'Flux Schnell', detail: 'Fast' }]
    : [{ value: 'kling', label: 'Kling Video', detail: 'Cinematic' }, { value: 'hailuo', label: 'Minimax Hailuo', detail: 'Expressive' }];

  function switchTab(next: Tab) {
    setTab(next); setModel(next === 'image' ? 'flux-pro' : 'kling'); setError(''); setActiveNav('Create');
  }

  async function enhancePrompt() {
    if (!prompt.trim()) { setPrompt('A lone traveler standing at the edge of a vast alien landscape'); return; }
    setEnhancing(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const ending = tab === 'image'
      ? 'cinematic composition, rich atmospheric lighting, intricate textures, carefully balanced color palette, fine detail, professional art direction'
      : 'slow cinematic camera movement, atmospheric lighting, natural motion, strong composition, rich details, polished film color grade';
    setPrompt(`${prompt.trim().replace(/[.!?]+$/, '')}, ${ending}`);
    setEnhancing(false);
  }

  async function pollResult(endpoint: string, requestId: string, selectedModel: string, type: Tab) {
    const maxAttempts = 180;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2200));
      const current = Math.min(93, Math.round(12 + (attempt / maxAttempts) * 81));
      setProgress(current);
      setStatusText(attempt < 3 ? 'Warming up your model…' : attempt < 18 ? 'Creating your masterpiece…' : 'Adding the finishing touches…');
      const response = await fetch(`${endpoint}?requestId=${encodeURIComponent(requestId)}&model=${encodeURIComponent(selectedModel)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not check generation status.');
      if (payload.status === 'COMPLETED') {
        const data = payload.result ?? {};
        const url = type === 'image' ? data.images?.[0]?.url : data.video?.url;
        if (!url) throw new Error('Generation completed, but the result URL was missing.');
        setProgress(100); setStatusText('Ready');
        return url as string;
      }
      if (payload.status === 'FAILED') throw new Error('The generation failed. Please try again with a different prompt.');
    }
    throw new Error('This generation is taking longer than expected. Check your Fal.ai queue and try again.');
  }

  async function generate() {
    if (!prompt.trim()) { setError('Add a prompt to get started.'); return; }
    const cost = tab === 'image' ? 2 : 10;
    if (credits < cost) { setError(`You need ${cost} credits for this generation. Top up your credits to continue.`); return; }
    if (tab === 'video' && videoMode === 'image' && !imageUrl.trim()) { setError('Add a starting image URL for image-to-video.'); return; }
    setError(''); setLoading(true); setProgress(4); setStatusText('Sending your prompt to the studio…');
    const endpoint = tab === 'image' ? '/api/generate-image' : '/api/generate-video';
    const selectedModel = model;
    const body = tab === 'image'
      ? { prompt, negativePrompt, aspectRatio: ratio, model, style }
      : { prompt, model, duration, aspectRatio: ratio, imageUrl: videoMode === 'image' ? imageUrl : undefined, motion };
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not start generation.');
      const url = await pollResult(endpoint, payload.requestId, selectedModel, tab);
      const item: Creation = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: tab, url, prompt, createdAt: Date.now(), model: modelOptions.find((option) => option.value === selectedModel)?.label ?? selectedModel };
      setCreations((current) => [item, ...current]);
      setCredits((current) => current - cost);
      setNotice(`${tab === 'image' ? 'Image' : 'Video'} created · ${cost} credits used`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally { setLoading(false); setTimeout(() => { setProgress(0); setStatusText(''); }, 500); }
  }

  async function copyPrompt(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice('Prompt copied to clipboard'); }
    catch { setNotice('Could not access clipboard'); }
  }

  async function download(item: Creation) {
    try {
      const response = await fetch(item.url);
      if (!response.ok) throw new Error('Download unavailable');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = objectUrl; link.download = `nexgen-${item.type}-${item.id}.${item.type === 'image' ? 'png' : 'mp4'}`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(objectUrl);
      setNotice('Download started');
    } catch { window.open(item.url, '_blank', 'noopener,noreferrer'); }
  }

  function handleFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose an image file to use as your video starting frame.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Choose an image smaller than 10 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setImageUrl(reader.result); };
    reader.readAsDataURL(file);
  }

  const sidebar = <aside className={`${menuOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-white/[0.07] bg-[#0c0c11] px-4 py-5 transition-transform md:static md:translate-x-0`}>
    <div className="mb-10 flex items-center justify-between px-2"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600"><Sparkles size={19} className="text-white" /></div><div><div className="font-bold tracking-tight">nexgen<span className="text-violet-400">.</span></div><div className="text-[10px] text-zinc-500">CREATIVE STUDIO</div></div></div><button className="text-zinc-500 md:hidden" onClick={() => setMenuOpen(false)}><X size={18}/></button></div>
    <div className="px-2 text-[10px] font-bold uppercase tracking-[.18em] text-zinc-600">Workspace</div>
    <nav className="mt-3 space-y-1">{[{ name: 'Create', icon: WandSparkles }, { name: 'My Gallery', icon: Images }, { name: 'Pricing / Credits', icon: CreditCard }, { name: 'Settings', icon: Settings }].map(({ name, icon: Icon }) => <button key={name} onClick={() => { setActiveNav(name); setMenuOpen(false); if (name === 'Pricing / Credits') setNotice('Your demo plan starts with 50 free credits.'); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${activeNav === name ? 'bg-violet-500/10 font-medium text-violet-300' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'}`}><Icon size={17}/>{name}{name === 'My Gallery' && creations.length > 0 && <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{creations.length}</span>}</button>)}</nav>
    <div className="mt-auto rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.13] to-indigo-500/[0.04] p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold">Free plan</span><Zap size={15} className="text-violet-300"/></div><div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.min(100, credits / 50 * 100)}%` }}/></div><div className="flex justify-between text-[11px] text-zinc-500"><span>{credits} credits left</span><span>50 total</span></div><button onClick={() => { setActiveNav('Pricing / Credits'); setNotice('Credit purchases are coming soon.'); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.06]">Explore plans <ArrowUpRight size={13}/></button></div>
    <div className="mt-4 flex items-center gap-3 border-t border-white/[0.07] px-2 pt-4"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-rose-400 text-xs font-bold text-black">N</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">New Creator</div><div className="text-[10px] text-zinc-500">Demo account</div></div><MoreHorizontal size={17} className="text-zinc-500"/></div>
  </aside>;

  return <div className="min-h-screen bg-[#09090d] text-zinc-100">
    {sidebar}{menuOpen && <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden"/>}
    <div className="md:pl-0"><header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-white/[0.07] bg-[#09090d]/90 px-4 backdrop-blur-xl md:px-8"><div className="flex items-center gap-3"><button className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 md:hidden" onClick={() => setMenuOpen(true)}><Menu size={19}/></button><span className="text-sm text-zinc-500">Studio</span><span className="text-zinc-700">/</span><span className="text-sm font-medium">{activeNav === 'Create' ? 'Create' : activeNav}</span></div><div className="flex items-center gap-2"><button onClick={() => setNotice('Your demo profile is stored in this browser only.')} className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 sm:flex"><CircleHelp size={14}/> Help</button><div className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-3 py-2"><Zap size={14} className="text-violet-300"/><span className="text-xs font-semibold">{credits}</span><span className="hidden text-xs text-zinc-400 sm:inline">credits</span></div><button aria-label="Account" className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-rose-400 text-xs font-bold text-black">N</button></div></header>
      <main className="mx-auto max-w-[1440px] px-4 py-7 md:px-8 md:py-9"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-300"><Sparkles size={12}/> The creative space</div><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Make something <span className="text-zinc-500">extraordinary.</span></h1><p className="mt-2 text-sm text-zinc-500">Turn your imagination into images and motion.</p></div><div className="flex items-center gap-2 text-xs text-zinc-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> All systems operational</div></div>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(500px,1.05fr)_minmax(430px,.95fr)]">
          <section className="rounded-2xl border border-white/[0.08] bg-[#101015] p-4 shadow-2xl shadow-black/20 md:p-5"><div className="mb-5 flex rounded-xl border border-white/[0.06] bg-black/20 p-1"><button onClick={() => switchTab('image')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'image' ? 'bg-white/[0.09] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><ImageIcon size={16}/> Image</button><button onClick={() => switchTab('video')} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${tab === 'video' ? 'bg-white/[0.09] text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}><Film size={16}/> Video</button></div>
            {tab === 'video' && <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-white/[0.06] bg-black/20 p-1"><button onClick={() => setVideoMode('text')} className={`rounded-lg py-2 text-xs font-medium ${videoMode === 'text' ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-500'}`}>Text to Video</button><button onClick={() => setVideoMode('image')} className={`rounded-lg py-2 text-xs font-medium ${videoMode === 'image' ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-500'}`}>Image to Video</button></div>}
            {tab === 'video' && videoMode === 'image' && <div className="mb-4 flex gap-2"><input value={imageUrl.startsWith('data:') ? '' : imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Paste a secure image URL…" className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-xs outline-none placeholder:text-zinc-600 focus:border-violet-400/50"/><Button variant="secondary" className="shrink-0 px-3 py-2 text-xs" onClick={() => fileInput.current?.click()}><Plus size={14}/> Upload</Button><input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])}/></div>}
            {tab === 'video' && videoMode === 'image' && imageUrl.startsWith('data:') && <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 p-2"><img src={imageUrl} alt="Video starting frame" className="h-14 w-20 rounded-lg object-cover"/><span className="text-xs text-zinc-400">Starting frame ready</span><button onClick={() => setImageUrl('')} className="ml-auto text-zinc-500"><X size={15}/></button></div>}
            <div className="mb-2 flex items-center justify-between"><label htmlFor="prompt" className="text-sm font-semibold">Your prompt</label><span className="text-[11px] text-zinc-600">{prompt.length}/2000</span></div><textarea id="prompt" value={prompt} maxLength={2000} onChange={(event) => setPrompt(event.target.value)} placeholder={tab === 'image' ? 'Describe the image you want to create…' : 'Describe the video you imagine…'} className="min-h-[132px] w-full resize-y rounded-xl border border-white/[0.08] bg-black/20 p-3.5 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-violet-400/50"/>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><button onClick={enhancePrompt} disabled={enhancing} className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300 transition hover:text-violet-200 disabled:opacity-50"><WandSparkles size={14}/>{enhancing ? 'Enhancing…' : 'Magic Prompt ✨'}</button><span className="text-[10px] text-zinc-600">{tab === 'image' ? 'Tip: Include lighting, mood and composition' : 'Tip: Describe the camera movement too'}</span></div>
            {tab === 'image' && <details className="group mt-4 rounded-xl border border-white/[0.07] bg-black/10"><summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-xs font-medium text-zinc-400">Negative prompt <ChevronDown size={14} className="transition group-open:rotate-180"/></summary><textarea value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} placeholder="What should the model avoid?" className="min-h-[72px] w-full resize-y border-t border-white/[0.06] bg-transparent p-3.5 text-xs outline-none placeholder:text-zinc-600"/></details>}
            <div className="my-5 h-px bg-white/[0.07]"/><div className="mb-4 flex items-center justify-between"><div className="text-sm font-semibold">Fine-tune</div><button onClick={() => { setPrompt(''); setNegativePrompt(''); setStyle('none'); setError(''); }} className="text-xs text-zinc-600 hover:text-zinc-300">Reset</button></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="mb-2 block text-[11px] font-medium text-zinc-500">MODEL</label><div className="relative"><select value={model} onChange={(event) => setModel(event.target.value)} className="w-full appearance-none rounded-xl border border-white/[0.08] bg-[#15151c] px-3 py-2.5 pr-8 text-xs text-zinc-200 outline-none focus:border-violet-400/50">{modelOptions.map((option) => <option value={option.value} key={option.value}>{option.label} · {option.detail}</option>)}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-zinc-500"/></div></div><div><label className="mb-2 block text-[11px] font-medium text-zinc-500">ASPECT RATIO</label><div className="grid grid-cols-4 gap-1">{['1:1', '16:9', '9:16', '4:5'].map((value) => <button key={value} onClick={() => setRatio(value)} className={`rounded-lg border py-2 text-[10px] transition ${ratio === value ? 'border-violet-400/50 bg-violet-400/10 text-violet-200' : 'border-white/[0.07] text-zinc-500 hover:border-white/20'}`}>{value}</button>)}</div></div></div>
            {tab === 'image' ? <div className="mt-4"><label className="mb-2 block text-[11px] font-medium text-zinc-500">STYLE PRESET</label><div className="flex flex-wrap gap-2">{['none', 'Cinematic', 'Analog film', 'Anime', 'Editorial', '3D render'].map((value) => <button key={value} onClick={() => setStyle(value)} className={`rounded-full border px-3 py-1.5 text-[10px] transition ${style === value ? 'border-violet-400/40 bg-violet-400/10 text-violet-200' : 'border-white/[0.08] text-zinc-500 hover:border-white/20'}`}>{value === 'none' ? 'No style' : value}</button>)}</div></div> : <div className="mt-4 grid grid-cols-2 gap-3"><div><label className="mb-2 block text-[11px] font-medium text-zinc-500">DURATION</label><div className="grid grid-cols-2 gap-1">{[5, 10].map((value) => <button key={value} onClick={() => setDuration(value)} className={`rounded-lg border py-2 text-xs ${duration === value ? 'border-violet-400/50 bg-violet-400/10 text-violet-200' : 'border-white/[0.07] text-zinc-500'}`}>{value}s</button>)}</div></div><div><label className="mb-2 flex justify-between text-[11px] font-medium text-zinc-500"><span>MOTION</span><span>{motion}%</span></label><input type="range" min="0" max="100" value={motion} onChange={(event) => setMotion(Number(event.target.value))} className="mt-2 w-full accent-violet-400"/></div></div>}
            {error && <div role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-3 text-xs leading-5 text-red-300">{error}</div>}
            {loading && <div className="mt-5 rounded-xl border border-white/[0.08] bg-black/20 p-3.5"><div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-zinc-300"><LoaderCircle size={14} className="animate-spin text-violet-300"/>{statusText}</span><span className="text-violet-300">{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-700" style={{ width: `${progress}%` }}/></div></div>}
            <div className="mt-5"><Button onClick={generate} disabled={loading || !prompt.trim()} className="w-full py-3"><Sparkles size={16}/>{loading ? 'Creating…' : `Generate ${tab === 'image' ? 'image' : 'video'}`}<span className="ml-auto rounded-lg bg-white/15 px-2 py-1 text-[10px]">−{tab === 'image' ? 2 : 10} credits</span></Button><div className="mt-2 text-center text-[10px] text-zinc-600">Your creation will appear in My Creations</div></div>
          </section>
          <section className="min-w-0"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold">My Creations</h2><p className="mt-1 text-xs text-zinc-500">Your latest AI-generated assets</p></div><div className="flex items-center gap-2"><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-zinc-600"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search…" className="w-36 rounded-lg border border-white/[0.08] bg-white/[0.03] py-2 pl-8 pr-3 text-xs outline-none focus:border-white/20 sm:w-44"/></div><Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => setActiveNav('My Gallery')}><Images size={14}/><span className="hidden sm:inline">Gallery</span></Button></div></div>
            {filteredCreations.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3">{filteredCreations.map((item) => <article key={item.id} className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101015]"><button onClick={() => setPreview(item)} className="relative block aspect-square w-full overflow-hidden bg-[#17171e] text-left">{item.type === 'image' ? <img src={item.url} alt={item.prompt} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"/> : <><video src={item.url} className="h-full w-full object-cover" muted playsInline/><span className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="rounded-full bg-black/55 p-3 backdrop-blur"><Play size={18} fill="white"/></span></span></>}<span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[9px] uppercase tracking-wider text-white backdrop-blur">{item.type}</span><span className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100"><span onClick={(event) => { event.stopPropagation(); void download(item); }} className="rounded-lg bg-black/65 p-2 text-white backdrop-blur hover:bg-violet-500"><Download size={14}/></span></span></button><div className="p-3"><p className="line-clamp-2 min-h-9 text-[11px] leading-4 text-zinc-300">{item.prompt}</p><div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5"><span className="truncate text-[10px] text-zinc-600">{item.model}</span><div className="flex gap-1"><button aria-label="Copy prompt" onClick={() => void copyPrompt(item.prompt)} className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"><Copy size={13}/></button><button aria-label="Download" onClick={() => void download(item)} className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"><ArrowDownToLine size={14}/></button></div></div></div></article>)}</div> : <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-[#101015]/60 px-6 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]"><Images size={22} className="text-zinc-500"/></div><h3 className="text-sm font-semibold">{search ? 'No matching creations' : 'Your canvas is wide open'}</h3><p className="mt-2 max-w-[270px] text-xs leading-5 text-zinc-500">{search ? 'Try another search term.' : 'Create your first image or video and it will show up here.'}</p>{!search && <div className="mt-6 w-full max-w-sm text-left"><div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Need a spark?</div>{starterIdeas.map((idea) => <button key={idea} onClick={() => { setPrompt(idea); setTab('image'); }} className="mb-1.5 block w-full truncate rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left text-[11px] text-zinc-400 hover:border-violet-400/30 hover:text-zinc-200">{idea}</button>)}</div>}</div>}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-[10px] text-zinc-600"><span className="flex items-center gap-2"><LockKeyhole size={12}/> Creations saved in this browser</span><span>{creations.length} total</span></div>
          </section>
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 text-[10px] text-zinc-600"><span>© 2025 NexGen Studio · Create beyond the ordinary</span><div className="flex gap-4"><button onClick={() => setNotice('Privacy information coming soon.')} className="hover:text-zinc-400">Privacy</button><button onClick={() => setNotice('Terms information coming soon.')} className="hover:text-zinc-400">Terms</button><button onClick={() => setNotice('Support: hello@nexgen.studio')} className="hover:text-zinc-400">Support</button></div></footer>
      </main>
    </div>
    {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#202027] px-4 py-3 text-xs text-zinc-100 shadow-2xl">{notice}</div>}
    {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}><div className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#111116]" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3"><span className="text-xs font-semibold">Creation preview</span><div className="flex gap-2"><Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => void download(preview)}><Download size={14}/> Download</Button><button aria-label="Close preview" onClick={() => setPreview(null)} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5"><X size={16}/></button></div></div><div className="flex max-h-[calc(92vh-60px)] items-center justify-center bg-black p-3">{preview.type === 'image' ? <img src={preview.url} alt={preview.prompt} className="max-h-[78vh] max-w-full object-contain"/> : <video src={preview.url} controls autoPlay className="max-h-[78vh] max-w-full"/>}</div><div className="border-t border-white/[0.08] px-4 py-3 text-xs text-zinc-400">{preview.prompt}</div></div></div>}
  </div>;
}
