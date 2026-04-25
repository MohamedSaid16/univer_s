import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import pfeAPI from '../../services/pfe';

function localTitle(item) {
  if (!item) return 'Untitled';
  return item.name_ar || item.name_en || `Group #${item.id}`;
}

// Semantic status badge color mapper
function getStatusColor(status) {
  const statusMap = {
    'active': { bg: 'rgba(22, 163, 74, 0.1)', border: 'rgba(22, 163, 74, 0.3)', text: 'var(--status-success, #16a34a)' },
    'forming': { bg: 'rgba(202, 138, 4, 0.1)', border: 'rgba(202, 138, 4, 0.3)', text: 'var(--status-warning, #ca8a04)' },
    'archived': { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)', text: 'var(--color-ink-secondary)' },
  };
  return statusMap[status?.toLowerCase()] || statusMap['forming'];
}

function GroupStatCard({ label, value, status }) {
  const colors = getStatusColor(status);
  return (
    <div
      style={{
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <p
        style={{
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-tertiary)',
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: colors.text,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

// High-density group list item
function GroupListItem({ group }) {
  const statusColor = getStatusColor(group.status);
  const studentCount = group.students?.length || 0;
  const [showStudents, setShowStudents] = useState(false);

  return (
    <article
      style={{
        borderRadius: '10px',
        border: '1px solid var(--color-edge-subtle)',
        background: 'var(--color-surface)',
        minHeight: '72px',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 150ms ease-out',
        cursor: 'pointer',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-edge-strong)';
        e.currentTarget.style.background = 'var(--color-surface-200)';
        e.currentTarget.style.boxShadow = 'inset 0 0 0 1px var(--color-edge-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-edge-subtle)';
        e.currentTarget.style.background = 'var(--color-surface)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Group ID Column */}
      <div
        style={{
          padding: '0 16px',
          minWidth: '90px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          borderRight: '1px solid var(--color-edge-subtle)',
        }}
      >
        <p
          style={{
            fontSize: '9px',
            fontWeight: 600,
            color: 'var(--color-ink-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: 0,
            fontVariant: 'small-caps',
          }}
        >
          Group
        </p>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-ink)',
            margin: 0,
          }}
        >
          {group.code || `G-${group.id}`}
        </p>
      </div>

      {/* Group Name Column - Flexible */}
      <div
        style={{
          flex: 1,
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: 0,
          borderRight: '1px solid var(--color-edge-subtle)',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-ink)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}
        >
          {localTitle(group)}
        </p>
        <p
          style={{
            fontSize: '11px',
            color: 'var(--color-ink-secondary)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {group.description || 'No description'}
        </p>
      </div>

      {/* Members Pill - Interactive */}
      <div
        style={{
          padding: '0 16px',
          minWidth: '100px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRight: '1px solid var(--color-edge-subtle)',
        }}
        onClick={() => setShowStudents(!showStudents)}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        <div
          style={{
            borderRadius: '6px',
            background: 'rgba(29, 78, 216, 0.1)',
            border: '1px solid rgba(29, 78, 216, 0.2)',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '32px',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--color-brand)',
              margin: 0,
            }}
          >
            {studentCount}
          </p>
        </div>
        <span
          style={{
            fontSize: '9px',
            fontWeight: 600,
            color: 'var(--color-ink-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontVariant: 'small-caps',
          }}
        >
          Members
        </span>
      </div>

      {/* Status Badge - Non-clickable */}
      <div
        style={{
          padding: '0 16px',
          minWidth: '130px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          justifyContent: 'flex-end',
        }}
      >
        {/* Live Indicator Dot */}
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: statusColor.text,
            animation: 'pulse 2s infinite',
          }}
        />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: statusColor.text,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          {group.status || 'Forming'}
        </span>
      </div>

      {/* Expanded Members Tooltip - On Click */}
      {showStudents && group.students?.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            borderRadius: '10px',
            border: '1px solid var(--color-edge)',
            background: 'var(--color-surface)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--color-ink-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: 0,
              fontVariant: 'small-caps',
            }}
          >
            Group Members ({group.students.length})
          </p>
          {group.students.slice(0, 5).map((student, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '12px',
                color: 'var(--color-ink)',
                padding: '4px 0',
                borderBottom: idx < Math.min(4, group.students.length - 1) ? '1px solid var(--color-edge-subtle)' : 'none',
              }}
            >
              • {student.firstName} {student.lastName}
            </div>
          ))}
          {group.students.length > 5 && (
            <p
              style={{
                fontSize: '11px',
                color: 'var(--color-ink-secondary)',
                fontStyle: 'italic',
                margin: '4px 0 0 0',
              }}
            >
              +{group.students.length - 5} more members
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export default function GroupsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all subjects which contain groups
        const response = await pfeAPI.listSubjects();
        
        if (!active) return;
        
        setSubjects(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Failed to load groups');
        console.error('Error loading groups:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    
    loadData();
    
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    // Extract all groups from all subjects
    const allGroups = subjects.flatMap(subj => subj.groupsPfe || []);
    return {
      total: allGroups.length,
      subjects: subjects.length,
      totalMembers: allGroups.reduce((sum, g) => sum + (g.groupMembers?.length || 0), 0),
    };
  }, [subjects]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-ink-secondary)' }}>
        Loading groups...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', background: 'transparent', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Hero Section with Stats */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--color-edge-subtle)', background: 'var(--color-canvas)' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-ink)', margin: 0, marginBottom: '8px' }}>
              Groups Management
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-secondary)', margin: 0 }}>
              Monitor and manage PFE working groups
            </p>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <GroupStatCard label="Total Groups" value={stats.total} status="active" />
            <GroupStatCard label="Subjects" value={stats.subjects} status="forming" />
            <GroupStatCard label="Total Members" value={stats.totalMembers} status="active" />
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', flex: 1, overflow: 'hidden', padding: '24px 28px' }}>
          {/* Groups List by Subject */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
            {error && (
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#dc2626' }}>
                {error}
              </div>
            )}
            {subjects.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--color-ink-secondary)' }}>
                <p style={{ fontSize: '14px', margin: 0 }}>No subjects with groups found</p>
                <p style={{ fontSize: '12px', margin: '8px 0 0 0', color: 'var(--color-ink-tertiary)' }}>Subjects and their groups will appear here</p>
              </div>
            ) : (
              subjects.map(subject => {
                const groups = subject.groupsPfe || [];
                return (
                  <section key={subject.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Subject Header */}
                    <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--color-edge-subtle)' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, marginBottom: '4px' }}>
                        {localTitle(subject)}
                      </h3>
                      <p style={{ fontSize: '11px', color: 'var(--color-ink-secondary)', margin: 0 }}>
                        {groups.length} group{groups.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {/* Groups for this subject */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px' }}>
                      {groups.length > 0 ? (
                        groups.map(group => (
                          <GroupListItem key={`${subject.id}-${group.id}`} group={group} />
                        ))
                      ) : (
                        <div style={{ padding: '12px 16px', textAlign: 'center', borderRadius: '8px', border: '1px dashed var(--color-edge-subtle)', background: 'var(--color-canvas)', fontSize: '12px', color: 'var(--color-ink-secondary)' }}>
                          No groups assigned
                        </div>
                      )}
                    </div>
                  </section>
                );
              })
            )}
          </div>

          {/* Sidebar Widgets */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'auto' }}>
            {/* Distribution Widget */}
            <div
              style={{
                borderRadius: '16px',
                border: '1px solid var(--color-edge-subtle)',
                background: 'var(--color-surface)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-ink-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0,
                  }}
                >
                  Overview
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span style={{ fontSize: '12px', color: 'var(--color-ink-secondary)' }}>Total Groups</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)' }}>{stats.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <span style={{ fontSize: '12px', color: 'var(--color-ink-secondary)' }}>Subjects</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)' }}>{stats.subjects}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span style={{ fontSize: '12px', color: 'var(--color-ink-secondary)' }}>Total Members</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)' }}>{stats.totalMembers}</span>
                </div>
              </div>
            </div>

            {/* Quick Links Widget */}
            <div
              style={{
                borderRadius: '16px',
                border: '1px solid var(--color-edge-subtle)',
                background: 'var(--color-surface)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M9 11l3 3L22 4"></path>
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-ink-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0,
                  }}
                >
                  Navigation
                </p>
              </div>
              {[
                { label: 'All Subjects', path: '/dashboard/projects/subjects', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
                { label: 'Projects Overview', path: '/dashboard/projects', icon: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16M3 12h18M12 3v18' },
                { label: 'Defense Scheduling', path: '/dashboard/projects/defense', icon: 'M9 11H7a4 4 0 0 0-4 4v7a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4v-7a4 4 0 0 0-4-4h-2m0-4V7a4 4 0 0 1 4 4v7' },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid var(--color-edge)',
                    background: 'var(--color-canvas)',
                    padding: '10px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--color-ink)',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 150ms ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-edge-strong)';
                    e.currentTarget.style.background = 'var(--color-surface-200)';
                    e.currentTarget.style.color = 'var(--color-brand)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-edge)';
                    e.currentTarget.style.background = 'var(--color-canvas)';
                    e.currentTarget.style.color = 'var(--color-ink)';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d={link.icon}></path>
                  </svg>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// CSS Keyframes for animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-groups-page-styles]')) {
  styleSheet.setAttribute('data-groups-page-styles', 'true');
  document.head.appendChild(styleSheet);
}
