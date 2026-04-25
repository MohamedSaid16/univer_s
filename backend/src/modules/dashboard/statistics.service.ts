/**
 * Centralized statistics service — single source of truth for every metric
 * surfaced on the student / teacher / admin dashboards.
 *
 * Design rules:
 *   • Canonical metric definitions live here. A "pending reclamation" is
 *     defined ONCE (the PENDING_RECLAMATION_STATUSES constant below) and
 *     the same definition flows through every role.
 *   • Callers resolve their own role context (etudiantId / promoIds) and
 *     pass it in. This keeps this module free of role-specific auth logic
 *     while guaranteeing identical counting semantics across dashboards.
 *   • The service only returns numbers / summaries. It never leaks
 *     per-record data — recent lists, profiles, modules, etc. are shaped by
 *     the existing role services that call into this one.
 */

import prisma from "../../config/database";
import {
  GraviteInfraction,
  StatusCampagne,
  StatusDocumentRequest,
  StatusDossier,
  StatusReclamation,
  StatusJustification,
} from "@prisma/client";

// ── Canonical metric definitions ─────────────────────────────────────
const PENDING_RECLAMATION_STATUSES: StatusReclamation[] = [
  StatusReclamation.soumise,
  StatusReclamation.en_cours,
  StatusReclamation.en_attente,
];

const APPROVED_RECLAMATION_STATUSES: StatusReclamation[] = [StatusReclamation.traitee];
const REJECTED_RECLAMATION_STATUSES: StatusReclamation[] = [StatusReclamation.refusee];

const OPEN_DISCIPLINARY_STATUSES: StatusDossier[] = [
  StatusDossier.signale,
  StatusDossier.en_instruction,
  StatusDossier.jugement,
];

// ── Shared summary shape ─────────────────────────────────────────────
export interface DashboardSummary {
  announcements: number;
  reclamations: number;
  pendingReclamations: number;
  documents: number;
  justifications?: number;
  pendingJustifications?: number;
  treatedJustifications?: number;
  disciplineOpenCases?: number;
  disciplineClosedCases?: number;
}

// ── Student PFE info (exposed on the student dashboard) ──────────────
export interface StudentPfeInfo {
  hasPfe: boolean;
  groupId: number | null;
  subjectTitle: string | null;
  assignmentStatus: "draft" | "assigned" | "finalized" | null;
  finalizedAt: string | null;
  supervisorName: string | null;
  isLocked: boolean;
}

/**
 * Resolve the student's current PFE assignment: subject title, lock status,
 * and supervisor name. Reused by the student dashboard + admin analytics so
 * the same rules apply everywhere.
 *
 * Uses $queryRaw to access the new `assignment_status` / `finalized_at`
 * columns without depending on the Prisma client having been regenerated
 * after the schema change.
 */
export const getStudentPfeInfo = async (
  etudiantId: number
): Promise<StudentPfeInfo> => {
  const rows = await prisma.$queryRaw<
    Array<{
      groupId: number;
      subjectTitle: string | null;
      assignmentStatus: string | null;
      finalizedAt: Date | null;
      supervisorFirstName: string | null;
      supervisorLastName: string | null;
    }>
  >`
    SELECT gp.id                               AS "groupId",
           COALESCE(ps.titre_en, ps.titre_ar)  AS "subjectTitle",
           ps.assignment_status                AS "assignmentStatus",
           ps.finalized_at                     AS "finalizedAt",
           u.prenom                            AS "supervisorFirstName",
           u.nom                               AS "supervisorLastName"
      FROM group_members gm
      JOIN groups_pfe  gp ON gp.id = gm.group_id
      JOIN pfe_sujets  ps ON ps.id = gp.sujet_final_id
      JOIN enseignants e  ON e.id  = gp.co_encadrant_id
      JOIN users       u  ON u.id  = e.user_id
     WHERE gm.etudiant_id = ${etudiantId}
     LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return {
      hasPfe: false,
      groupId: null,
      subjectTitle: null,
      assignmentStatus: null,
      finalizedAt: null,
      supervisorName: null,
      isLocked: false,
    };
  }

  const normalizedStatus =
    row.assignmentStatus === "assigned"
      ? "assigned"
      : row.assignmentStatus === "finalized"
        ? "finalized"
        : "draft";

  const supervisorName =
    [row.supervisorFirstName, row.supervisorLastName]
      .filter((part) => part && String(part).trim().length > 0)
      .join(" ")
      .trim() || null;

  return {
    hasPfe: true,
    groupId: row.groupId,
    subjectTitle: row.subjectTitle || null,
    assignmentStatus: normalizedStatus,
    finalizedAt: row.finalizedAt ? row.finalizedAt.toISOString() : null,
    supervisorName,
    isLocked: normalizedStatus === "finalized",
  };
};

export interface TeacherDashboardSummary extends DashboardSummary {
  students: number;
  courses: number;
  pendingDocuments: number;
  processingDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
}

// ── Student-scoped summary ───────────────────────────────────────────
/**
 * Caller (student-panel.service) has already resolved the student's
 * announcement / document visibility counts via its paginated list helpers.
 * We only need the student's etudiantId to count reclamations directly —
 * which fixes a latent bug where pendingReclamations was computed from the
 * first page of items (at most 5) instead of the full dataset.
 */
export const buildStudentStatistics = async (input: {
  etudiantId: number;
  announcementsVisible: number;
  documentsVisible: number;
}): Promise<DashboardSummary> => {
  const [
    reclamations,
    pendingReclamations,
    justifications,
    pendingJustifications,
    disciplineOpenCases,
    disciplineClosedCases,
  ] = await Promise.all([
    prisma.reclamation.count({ where: { etudiantId: input.etudiantId } }),
    prisma.reclamation.count({
      where: {
        etudiantId: input.etudiantId,
        status: { in: PENDING_RECLAMATION_STATUSES },
      },
    }),
    prisma.justification.count({ where: { etudiantId: input.etudiantId } }),
    prisma.justification.count({
      where: {
        etudiantId: input.etudiantId,
        status: { in: [StatusJustification.soumis, StatusJustification.en_verification] },
      },
    }),
    prisma.dossierDisciplinaire.count({
      where: {
        etudiantId: input.etudiantId,
        status: { in: OPEN_DISCIPLINARY_STATUSES },
      },
    }),
    prisma.dossierDisciplinaire.count({
      where: {
        etudiantId: input.etudiantId,
        status: StatusDossier.traite,
      },
    }),
  ]);

  return {
    announcements: input.announcementsVisible,
    reclamations,
    pendingReclamations,
    documents: input.documentsVisible,
    justifications,
    pendingJustifications,
    treatedJustifications: justifications - pendingJustifications,
    disciplineOpenCases,
    disciplineClosedCases,
  };
};

// ── Teacher-scoped summary ───────────────────────────────────────────
/**
 * Scoped to the teacher's assigned promos (resolved by the caller via
 * resolveTeacherContext). Empty promoIds → everything zero, matching the
 * existing behaviour of getTeacherDashboard.
 */
export const buildTeacherStatistics = async (input: {
  userId: number;
  promoIds: number[];
  coursesCount: number;
}): Promise<TeacherDashboardSummary> => {
  const hasPromos = input.promoIds.length > 0;

  const reclamationScope = hasPromos
    ? { etudiant: { promoId: { in: input.promoIds } } }
    : { id: -1 };

  const docScope = { enseignant: { userId: input.userId } };

  const [
    announcements,
    reclamations,
    pendingReclamations,
    students,
    totalDocuments,
    pendingDocuments,
    processingDocuments,
    approvedDocuments,
    rejectedDocuments,
  ] = await Promise.all([
    prisma.annonce.count({ where: { auteurId: input.userId } }),
    prisma.reclamation.count({ where: reclamationScope }),
    prisma.reclamation.count({
      where: { ...reclamationScope, status: { in: PENDING_RECLAMATION_STATUSES } },
    }),
    hasPromos
      ? prisma.etudiant.count({ where: { promoId: { in: input.promoIds } } })
      : Promise.resolve(0),
    prisma.documentRequest.count({ where: docScope }),
    prisma.documentRequest.count({ where: { ...docScope, status: StatusDocumentRequest.en_attente } }),
    prisma.documentRequest.count({ where: { ...docScope, status: StatusDocumentRequest.en_traitement } }),
    prisma.documentRequest.count({ where: { ...docScope, status: StatusDocumentRequest.valide } }),
    prisma.documentRequest.count({ where: { ...docScope, status: StatusDocumentRequest.refuse } }),
  ]);

  return {
    announcements,
    reclamations,
    pendingReclamations,
    documents: totalDocuments,
    students,
    courses: input.coursesCount,
    pendingDocuments,
    processingDocuments,
    approvedDocuments,
    rejectedDocuments,
  };
};

// ── Admin global analytics ───────────────────────────────────────────
export interface AdminAnalytics {
  generatedAt: string;
  users: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    students: number;
    teachers: number;
  };
  academic: {
    promos: number;
    modules: number;
  };
  reclamations: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  justifications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  announcements: {
    total: number;
    active: number;
  };
  documents: {
    total: number;
    pending: number;
    processing: number;
    approved: number;
    rejected: number;
  };
  pfe: {
    totalSubjects: number;
    activeGroups: number;
    totalSupervisors: number;
    averageStudentsPerSupervisor: number;
    studentsInPfeGroup: number;
  };
  discipline: {
    openCases: number;
    closedCases: number;
    byGravity: Record<string, number>;
  };
  campaigns: {
    total: number;
    draft: number;
    open: number;
    closed: number;
    finalized: number;
  };
}

export const getAdminStatistics = async (): Promise<AdminAnalytics> => {
  const now = new Date();

  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    suspendedUsers,
    totalStudents,
    totalTeachers,
    totalPromos,
    totalModules,
    totalReclamations,
    pendingReclamations,
    approvedReclamations,
    rejectedReclamations,
    totalJustifications,
    pendingJustifications,
    approvedJustifications,
    rejectedJustifications,
    totalAnnouncements,
    activeAnnouncements,
    totalPfeSubjects,
    activePfeGroups,
    pfeGroupsWithStudents,
    openDisciplinary,
    closedDisciplinary,
    minorDisciplinary,
    mediumDisciplinary,
    graveDisciplinary,
    totalCampaigns,
    draftCampaigns,
    openCampaigns,
    closedCampaigns,
    finalizedCampaigns,
    totalDocumentRequests,
    pendingDocumentRequests,
    processingDocumentRequests,
    approvedDocumentRequests,
    rejectedDocumentRequests,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.user.count({ where: { status: "inactive" } }),
    prisma.user.count({ where: { status: "suspended" } }),
    prisma.etudiant.count(),
    prisma.enseignant.count(),
    prisma.promo.count(),
    prisma.module.count(),
    prisma.reclamation.count(),
    prisma.reclamation.count({ where: { status: { in: PENDING_RECLAMATION_STATUSES } } }),
    prisma.reclamation.count({ where: { status: { in: APPROVED_RECLAMATION_STATUSES } } }),
    prisma.reclamation.count({ where: { status: { in: REJECTED_RECLAMATION_STATUSES } } }),
    prisma.justification.count(),
    prisma.justification.count({ where: { status: { in: ['soumis', 'en_verification'] } } }),
    prisma.justification.count({ where: { status: 'valide' } }),
    prisma.justification.count({ where: { status: 'refuse' } }),
    prisma.annonce.count(),
    prisma.annonce.count({
      where: {
        OR: [{ dateExpiration: null }, { dateExpiration: { gte: now } }],
      },
    }),
    prisma.pfeSujet.count(),
    prisma.groupPfe.count({ where: { note: null } }),
    prisma.groupMember.count(),
    prisma.dossierDisciplinaire.count({
      where: { status: { in: OPEN_DISCIPLINARY_STATUSES } },
    }),
    prisma.dossierDisciplinaire.count({ where: { status: StatusDossier.traite } }),
    prisma.dossierDisciplinaire.count({
      where: { infraction: { gravite: GraviteInfraction.faible } },
    }),
    prisma.dossierDisciplinaire.count({
      where: { infraction: { gravite: GraviteInfraction.moyenne } },
    }),
    prisma.dossierDisciplinaire.count({
      where: {
        infraction: { gravite: { in: [GraviteInfraction.grave, GraviteInfraction.tres_grave] } },
      },
    }),
    prisma.campagneAffectation.count(),
    prisma.campagneAffectation.count({ where: { status: StatusCampagne.brouillon } }),
    prisma.campagneAffectation.count({ where: { status: StatusCampagne.ouverte } }),
    prisma.campagneAffectation.count({ where: { status: StatusCampagne.fermee } }),
    prisma.campagneAffectation.count({ where: { status: StatusCampagne.terminee } }),
    prisma.documentRequest.count(),
    prisma.documentRequest.count({ where: { status: StatusDocumentRequest.en_attente } }),
    prisma.documentRequest.count({ where: { status: StatusDocumentRequest.en_traitement } }),
    prisma.documentRequest.count({ where: { status: StatusDocumentRequest.valide } }),
    prisma.documentRequest.count({ where: { status: StatusDocumentRequest.refuse } }),
  ]);

  // Supervisor load — derive from GroupPfe.coEncadrantId, since there is
  // no standalone Encadrement model. Each GroupPfe contributes one supervision
  // for its coEncadrantId; total supervised students = groupMember count (above).
  const supervisorGroups = await prisma.groupPfe.groupBy({
    by: ["coEncadrantId"],
    _count: { id: true },
  });

  const totalSupervisors = supervisorGroups.length;
  const averageStudentsPerSupervisor =
    totalSupervisors > 0
      ? Math.round((pfeGroupsWithStudents / totalSupervisors) * 10) / 10
      : 0;

  return {
    generatedAt: now.toISOString(),
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      suspended: suspendedUsers,
      students: totalStudents,
      teachers: totalTeachers,
    },
    academic: {
      promos: totalPromos,
      modules: totalModules,
    },
    reclamations: {
      total: totalReclamations,
      pending: pendingReclamations,
      approved: approvedReclamations,
      rejected: rejectedReclamations,
    },
    justifications: {
      total: totalJustifications,
      pending: pendingJustifications,
      approved: approvedJustifications,
      rejected: rejectedJustifications,
    },
    announcements: {
      total: totalAnnouncements,
      active: activeAnnouncements,
    },
    documents: {
      total: totalDocumentRequests,
      pending: pendingDocumentRequests,
      processing: processingDocumentRequests,
      approved: approvedDocumentRequests,
      rejected: rejectedDocumentRequests,
    },
    pfe: {
      totalSubjects: totalPfeSubjects,
      activeGroups: activePfeGroups,
      totalSupervisors,
      averageStudentsPerSupervisor,
      studentsInPfeGroup: pfeGroupsWithStudents,
    },
    discipline: {
      openCases: openDisciplinary,
      closedCases: closedDisciplinary,
      byGravity: {
        faible: minorDisciplinary,
        moyenne: mediumDisciplinary,
        grave: graveDisciplinary,
      },
    },
    campaigns: {
      total: totalCampaigns,
      draft: draftCampaigns,
      open: openCampaigns,
      closed: closedCampaigns,
      finalized: finalizedCampaigns,
    },
  };
};
