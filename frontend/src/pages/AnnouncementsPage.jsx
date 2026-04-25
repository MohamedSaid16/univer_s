/*
  AnnouncementsPage — modern SaaS-style announcements UI.
  Backend: /api/v1/annonces (unchanged). YouTube URLs are stored as plain
  text inside `contenu` and extracted on render — see utils/announcementMedia.
*/

import React, { useEffect, useMemo, useState } from 'react';
import request, { resolveMediaUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  resolvePrimaryMedia,
  stripYouTubeUrl,
  extractYouTubeId,
  embedYouTubeInContent,
} from '../utils/announcementMedia';

/* ── Display helpers ──────────────────────────────────────── */

const resolveText = (ar, en, fallback = '') => {
  if (typeof en === 'string' && en.trim()) return en.trim();
  if (typeof ar === 'string' && ar.trim()) return ar.trim();
  return fallback;
};

const getTitle = (item) => resolveText(item?.titre_ar, item?.titre_en, 'Untitled');
const getContent = (item) => resolveText(item?.contenu_ar, item?.contenu_en, '');
const getCategory = (item) => resolveText(item?.type?.nom_ar, item?.type?.nom_en, 'General');
const normalizePriority = (item) =>
  String(item?.priority ?? item?.priorite ?? 'normale').toLowerCase();

const PRIORITY_META = {
  urgente: { label: 'Urgent', badge: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20', dot: 'bg-red-500' },
  urgent: { label: 'Urgent', badge: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20', dot: 'bg-red-500' },
  haute: { label: 'Important', badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20', dot: 'bg-amber-500' },
  high: { label: 'Important', badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20', dot: 'bg-amber-500' },
  normale: { label: 'Normal', badge: 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20', dot: 'bg-slate-400' },
  normal: { label: 'Normal', badge: 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20', dot: 'bg-slate-400' },
  basse: { label: 'Low', badge: 'bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-400/20', dot: 'bg-slate-300' },
  low: { label: 'Low', badge: 'bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-400/20', dot: 'bg-slate-300' },
};

const priorityMeta = (item) => PRIORITY_META[normalizePriority(item)] || PRIORITY_META.normale;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/* ── Media preview (per card) ─────────────────────────────── */

/* ── Card thumbnail — static / non-interactive so clicks reach the card ── */

function CardMedia({ media }) {
  if (!media) return null;

  if (media.kind === 'youtube') {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
        <img src={media.thumbnailUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 shadow-lg">
            <svg className="h-5 w-5 translate-x-0.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (media.kind === 'video') {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/40">
            <svg className="h-6 w-6 translate-x-0.5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <p className="text-xs text-white/60">Click to play</p>
        </div>
      </div>
    );
  }

  if (media.kind === 'image') {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-100">
        <img
          src={media.url}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  // pdf / doc / file — static badge, no link (card handles the click)
  const iconColor =
    media.kind === 'pdf' ? 'text-red-600 bg-red-50'
      : media.kind === 'doc' ? 'text-blue-600 bg-blue-50'
      : 'text-slate-600 bg-slate-100';
  const kindLabel =
    media.kind === 'pdf' ? 'PDF' : media.kind === 'doc' ? 'Word' : 'File';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" strokeLinejoin="round" />
          <path d="M14 3v5h5" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{media.label}</p>
        <p className="text-xs uppercase tracking-wide text-slate-500">{kindLabel} · click to open</p>
      </div>
    </div>
  );
}

/* ── Full media — used inside the detail modal ────────────────── */

function FullMedia({ media }) {
  if (!media) return null;

  if (media.kind === 'youtube') {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
        <iframe
          src={media.embedUrl}
          title="YouTube video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  if (media.kind === 'video') {
    return (
      <div className="overflow-hidden rounded-xl bg-slate-900">
        <video
          src={media.url}
          controls
          preload="metadata"
          className="max-h-[60vh] w-full"
        />
      </div>
    );
  }

  if (media.kind === 'image') {
    return (
      <div className="flex justify-center overflow-hidden rounded-xl bg-slate-100">
        <img
          src={media.url}
          alt=""
          loading="eager"
          className="max-h-[60vh] w-auto max-w-full object-contain"
        />
      </div>
    );
  }

  if (media.kind === 'pdf') {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <iframe
          src={media.url}
          title="PDF document"
          className="h-[62vh] w-full border-0"
        />
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="text-xs text-slate-500">PDF Document</span>
          <a
            href={media.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Download ↓
          </a>
        </div>
      </div>
    );
  }

  // doc / file
  const iconColor = media.kind === 'doc' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 bg-slate-100';
  return (
    <a
      href={media.url}
      download
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:bg-slate-100"
    >
      <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" strokeLinejoin="round" />
          <path d="M14 3v5h5" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{media.label}</p>
        <p className="text-sm text-slate-500">
          {media.kind === 'doc' ? 'Word document' : 'File'} — click to download
        </p>
      </div>
      <span className="flex-shrink-0 text-sm font-medium text-indigo-600">Download ↓</span>
    </a>
  );
}

/* ── Featured hero (large video) ──────────────────────────── */

function FeaturedHero({ item, media, onExpand }) {
  if (!item || !media) return null;
  return (
    <section
      className="mb-10 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      onClick={() => onExpand?.(item)}
    >
      <div className="grid md:grid-cols-5">
        <div className="md:col-span-3">
          {(media.kind === 'youtube' || media.kind === 'video' || media.kind === 'image') && (
            <div className="relative aspect-video w-full bg-slate-900">
              <CardMedia media={media} />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center p-6 md:col-span-2 md:p-8">
          <div className="mb-3 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityMeta(item).badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${priorityMeta(item).dot}`} />
              {priorityMeta(item).label}
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              {getCategory(item)}
            </span>
          </div>
          <h2 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-slate-900 md:text-3xl">
            {getTitle(item)}
          </h2>
          <p className="mb-4 text-sm text-slate-600 line-clamp-4">
            {stripYouTubeUrl(getContent(item))}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {formatDate(item?.datePublication || item?.createdAt)}
            </p>
            <span className="text-xs font-medium text-indigo-600">View full →</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Card ─────────────────────────────────────────────────── */

function AnnouncementCard({ item, isAdmin, onEdit, onDelete, onExpand }) {
  const media = useMemo(() => resolvePrimaryMedia(item, { resolveMediaUrl }), [item]);
  const body = useMemo(() => stripYouTubeUrl(getContent(item)), [item]);
  const meta = priorityMeta(item);

  return (
    <article
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      onClick={() => onExpand?.(item)}
    >
      {media && (
        <div className="p-5 pb-0">
          <CardMedia media={media} />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
            {getCategory(item)}
          </span>
          {isAdmin && (
            <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Edit announcement"
                title="Edit"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete announcement"
                title="Delete"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-slate-900">
          {getTitle(item)}
        </h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
          {body || 'No description provided.'}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>{formatDate(item?.datePublication || item?.createdAt)}</span>
          <span className="font-medium text-indigo-500 group-hover:text-indigo-700">View full →</span>
        </div>
      </div>
    </article>
  );
}

/* ── Skeleton ─────────────────────────────────────────────── */

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 aspect-video w-full animate-pulse rounded-xl bg-slate-200" />
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="mb-2 h-4 w-full animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

/* ── Empty state ──────────────────────────────────────────── */

function EmptyState({ onCreate, canCreate }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
        <svg className="h-7 w-7 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-900">No announcements yet</h3>
      <p className="mb-4 text-sm text-slate-500">
        {canCreate
          ? 'Create your first announcement to share news, events, or important updates.'
          : 'Check back later for news and updates from the administration.'}
      </p>
      {canCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New Announcement
        </button>
      )}
    </div>
  );
}

/* ── Create / Edit Modal ──────────────────────────────────── */

const CATEGORY_OPTIONS = ['Administrative', 'Academic', 'Events', 'Research', 'Student Life'];
const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
];

function AnnouncementModal({ open, initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id);

  const initialYoutubeUrl = useMemo(() => {
    if (!initial) return '';
    const ytId = extractYouTubeId(getContent(initial));
    return ytId ? `https://www.youtube.com/watch?v=${ytId}` : '';
  }, [initial]);

  const [form, setForm] = useState({
    titre: '',
    contenu: '',
    typeAnnonce: 'Administrative',
    priority: 'normal',
    youtubeUrl: '',
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setFile(null);
    setForm({
      titre: getTitle(initial) === 'Untitled' ? '' : getTitle(initial),
      contenu: stripYouTubeUrl(getContent(initial)),
      typeAnnonce: getCategory(initial) === 'General' ? 'Administrative' : getCategory(initial),
      priority:
        normalizePriority(initial) === 'urgente' || normalizePriority(initial) === 'urgent' ? 'urgent'
          : normalizePriority(initial) === 'haute' || normalizePriority(initial) === 'high' ? 'high'
          : normalizePriority(initial) === 'basse' || normalizePriority(initial) === 'low' ? 'low'
          : 'normal',
      youtubeUrl: initialYoutubeUrl,
    });
  }, [open, initial, initialYoutubeUrl]);

  if (!open) return null;

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.titre.trim() || !form.contenu.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSubmitting(true);
    try {
      const mergedContent = embedYouTubeInContent(form.contenu, form.youtubeUrl);

      if (isEdit) {
        await request(`/api/v1/annonces/${initial.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            titre: form.titre,
            contenu: mergedContent,
            typeAnnonce: form.typeAnnonce,
            priority: form.priority,
          }),
        });
      } else {
        const payload = new FormData();
        payload.append('titre', form.titre);
        payload.append('contenu', mergedContent);
        payload.append('typeAnnonce', form.typeAnnonce);
        payload.append('priority', form.priority);
        if (file) payload.append('file', file);

        await request('/api/v1/annonces', {
          method: 'POST',
          body: payload,
        });
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Title *</label>
              <input
                type="text"
                required
                value={form.titre}
                onChange={setField('titre')}
                placeholder="Announcement title"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={form.typeAnnonce}
                  onChange={setField('typeAnnonce')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={form.priority}
                  onChange={setField('priority')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Content *</label>
              <textarea
                required
                rows={6}
                value={form.contenu}
                onChange={setField('contenu')}
                placeholder="Share the details of your announcement..."
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                YouTube URL <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={setField('youtubeUrl')}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="mt-1 text-xs text-slate-500">
                If provided, a video player will be embedded in the card.
              </p>
            </div>

            {!isEdit && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Attachment <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.ogv,.mov,.mkv,.avi"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full cursor-pointer text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Allowed: JPG, PNG, GIF, PDF, Word, MP4, WebM, MOV · Max 200 MB
                </p>
                {file && (
                  <p className="mt-1 text-xs text-slate-500">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Detail modal — full content + full media ─────────────── */

function AnnouncementDetailModal({ item, onClose }) {
  const media = useMemo(() => resolvePrimaryMedia(item, { resolveMediaUrl }), [item]);
  const body = useMemo(() => stripYouTubeUrl(getContent(item)), [item]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item) return null;

  const meta = priorityMeta(item);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              {getCategory(item)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Title & date */}
          <div className="px-6 pt-5 pb-4">
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-900">
              {getTitle(item)}
            </h2>
            <p className="mt-1.5 text-xs text-slate-500">
              {formatDate(item?.datePublication || item?.createdAt)}
              {item?.auteur && (
                <> · {[item.auteur.prenom, item.auteur.nom].filter(Boolean).join(' ')}</>
              )}
            </p>
          </div>

          {/* Full-size media */}
          {media && (
            <div className="px-6 pb-4">
              <FullMedia media={media} />
            </div>
          )}

          {/* Full content text */}
          {body && (
            <div className="px-6 pb-8">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {body}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const isAdmin = useMemo(
    () => Array.isArray(user?.roles) && user.roles.includes('admin'),
    [user],
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await request('/api/v1/annonces');
      setItems(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load announcements', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    if (!category) return items;
    return items.filter((x) => getCategory(x) === category);
  }, [items, category]);

  const { featured, grid } = useMemo(() => {
    if (!filtered.length) return { featured: null, grid: [] };
    const featuredCandidate = filtered.find((item) => {
      const media = resolvePrimaryMedia(item, { resolveMediaUrl });
      return media && (media.kind === 'youtube' || media.kind === 'video');
    });
    if (!featuredCandidate) return { featured: null, grid: filtered };
    return {
      featured: {
        item: featuredCandidate,
        media: resolvePrimaryMedia(featuredCandidate, { resolveMediaUrl }),
      },
      grid: filtered.filter((x) => x.id !== featuredCandidate.id),
    };
  }, [filtered]);

  const categories = useMemo(() => {
    const set = new Set(items.map(getCategory).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [items]);

  const handleEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await request(`/api/v1/annonces/${id}`, { method: 'DELETE' });
      await fetchItems();
    } catch (err) {
      window.alert(err?.message || 'Delete failed.');
    }
  };

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Announcements
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Stay up to date with the latest news, events, and important updates.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md sm:self-auto"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              New Announcement
            </button>
          )}
        </header>

        {/* Category chips */}
        {!loading && items.length > 0 && categories.length > 1 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((c) => {
              const value = c === 'All' ? '' : c;
              const active = category === value;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={handleCreate} canCreate={isAdmin} />
        ) : (
          <>
            {featured && (
              <FeaturedHero
                item={featured.item}
                media={featured.media}
                onExpand={setDetail}
              />
            )}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {grid.map((item) => (
                <AnnouncementCard
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onExpand={setDetail}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <AnnouncementModal
        open={modalOpen}
        initial={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSaved={fetchItems}
      />

      <AnnouncementDetailModal
        item={detail}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}
