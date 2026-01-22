
import React from 'react';
import { ShieldCheck, FileText, Lock, Layers, Check, X, AlertTriangle } from 'lucide-react';

interface InfoLayoutProps {
  title: string;
  icon: any;
  children: React.ReactNode;
}

const InfoLayout: React.FC<InfoLayoutProps> = ({ title, icon: Icon, children }) => (
  <div className="min-h-screen bg-primary pb-20 animate-in fade-in duration-500 font-comfortaa">
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-8">
        <div className="w-16 h-16 bg-white/5 border border-white/10 flex items-center justify-center rounded-full">
          <Icon className="w-8 h-8 text-brand" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">{title}</h1>
          <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Official VidFree Policy</p>
        </div>
      </div>
      
      <div className="space-y-8 text-zinc-300 leading-loose font-medium">
        {children}
      </div>
    </div>
  </div>
);

export const RatingsPage: React.FC = () => (
  <InfoLayout title="Rating System" icon={ShieldCheck}>
    <section className="space-y-4">
      <h3 className="text-xl font-black text-white uppercase tracking-tight">How It Works</h3>
      <p>
        At VidFree, we want everyone to feel safe and comfortable while enjoying content. Our rating system helps users understand what kind of content they’re about to watch, and ensures that age-appropriate content is shown to the right audience.
      </p>
    </section>

    <section className="space-y-6">
      <h3 className="text-xl font-black text-white uppercase tracking-tight">What the Ratings Mean</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse border border-white/10 text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="p-4 border border-white/10 font-black uppercase text-white">Rating</th>
              <th className="p-4 border border-white/10 font-black uppercase text-white">What It Means</th>
              <th className="p-4 border border-white/10 font-black uppercase text-white">Examples</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-4 border border-white/10 font-bold text-emerald-500">G (General)</td>
              <td className="p-4 border border-white/10">Suitable for all ages</td>
              <td className="p-4 border border-white/10">Everyday life, light comedy, non-threatening scenes</td>
            </tr>
            <tr>
              <td className="p-4 border border-white/10 font-bold text-amber-500">PG (Parental Guidance)</td>
              <td className="p-4 border border-white/10">May include mild themes</td>
              <td className="p-4 border border-white/10">Mild stunts, casual drinking, non-graphic injury</td>
            </tr>
            <tr>
              <td className="p-4 border border-white/10 font-bold text-rose-500">Restricted</td>
              <td className="p-4 border border-white/10">Not suitable for younger audiences</td>
              <td className="p-4 border border-white/10">Risky stunts, strong language, intense scenes</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4 bg-amber-500/5 p-6 border border-amber-500/20">
        <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <Check className="w-4 h-4" /> PG Examples
        </h4>
        <ul className="space-y-2 text-sm list-disc pl-4 marker:text-amber-500">
          <li>Standard parkour (jumping, running, basic flips)</li>
          <li>Mild comedy or slapstick</li>
          <li>Soft drinking (a glass of wine, casual social drinking)</li>
          <li>Casual "bumps" or mild suggestive content</li>
        </ul>
      </div>

      <div className="space-y-4 bg-rose-500/5 p-6 border border-rose-500/20">
        <h4 className="text-sm font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Restricted Examples
        </h4>
        <ul className="space-y-2 text-sm list-disc pl-4 marker:text-rose-500">
          <li>Parkour involving climbing buildings, rooftops, towers (dangerous stunts)</li>
          <li>Dangerous acts or high-risk behaviour</li>
          <li>Front nudity or explicit exposure</li>
          <li>Explicit drinking, drunken behaviour, vomiting</li>
        </ul>
      </div>
    </section>

    <section className="bg-white/5 p-6 border-l-2 border-brand">
      <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">How Ratings Are Applied</h3>
      <p className="text-sm">
        Creators must rate their own content honestly during upload. If a video is reported or reviewed and found to be mis-rated, the creator may face penalties or removal.
      </p>
    </section>
  </InfoLayout>
);

export const TermsPage: React.FC = () => (
  <InfoLayout title="Terms of Service" icon={FileText}>
    <section className="space-y-4">
      <p>
        Welcome to VidFree! By using VidFree, you agree to follow these simple rules designed to keep the platform safe, fun, and fair for everyone.
      </p>
    </section>

    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h3 className="text-lg font-black text-emerald-500 uppercase tracking-tight flex items-center gap-2">
          <Check className="w-5 h-5" /> What’s Allowed
        </h3>
        <ul className="space-y-3">
          {['Original human-made content', 'Creative expression', 'Safe entertainment, lifestyle, music, comedy, art, etc.', 'AI tools are allowed only for editing or production, not for creating the main content'].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm items-start">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black text-rose-500 uppercase tracking-tight flex items-center gap-2">
          <X className="w-5 h-5" /> What’s NOT Allowed
        </h3>
        <ul className="space-y-3">
          {['AI-generated videos (full AI content is banned)', 'Political channels', 'Conspiracy channels', 'Any content that encourages harm or illegal activity'].map((item, i) => (
            <li key={i} className="flex gap-3 text-sm items-start">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mt-2 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>

    <section className="space-y-4 pt-4 border-t border-white/5">
      <h3 className="text-xl font-black text-white uppercase tracking-tight">Series Rules</h3>
      <p className="text-sm">
        VidFree allows creators to upload series, but they must be used correctly (see our Series page for full details). Abuse of series for promotion or view farming may result in account suspension.
      </p>
    </section>

    <section className="bg-white/5 p-6 border border-white/10">
      <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4">Account Safety</h3>
      <p className="text-sm mb-4">VidFree reserves the right to:</p>
      <div className="flex gap-4 flex-wrap">
        {['Remove content', 'Restrict access', 'Permanently ban accounts'].map(action => (
          <span key={action} className="bg-black border border-white/10 px-3 py-1 text-xs font-bold uppercase text-zinc-400">
            {action}
          </span>
        ))}
      </div>
    </section>
  </InfoLayout>
);

export const PrivacyPage: React.FC = () => (
  <InfoLayout title="Privacy Policy" icon={Lock}>
    <section className="space-y-4">
      <p>
        Your privacy matters. VidFree collects only what is necessary to provide a safe and enjoyable platform. This policy is simple and clear because transparency is key.
      </p>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="p-6 bg-white/5 border border-white/10 space-y-4">
        <h3 className="text-sm font-black text-brand uppercase tracking-widest">What We Collect</h3>
        <ul className="text-sm space-y-2 list-disc pl-4 text-zinc-400">
          <li>Basic account information (username, email)</li>
          <li>Usage data (videos watched, likes, comments)</li>
          <li>Device information (for security and performance)</li>
        </ul>
      </div>

      <div className="p-6 bg-white/5 border border-white/10 space-y-4">
        <h3 className="text-sm font-black text-brand uppercase tracking-widest">What We Do With It</h3>
        <ul className="text-sm space-y-2 list-disc pl-4 text-zinc-400">
          <li>Keep your account secure</li>
          <li>Improve VidFree’s performance</li>
          <li>Show you relevant content</li>
        </ul>
      </div>

      <div className="p-6 bg-white/5 border border-white/10 space-y-4">
        <h3 className="text-sm font-black text-brand uppercase tracking-widest">We Do NOT Share</h3>
        <ul className="text-sm space-y-2 list-disc pl-4 text-zinc-400">
          <li>We do not sell your data to third parties</li>
          <li>We do not share personal information without consent</li>
        </ul>
      </div>
    </div>

    <section className="pt-8 border-t border-white/5 space-y-4">
      <h3 className="text-xl font-black text-white uppercase tracking-tight">Your Rights</h3>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <Check className="w-4 h-4 text-emerald-500" /> You can request deletion of your account
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <Check className="w-4 h-4 text-emerald-500" /> You can request data removal at any time
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <Check className="w-4 h-4 text-emerald-500" /> You can control your privacy settings
        </div>
      </div>
    </section>
  </InfoLayout>
);

export const SeriesPolicyPage: React.FC = () => (
  <InfoLayout title="Series Policy" icon={Layers}>
    <section className="space-y-4">
      <p>
        A Series is a collection of connected episodes that tell a story, follow a theme, or have a planned structure. We want Series to be meaningful collections, not just random playlists.
      </p>
    </section>

    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20">
          <h3 className="text-sm font-black text-emerald-500 uppercase tracking-widest mb-4">What Counts as a Series</h3>
          <ul className="space-y-3">
            {['A 10-episode travel series', 'A weekly cooking show with multiple parts', 'A story-based documentary series'].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm items-center">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20">
          <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-4">What DOES NOT Count</h3>
          <ul className="space-y-3">
            {['Uploading daily vlogs and calling them a "series"', 'Posting random videos and labeling them as series to get more views', 'Re-uploading similar content to manipulate engagement'].map((item, i) => (
              <li key={i} className="flex gap-3 text-sm items-center">
                <X className="w-4 h-4 text-rose-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    <section className="space-y-6 pt-6">
      <h3 className="text-xl font-black text-white uppercase tracking-tight">Series Must Be Used Properly</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Planned', 'Themed', 'Connected', 'No "view farming"'].map(req => (
          <div key={req} className="bg-black border border-white/10 p-4 text-center text-xs font-bold uppercase text-zinc-300">
            {req}
          </div>
        ))}
      </div>
    </section>

    <section className="bg-rose-500/5 p-6 border border-rose-500/20 mt-4">
      <h3 className="text-lg font-black text-rose-500 uppercase tracking-tight mb-2 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" /> Abuse of Series
      </h3>
      <p className="text-sm">
        Creators found abusing the series feature may lose access to VidFree or be permanently banned.
      </p>
    </section>
  </InfoLayout>
);
