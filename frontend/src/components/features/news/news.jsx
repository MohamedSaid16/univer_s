import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import request, { resolveMediaUrl } from '../../../services/api';

// Bounce animation style
const bounceStyle = `
  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    50% {
      opacity: 1;
      transform: scale(1.02);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  .bounce-in {
    animation: bounceIn 0.5s ease-out;
  }
`;

// Inject enhanced animation styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = bounceStyle + `
    @keyframes liftScale {
      0% {
        transform: translateY(0) scale(1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }
      100% {
        transform: translateY(-2px) scale(1.01);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }
    }
    .lift-on-hover:hover {
      animation: liftScale 0.2s ease-out forwards;
    }
    @keyframes slideDown {
      0% {
        opacity: 0;
        max-height: 0;
        transform: translateY(-10px);
      }
      100% {
        opacity: 1;
        max-height: 1000px;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

const categories = [
  { name: 'All', value: '' },
  { name: 'Administrative', value: 'Administrative' },
  { name: 'Academic', value: 'Academic' },
  { name: 'Events', value: 'Events' },
  { name: 'Research', value: 'Research' },
  { name: 'Student Life', value: 'Student Life' },
];

const ANNOUNCEMENT_PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'Important' },
  { value: 'urgent', label: 'Urgent' },
];

const resolveDisplayText = (ar, en, fallback = '') => {
  if (typeof en === 'string' && en.trim()) return en.trim();
  if (typeof ar === 'string' && ar.trim()) return ar.trim();
  return fallback;
};

const normalizePriority = (item) => String(item?.priority ?? item?.priorite ?? '').toLowerCase();
const isImportantAnnouncement = (item) => ['urgent', 'urgente', 'high', 'haute'].includes(normalizePriority(item));

const getCategoryName = (item) => resolveDisplayText(item?.type?.nom_ar, item?.type?.nom_en, 'General');
const getTitle = (item) => resolveDisplayText(item?.titre_ar, item?.titre_en, 'Untitled announcement');
const getContent = (item) => resolveDisplayText(item?.contenu_ar, item?.contenu_en, '');

const priorityLabel = (item) => {
  const priority = normalizePriority(item);
  if (priority === 'urgent' || priority === 'urgente') return 'Urgent';
  if (priority === 'high' || priority === 'haute') return 'Important';
  if (priority === 'low' || priority === 'basse') return 'Low';
  return 'Standard';
};

const priorityBadgeClass = (item) => {
  const priority = normalizePriority(item);
  if (priority === 'urgent' || priority === 'urgente') return 'border-edge-strong bg-danger/10 text-danger';
  if (priority === 'high' || priority === 'haute') return 'border-edge-strong bg-brand-light text-brand';
  return 'border-edge bg-surface text-ink-secondary';
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const inputClassName = 'w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink outline-none transition-all duration-150 placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * SVG ICONS - Institutional minimal design per skill.md spec
 */
function IconChevron({ direction = 'left' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`h-4 w-4 ${direction === 'right' ? 'rotate-180' : ''}`} aria-hidden="true">
      <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="10" cy="5" r="1.5" fill="currentColor" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="10" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M5 2v16h10V7.5L12.5 2H5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12.5 2v5.5H15.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="7" y1="13" x2="13" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * URGENT ANNOUNCEMENTS CAROUSEL - MODERN STAGE VARIATION
 * Features:
 * - Centered active card (max-width: 800px)
 * - Peeking side cards at 10% visibility with scale and opacity
 * - Fixed navigation arrows with z-index: 50
 * - Modern pill-shaped indicators
 * - Glassmorphism effect with enhanced styling
 */
function UrgentAnnouncementsCarousel({ items }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  };

  const current = items[currentIndex];

  return (
    <div 
      style={{
        marginBottom: '24px',
      }}
    >
      {/* Unified Slider Container - Single relative context for arrows and card */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          margin: '0 auto',
          minHeight: '320px', // Ensure container doesn't collapse
          background: 'var(--color-canvas)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden', // Hide incoming/outgoing slides
        }}
      >
        {/* Left Arrow - Positioned absolutely within unified container */}
        <button
          onClick={goToPrev}
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 40,
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            transition: 'all 150ms ease-out',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            padding: 0,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-brand)';
            e.currentTarget.style.background = 'var(--color-brand)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
          }}
          aria-label="Previous announcement"
        >
          <IconChevron direction="left" />
        </button>

        {/* Slider Track - Contains the active card with full width */}
        <div 
          style={{
            position: 'relative',
            width: '100%',
            paddingLeft: '72px',
            paddingRight: '72px',
            paddingTop: '32px',
            paddingBottom: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden', // Hide side overflow
          }}
        >
          {/* Active Card - Full width within track, fills available space */}
          <div 
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '12px',
              border: '1px solid var(--color-edge-subtle)',
              background: 'var(--color-surface)',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              transform: 'scale(1)',
              opacity: 1,
              zIndex: 20,
              transition: 'all 300ms ease-out',
              minHeight: '280px', // Ensure card doesn't collapse
            }}
          >
            {/* Left accent bar (4px) */}
            <div 
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: 'var(--status-error, #dc2626)',
                borderRadius: '12px 0 0 12px',
              }}
            />

            {/* Glassmorphism inner overlay */}
            <div 
              style={{
                position: 'absolute',
                inset: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                pointerEvents: 'none',
              }}
            />

            {/* Card Content */}
            <div 
              style={{
                position: 'relative',
                zIndex: 2,
                padding: '32px',
                paddingLeft: '40px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '6px',
                    border: '1px solid var(--status-error, #dc2626)',
                    background: 'rgba(220, 38, 38, 0.1)',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    paddingTop: '4px',
                    paddingBottom: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'var(--status-error, #dc2626)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  Urgent
                </span>
              </div>

              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-ink)',
                marginBottom: '12px',
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {getTitle(current)}
              </h2>

              <p style={{ 
                fontSize: '13px', 
                color: 'var(--color-ink-secondary)',
                marginBottom: '16px',
              }}>
                {getCategoryName(current)} • {formatDate(current?.datePublication || current?.createdAt)}
              </p>

              <p style={{ 
                fontSize: '15px', 
                color: 'var(--color-ink-secondary)',
                marginBottom: '20px',
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {getContent(current)}
              </p>

              <a 
                href={`/news#${current.id}`} 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--color-brand)',
                  textDecoration: 'none',
                  transition: 'all 200ms ease-out',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-brand-hover)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-brand)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                Read more 
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Right Arrow - Positioned absolutely within unified container */}
        <button
          onClick={goToNext}
          style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 40,
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            transition: 'all 150ms ease-out',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            padding: 0,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-brand)';
            e.currentTarget.style.background = 'var(--color-brand)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
          }}
          aria-label="Next announcement"
        >
          <IconChevron direction="right" />
        </button>
      </div>

      {/* Modern Pill-Style Indicators - Centered with breathing room */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', paddingTop: '24px' }}>
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            style={{
              height: '8px',
              width: idx === currentIndex ? '32px' : '8px',
              borderRadius: '4px',
              background: idx === currentIndex ? 'var(--color-brand)' : 'var(--color-edge)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 200ms ease-out',
              boxShadow: idx === currentIndex ? '0 2px 8px rgba(var(--color-brand-rgb, 0, 0, 0), 0.3)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (idx !== currentIndex) {
                e.currentTarget.style.background = 'var(--color-edge-strong)';
                e.currentTarget.style.transform = 'scale(1.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (idx !== currentIndex) {
                e.currentTarget.style.background = 'var(--color-edge)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
            aria-label={`Go to announcement ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * HORIZONTAL FEED CARD - HIGH-DENSITY NEWS ITEM
 * Column 1: Category Tag (Small, Uppercase, Semantic color)
 * Column 2: Content (Bold Title + 2-line truncated snippet)
 * Column 3: Metadata (Date + Author)
 * Hover state with 'Expand' button and arrow icon
 */
function AnnouncementRow({ item, isAdmin, onEdit, onDelete, openMenuId, setOpenMenuId, isExpanded, onToggleExpand }) {
  const urgent = isImportantAnnouncement(item);
  const attachment = item?.documents?.[0];
  const attachmentUrl = attachment?.fichier ? resolveMediaUrl(attachment.fichier) : '';
  const dateValue = item?.datePublication || item?.createdAt;
  const displayDate = formatDate(dateValue);
  const authorName = `${item?.auteur?.prenom || ''} ${item?.auteur?.nom || ''}`.trim() || 'Unknown';

  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-edge-subtle)',
        background: 'var(--color-surface)',
        transition: 'all 150ms ease-out',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-surface-200)';
        e.currentTarget.style.borderColor = 'var(--color-edge-strong)';
        e.currentTarget.style.animation = 'liftScale 200ms ease-out forwards';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--color-surface)';
        e.currentTarget.style.borderColor = 'var(--color-edge-subtle)';
        e.currentTarget.style.animation = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {/* Left accent bar (2px) for urgency indicator */}
        <div
          style={{
            width: '2px',
            flexShrink: 0,
            background: urgent ? 'var(--status-error, #dc2626)' : 'var(--status-info, #1d4ed8)',
            transition: 'all 150ms ease-out',
          }}
        />

        {/* Main content area - Flex layout with proper space distribution */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '20px 24px',
            transition: 'all 150ms ease-out',
            minWidth: 0, // Critical: allows flex items to shrink below their content size
            justifyContent: 'space-between',
          }}
        >
          {/* Column 1 (Category Badge + Status) - Fixed width to accommodate long categories */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              minWidth: '140px', // Ensures even "Administrative" fits without clipping
              flexShrink: 0, // Prevent this from shrinking
              justifyContent: 'flex-start', // Align badge to the left
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '4px',
                border: '1px solid var(--color-edge)',
                background: 'var(--color-canvas)',
                paddingLeft: '8px',
                paddingRight: '8px',
                paddingTop: '4px',
                paddingBottom: '4px',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-brand)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '120px', // Increased from 80px to 120px to fit "Administrative"
              }}
            >
              {getCategoryName(item)}
            </span>
            {urgent && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--status-error, #dc2626)',
                  animation: 'pulse 2s infinite',
                  flexShrink: 0,
                }}
                title="Urgent"
              />
            )}
          </div>

          {/* Column 2 (Content - Title + Snippet) - Flexible, grows to fill space */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px', 
              minWidth: 0, // CRITICAL: allows flex to shrink below intrinsic text width
              flex: '1 1 auto', // Grows to fill available space, shrinks when needed
              maxWidth: 'calc(100% - 240px)', // Ensures right column (240px) always has reserved space
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--color-ink)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.3,
                display: '-webkit-box', // For better text truncation
              }}
            >
              {getTitle(item)}
            </h3>
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--color-ink-secondary)',
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {getContent(item)}
            </p>

            {/* Attachment link */}
            {attachmentUrl && (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-brand)',
                  textDecoration: 'none',
                  marginTop: '4px',
                  transition: 'all 150ms ease-out',
                  width: 'fit-content',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-brand-hover)';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-brand)';
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                <IconFile />
                {attachment?.nomDocument || 'View Attachment'}
              </a>
            )}
          </div>

          {/* Column 3 (Metadata + Actions) - Fixed width, anchored to right */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0, // Prevent this from shrinking
              minWidth: '240px', // Fixed width reserved for right-side elements
              fontSize: '12px',
              color: 'var(--color-ink-secondary)',
              justifyContent: 'flex-end',
            }}
          >
            {/* Date & Author (right-aligned on desktop) */}
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-end', 
                gap: '2px', 
                minWidth: 'fit-content',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>{displayDate}</span>
              <span style={{ fontSize: '11px', color: 'var(--color-ink-tertiary)', whiteSpace: 'nowrap' }}>By {authorName}</span>
            </div>

            {/* Expand Button */}
            <button
              type="button"
              onClick={onToggleExpand}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid var(--color-edge)',
                background: 'var(--color-canvas)',
                color: 'var(--color-ink-secondary)',
                cursor: 'pointer',
                transition: 'all 150ms ease-out',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-brand-light)';
                e.currentTarget.style.borderColor = 'var(--color-brand)';
                e.currentTarget.style.color = 'var(--color-brand)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-canvas)';
                e.currentTarget.style.borderColor = 'var(--color-edge)';
                e.currentTarget.style.color = 'var(--color-ink-secondary)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Expand announcement"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={isExpanded ? "M6 9l6 6 6-6" : "M9 18l6-6 6 6"}/>
              </svg>
            </button>

            {/* Admin kebab menu */}
            {isAdmin ? (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-edge)',
                    background: 'var(--color-canvas)',
                    color: 'var(--color-ink-secondary)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease-out',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-edge-strong)';
                    e.currentTarget.style.background = 'var(--color-surface-200)';
                    e.currentTarget.style.color = 'var(--color-ink)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-edge)';
                    e.currentTarget.style.background = 'var(--color-canvas)';
                    e.currentTarget.style.color = 'var(--color-ink-secondary)';
                  }}
                  aria-label="Actions"
                >
                  <IconMenu />
                </button>

                {/* Dropdown menu */}
                {openMenuId === item.id && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: '4px',
                      width: '128px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-edge)',
                      background: 'var(--color-surface)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      zIndex: 20,
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(item);
                        setOpenMenuId(null);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        display: 'block',
                        paddingLeft: '12px',
                        paddingRight: '12px',
                        paddingTop: '8px',
                        paddingBottom: '8px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--color-ink-secondary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 150ms ease-out',
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-surface-200)';
                        e.currentTarget.style.color = 'var(--color-ink)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--color-ink-secondary)';
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(item.id);
                        setOpenMenuId(null);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        display: 'block',
                        paddingLeft: '12px',
                        paddingRight: '12px',
                        paddingTop: '8px',
                        paddingBottom: '8px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--status-error, #dc2626)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 150ms ease-out',
                        borderBottomLeftRadius: '8px',
                        borderBottomRightRadius: '8px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function News() {
  const { user } = useAuth();
  const isAdmin = useMemo(() => Array.isArray(user?.roles) && user.roles.includes('admin'), [user]);

  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAnnonce, setEditingAnnonce] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState(null);
  const filterRef = useRef(null);

  const [formData, setFormData] = useState({
    titre: '',
    contenu: '',
    typeAnnonce: 'Administrative',
    priority: 'normal',
  });

  const fetchAnnonces = async () => {
    try {
      setLoading(true);
      // Always fetch ALL announcements regardless of category
      const response = await request('/api/v1/annonces');
      setAnnonces(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setAnnonces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnonces();
  }, []);

  // Filter announcements based on active category
  const filteredAnnonces = useMemo(() => {
    if (!activeCategory) return annonces;
    return annonces.filter(item => getCategoryName(item) === activeCategory);
  }, [annonces, activeCategory]);

  const resetForm = () => {
    setEditingAnnonce(null);
    setSelectedFile(null);
    setFormData({
      titre: '',
      contenu: '',
      typeAnnonce: 'Administrative',
      priority: 'normal',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.titre.trim() || !formData.contenu.trim()) {
      window.alert('Title and content are required.');
      return;
    }

    try {
      if (editingAnnonce) {
        await request(`/api/v1/annonces/${editingAnnonce.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        const payload = new FormData();
        payload.append('titre', formData.titre);
        payload.append('contenu', formData.contenu);
        payload.append('typeAnnonce', formData.typeAnnonce);
        payload.append('priority', formData.priority);
        if (selectedFile) {
          payload.append('file', selectedFile);
        }

        await request('/api/v1/annonces', {
          method: 'POST',
          body: payload,
        });
      }

      setShowModal(false);
      resetForm();
      await fetchAnnonces();
    } catch (error) {
      console.error(error);
      window.alert(error?.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) {
      return;
    }

    try {
      await request(`/api/v1/annonces/${Number(id)}`, { method: 'DELETE' });
      setOpenMenuId(null);
      await fetchAnnonces();
    } catch (error) {
      console.error(error);
      window.alert(error?.message || 'Delete failed.');
    }
  };

  const handleEdit = (item) => {
    setEditingAnnonce(item);
    setSelectedFile(null);
    setFormData({
      titre: getTitle(item),
      contenu: getContent(item),
      typeAnnonce: getCategoryName(item),
      priority: normalizePriority(item) || 'normal',
    });
    setShowModal(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)' }}>
      {/* ===== PAGE HEADER WITH FIXED CTA TOOLBAR ===== */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingTop: '32px',
          paddingBottom: '8px',
          maxWidth: '1400px',
          margin: '0 auto',
          gap: '24px',
        }}
      >
        <div>
          <h1 style={{ 
            fontSize: '40px', 
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--color-ink)',
            margin: 0,
            marginBottom: '8px',
            lineHeight: 1.1,
          }}>
            News & Announcements
          </h1>
          <p style={{ 
            fontSize: '15px', 
            color: 'var(--color-ink-secondary)',
            margin: 0,
          }}>
            Stay informed with the latest updates from the university community
          </p>
        </div>

        {/* Fixed CTA Button - Top Right */}
        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            style={{
              position: 'sticky',
              top: '24px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '8px',
              background: 'var(--color-brand)',
              paddingLeft: '16px',
              paddingRight: '16px',
              paddingTop: '10px',
              paddingBottom: '10px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'white',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 150ms ease-out',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              whiteSpace: 'nowrap',
              height: 'fit-content',
              zIndex: 30,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-brand-hover)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-brand)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>+</span>
            New Announcement
          </button>
        ) : null}
      </div>

      {/* ===== URGENT ANNOUNCEMENTS HERO SECTION ===== */}
      <div 
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '32px 24px',
        }}
      >
        {annonces.filter(isImportantAnnouncement).length > 0 ? (
          <UrgentAnnouncementsCarousel items={annonces.filter(isImportantAnnouncement)} />
        ) : (
          <div
            style={{
              borderRadius: '12px',
              border: '2px dashed var(--color-edge)',
              background: 'var(--color-surface)',
              padding: '64px 24px',
              textAlign: 'center',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-tertiary)" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>No Urgent Announcements</p>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-secondary)' }}>Check back soon for important updates</p>
          </div>
        )}
      </div>

      {/* ===== CATEGORY FILTER BAR - STICKY ===== */}
      <div
        ref={filterRef}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--color-canvas)',
          borderBottom: '1px solid var(--color-edge-subtle)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          paddingLeft: '24px',
          paddingRight: '24px',
          paddingTop: '16px',
          paddingBottom: '16px',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map((category) => {
              // Count from ALL announcements, not filtered ones
              const count = category.value 
                ? annonces.filter(item => getCategoryName(item) === category.value).length 
                : annonces.length;
              const isActive = activeCategory === category.value;

              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => setActiveCategory(category.value)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '6px',
                    border: `1px solid ${isActive ? 'var(--color-brand)' : 'var(--color-edge)'}`,
                    background: isActive ? 'var(--color-brand-light)' : 'var(--color-surface)',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: isActive ? 'var(--color-brand)' : 'var(--color-ink-secondary)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease-out',
                    outline: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'var(--color-edge-strong)';
                      e.currentTarget.style.background = 'var(--color-surface-100)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'var(--color-edge)';
                      e.currentTarget.style.background = 'var(--color-surface)';
                    }
                  }}
                >
                  {category.name}
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: isActive ? 'var(--color-brand)' : 'var(--color-edge)',
                      color: isActive ? 'white' : 'var(--color-ink-secondary)',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== FULL-WIDTH OPTIMIZED NEWS FEED (1400px) ===== */}
      <div 
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '32px 24px',
        }}
      >
        <div 
          style={{
            borderRadius: '12px',
            border: '1px solid var(--color-edge-subtle)',
            overflow: 'hidden',
            background: 'var(--color-surface)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          {loading ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink-secondary)', margin: 0 }}>
                Loading announcements...
              </p>
            </div>
          ) : filteredAnnonces.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <div style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-tertiary)" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, marginBottom: '4px' }}>
                    No announcements found
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--color-ink-secondary)', margin: 0 }}>
                    Check back later or try a different category
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {filteredAnnonces.map((item, idx) => (
                <div key={item.id}>
                  {/* Announcement Row */}
                  <AnnouncementRow
                    item={item}
                    isAdmin={isAdmin}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    isExpanded={expandedAnnouncementId === item.id}
                    onToggleExpand={() => setExpandedAnnouncementId(expandedAnnouncementId === item.id ? null : item.id)}
                  />

                  {/* Expanded Content Modal - Inline */}
                  {expandedAnnouncementId === item.id && (
                    <div
                      style={{
                        borderBottom: '1px solid var(--color-edge-subtle)',
                        background: 'var(--color-surface-200)',
                        padding: '32px 24px',
                        animation: 'slideDown 200ms ease-out',
                      }}
                    >
                      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
                        {/* Expanded Header */}
                        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                          <div>
                            <h2
                              style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                color: 'var(--color-ink)',
                                margin: 0,
                                marginBottom: '8px',
                                lineHeight: 1.3,
                              }}
                            >
                              {getTitle(item)}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  borderRadius: '4px',
                                  border: '1px solid var(--color-edge)',
                                  background: 'var(--color-canvas)',
                                  paddingLeft: '8px',
                                  paddingRight: '8px',
                                  paddingTop: '4px',
                                  paddingBottom: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  letterSpacing: '0.08em',
                                  textTransform: 'uppercase',
                                  color: 'var(--color-brand)',
                                }}
                              >
                                {getCategoryName(item)}
                              </span>
                              <span style={{ fontSize: '13px', color: 'var(--color-ink-secondary)' }}>
                                {formatDate(item?.datePublication || item?.createdAt)}
                              </span>
                              <span style={{ fontSize: '13px', color: 'var(--color-ink-secondary)' }}>
                                By {`${item?.auteur?.prenom || ''} ${item?.auteur?.nom || ''}`.trim() || 'Unknown'}
                              </span>
                              {isImportantAnnouncement(item) && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--status-error, #dc2626)' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                                  </svg>
                                  Urgent
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Close Button */}
                          <button
                            onClick={() => setExpandedAnnouncementId(null)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              border: '1px solid var(--color-edge)',
                              background: 'var(--color-canvas)',
                              color: 'var(--color-ink-secondary)',
                              cursor: 'pointer',
                              transition: 'all 150ms ease-out',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--color-surface)';
                              e.currentTarget.style.borderColor = 'var(--color-edge-strong)';
                              e.currentTarget.style.color = 'var(--color-ink)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--color-canvas)';
                              e.currentTarget.style.borderColor = 'var(--color-edge)';
                              e.currentTarget.style.color = 'var(--color-ink-secondary)';
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>

                        {/* Expanded Content */}
                        <div style={{ marginBottom: '24px', lineHeight: 1.8 }}>
                          <p
                            style={{
                              fontSize: '15px',
                              color: 'var(--color-ink)',
                              margin: 0,
                              whiteSpace: 'pre-wrap',
                              wordWrap: 'break-word',
                            }}
                          >
                            {getContent(item)}
                          </p>
                        </div>

                        {/* Attachments if available */}
                        {item?.documents && item.documents.length > 0 && (
                          <div style={{ marginBottom: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-edge-subtle)' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>
                              Attachments
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {item.documents.map((doc, docIdx) => {
                                const docUrl = doc?.fichier ? resolveMediaUrl(doc.fichier) : '';
                                return (
                                  <a
                                    key={docIdx}
                                    href={docUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '12px 16px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--color-edge)',
                                      background: 'var(--color-canvas)',
                                      color: 'var(--color-brand)',
                                      textDecoration: 'none',
                                      transition: 'all 150ms ease-out',
                                      width: 'fit-content',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'var(--color-brand-light)';
                                      e.currentTarget.style.borderColor = 'var(--color-brand)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'var(--color-canvas)';
                                      e.currentTarget.style.borderColor = 'var(--color-edge)';
                                    }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                      <polyline points="13 2 13 9 20 9"/>
                                    </svg>
                                    {doc?.nomDocument || 'Download'}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== CREATION/EDIT MODAL ===== */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-edge bg-surface shadow-card bounce-in">
            {/* Modal header */}
            <div className="border-b border-edge-subtle px-6 py-5 md:px-8 md:py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Administration</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
                {editingAnnonce ? 'Edit Announcement' : 'New Announcement'}
              </h2>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 md:px-8 md:py-8">
              {/* Title field */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Title</label>
                <input
                  type="text"
                  placeholder="Title"
                  className={inputClassName}
                  value={formData.titre}
                  onChange={(event) => setFormData((prev) => ({ ...prev, titre: event.target.value }))}
                />
              </div>

              {/* Content field */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Content</label>
                <textarea
                  placeholder="Content"
                  className={`${inputClassName} min-h-[180px] resize-y`}
                  value={formData.contenu}
                  onChange={(event) => setFormData((prev) => ({ ...prev, contenu: event.target.value }))}
                />
              </div>

              {/* File upload (new items only) */}
              {!editingAnnonce ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Attach File (optional)</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    className="block w-full rounded-md border border-control-border bg-control-bg px-3 py-2 text-sm text-ink-secondary file:mr-3 file:rounded-md file:border file:border-edge file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink-secondary hover:file:bg-surface-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              ) : null}

              {/* Category field */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-secondary">Category</label>
                <select
                  className={inputClassName}
                  value={formData.typeAnnonce}
                  onChange={(event) => setFormData((prev) => ({ ...prev, typeAnnonce: event.target.value }))}
                >
                  {categories.slice(1).map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority field */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-secondary">
                  Priority <span className="text-danger">*</span>
                </label>
                <select
                  className={inputClassName}
                  value={formData.priority}
                  onChange={(event) => setFormData((prev) => ({ ...prev, priority: event.target.value }))}
                >
                  {ANNOUNCEMENT_PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ink-tertiary">Important and urgent items are featured prominently.</p>
              </div>

              {/* Form actions */}
              <div className="flex flex-col gap-3 border-t border-edge-subtle pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="inline-flex items-center justify-center rounded-md border border-edge bg-surface px-4 py-2.5 text-sm font-medium text-ink-secondary transition-all duration-150 hover:bg-surface-200 hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 focus:ring-offset-canvas"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-hover active:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 focus:ring-offset-canvas"
                >
                  {editingAnnonce ? 'Update' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
